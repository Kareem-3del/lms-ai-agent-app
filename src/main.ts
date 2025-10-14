import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell, dialog } from 'electron';
import * as path from 'path';
import { AssignmentChecker } from './services/assignmentChecker';
import { SettingsManager } from './services/settingsManager';
import { AuthService } from './services/authService';
import { GeminiService } from './services/geminiService';
import { FileDownloader } from './services/fileDownloader';
import { HandwritingService } from './services/handwritingService';
import { PathManager } from './services/pathManager';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let assignmentChecker: AssignmentChecker | null = null;
let settingsManager: SettingsManager | null = null;
let isQuitting = false;
let assignmentCheckInterval: NodeJS.Timeout | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow?.show();
      }
    },
    {
      label: 'Check Now',
      click: () => {
        assignmentChecker?.checkNow();
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('LMS Center - Kareem Adel');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow?.show();
  });
}

async function updateAssignmentsUI() {
  if (assignmentChecker && mainWindow) {
    const assignments = await assignmentChecker.getAssignments();
    mainWindow.webContents.send('assignments-updated', assignments);
  }
}

function startAssignmentUIUpdates() {
  if (assignmentCheckInterval) {
    clearInterval(assignmentCheckInterval);
  }

  updateAssignmentsUI();

  assignmentCheckInterval = setInterval(() => {
    updateAssignmentsUI();
  }, 60000);
}

function setupIPC() {
  ipcMain.on('save-settings', async (event, config) => {
    settingsManager?.saveSettings(config);

    if (config.useCredentialLogin && config.username && config.password) {
      const authService = new AuthService();

      const loginResult = await authService.login({
        username: config.username,
        password: config.password,
        lmsUrl: config.lmsUrl,
        lmsType: config.lmsType
      });

      if (loginResult.success && loginResult.token) {
        settingsManager?.saveSettings({ apiToken: loginResult.token });
        event.reply('login-success', 'Successfully logged in');
        await assignmentChecker?.restart();
        startAssignmentUIUpdates();
      } else {
        event.reply('login-error', loginResult.error || 'Login failed');
        return;
      }
    } else {
      await assignmentChecker?.restart();
      startAssignmentUIUpdates();
      event.reply('settings-saved');
    }
  });

  ipcMain.on('request-settings', (event) => {
    const settings = settingsManager?.getSettings();
    event.reply('settings-loaded', settings);
  });

  ipcMain.on('request-assignments', async (event) => {
    if (assignmentChecker) {
      const assignments = await assignmentChecker.getAssignments();
      event.reply('assignments-updated', assignments);
    }
  });

  ipcMain.on('request-courses', async (event) => {
    if (assignmentChecker) {
      console.log('Main process: Requesting courses...');
      const courses = await assignmentChecker.getCourses();
      console.log('Main process: Sending courses to renderer:', courses.length);
      event.reply('courses-updated', courses || []);
    }
  });

  ipcMain.on('request-lectures', async (event) => {
    if (assignmentChecker) {
      console.log('Main process: Requesting lectures...');
      const lectures = await assignmentChecker.getLectures();
      console.log('Main process: Sending lectures to renderer:', lectures.length);
      event.reply('lectures-updated', lectures || []);
    }
  });

  ipcMain.on('summarize-assignment', async (event, assignment) => {
    try {
      const config = settingsManager?.getSettings();
      if (!config?.geminiApiKey) {
        event.reply('ai-error', {
          error: 'Gemini API key not configured. Please add your API key in Settings.',
          assignmentId: assignment.id
        });
        return;
      }

      const gemini = new GeminiService(
        config.geminiApiKey,
        config.geminiModel,
        config.downloadPath,
        config.extraRules || '',
        config.pdfHeaderFields || ['name', 'id'],
        config.useHandwriting !== false,
        config.handwritingFont || 'Homemade Apple',
        config.handwritingColor || '#2d2d2d',
        config.fontSize || 18,
        config.paperStyle || 'aged-vintage',
        config.rotationVariance !== undefined ? config.rotationVariance : 0.5,
        config.spacingVariance !== undefined ? config.spacingVariance : 5,
        config.wordSpacingVariance !== undefined ? config.wordSpacingVariance : 10,
        config.baselineVariance !== undefined ? config.baselineVariance : 0.8,
        config.inkDensityVariance !== undefined ? config.inkDensityVariance : 25,
        config.blurVariance !== undefined ? config.blurVariance : 15,
        config.sizeVariance !== undefined ? config.sizeVariance : 3,
        config.enableMarginDoodles !== false,
        config.enableInkSpots !== false
      );
      const summary = await gemini.generateSummary(assignment);
      event.reply('summary-result', {
        assignmentId: assignment.id,
        assignmentName: assignment.name,
        summary
      });
    } catch (error: any) {
      event.reply('ai-error', {
        error: error.message || 'Failed to generate summary',
        assignmentId: assignment.id
      });
    }
  });

  ipcMain.on('solve-assignment', async (event, assignment) => {
    try {
      const config = settingsManager?.getSettings();
      if (!config?.geminiApiKey) {
        event.reply('ai-error', {
          error: 'Gemini API key not configured. Please add your API key in Settings.',
          assignmentId: assignment.id
        });
        return;
      }

      // Download attachments and extract content for AI processing
      let downloadedFiles: { [fileName: string]: string } = {};
      const pdfImages: { [fileName: string]: string[] } = {};
      const docxTexts: { [fileName: string]: string } = {};

      const downloader = new FileDownloader(config.downloadPath);
      const pathManager = downloader.getPathManager();

      // Get the assignment folder path using PathManager
      const assignmentFolder = pathManager.getAssignmentPath(
        assignment.courseName,
        assignment.name
      );

      // ALWAYS download and process attachments when solving (not just when autoDownload is enabled)
      if (assignment.attachments && assignment.attachments.length > 0) {
        console.log(`Processing ${assignment.attachments.length} attachment(s) for AI solving...`);

        // Download all files to the same assignment folder
        downloadedFiles = await downloader.downloadMultipleFiles(
          assignment.attachments,
          assignmentFolder,
          config.apiToken
        );
        console.log('Downloaded files:', downloadedFiles);

        // Extract text from DOCX files (no LibreOffice needed!)
        for (const [fileName, filePath] of Object.entries(downloadedFiles)) {
          if (filePath && downloader.isDocxFile(fileName)) {
            try {
              console.log(`Extracting text from DOCX file: ${fileName}`);
              const text = await downloader.extractDocxText(filePath);
              if (text) {
                docxTexts[fileName] = text;
                console.log(`Extracted ${text.length} characters from ${fileName}`);
              } else {
                console.log(`No text extracted from ${fileName}`);
              }
            } catch (error) {
              console.error(`Failed to extract text from DOCX ${fileName}:`, error);
            }
          }
        }

        // Convert PDFs to images
        for (const [fileName, filePath] of Object.entries(downloadedFiles)) {
          if (filePath && downloader.isPdfFile(fileName)) {
            try {
              console.log(`Processing PDF file: ${fileName}`);
              const images = await downloader.convertPdfToImages(filePath);
              pdfImages[fileName] = images;
              console.log(`Converted PDF ${fileName} to ${images.length} images`);
            } catch (error) {
              console.error(`Failed to convert PDF ${fileName}:`, error);
            }
          }
        }

        console.log(`Total content for AI: ${Object.keys(docxTexts).length} DOCX text(s), ${Object.keys(pdfImages).length} PDF image(s)`);
      }

      const gemini = new GeminiService(
        config.geminiApiKey,
        config.geminiModel,
        config.downloadPath,
        config.extraRules || '',
        config.pdfHeaderFields || ['name', 'id'],
        config.useHandwriting !== false,
        config.handwritingFont || 'Homemade Apple',
        config.handwritingColor || '#2d2d2d',
        config.fontSize || 18,
        config.paperStyle || 'aged-vintage',
        config.rotationVariance !== undefined ? config.rotationVariance : 0.5,
        config.spacingVariance !== undefined ? config.spacingVariance : 5,
        config.wordSpacingVariance !== undefined ? config.wordSpacingVariance : 10,
        config.baselineVariance !== undefined ? config.baselineVariance : 0.8,
        config.inkDensityVariance !== undefined ? config.inkDensityVariance : 25,
        config.blurVariance !== undefined ? config.blurVariance : 15,
        config.sizeVariance !== undefined ? config.sizeVariance : 3,
        config.enableMarginDoodles !== false,
        config.enableInkSpots !== false
      );
      const solution = await gemini.solveAssignment(assignment, downloadedFiles, pdfImages, docxTexts);
      const filePath = await gemini.saveSolution(assignment, solution);

      event.reply('solve-result', {
        assignmentId: assignment.id,
        assignmentName: assignment.name,
        filePath,
        downloadedFiles
      });
    } catch (error: any) {
      event.reply('ai-error', {
        error: error.message || 'Failed to solve assignment',
        assignmentId: assignment.id
      });
    }
  });

  ipcMain.on('open-url', async (event, url) => {
    try {
      await shell.openExternal(url);
    } catch (error) {
      console.error('Failed to open URL:', error);
    }
  });

  ipcMain.on('open-file', async (event, filePath) => {
    try {
      await shell.openPath(filePath);
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  });

  ipcMain.on('download-attachment', async (event, { attachment, courseName, assignmentName, lectureName }) => {
    try {
      const config = settingsManager?.getSettings();
      const downloader = new FileDownloader(config?.downloadPath);
      const pathManager = downloader.getPathManager();

      // Determine folder path based on context (assignment or lecture)
      let folderPath: string;
      if (lectureName) {
        folderPath = pathManager.getLecturePath(courseName, lectureName);
      } else {
        folderPath = pathManager.getAssignmentPath(courseName, assignmentName);
      }

      const filePath = await downloader.downloadFile(attachment, folderPath, config?.apiToken);

      event.reply('download-complete', {
        attachmentId: attachment.id,
        fileName: attachment.fileName,
        filePath
      });
    } catch (error: any) {
      event.reply('download-error', {
        attachmentId: attachment.id,
        fileName: attachment.fileName,
        error: error.message || 'Failed to download file'
      });
    }
  });

  ipcMain.on('check-file-exists', async (event, { attachment, courseName, assignmentName, lectureName }) => {
    try {
      const config = settingsManager?.getSettings();
      const downloader = new FileDownloader(config?.downloadPath);
      const pathManager = downloader.getPathManager();

      // Determine folder path based on context (assignment or lecture)
      let folderPath: string;
      if (lectureName) {
        folderPath = pathManager.getLecturePath(courseName, lectureName);
      } else {
        folderPath = pathManager.getAssignmentPath(courseName, assignmentName);
      }

      const exists = downloader.fileExists(attachment, folderPath);
      const filePath = exists ? downloader.getFilePath(attachment, folderPath) : '';

      event.reply('file-exists-result', {
        attachmentId: attachment.id,
        exists,
        filePath
      });
    } catch (error: any) {
      event.reply('file-exists-result', {
        attachmentId: attachment.id,
        exists: false,
        filePath: ''
      });
    }
  });

  ipcMain.on('request-gemini-models', async (event, apiKey) => {
    try {
      if (!apiKey) {
        event.reply('gemini-models-result', ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro']);
        return;
      }

      const gemini = new GeminiService(apiKey, undefined, undefined, '', ['name', 'id'], false, 'Homemade Apple', '#2d2d2d', 18, 'aged-vintage', 0.5, 5, 10, 0.8, 25, 15, 3, true, true);
      const models = await gemini.listAvailableModels();
      event.reply('gemini-models-result', models);
    } catch (error: any) {
      console.error('Error fetching Gemini models:', error);
      // Send fallback models on error
      event.reply('gemini-models-result', ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro']);
    }
  });

  // Check for solution.pdf in assignment folder
  ipcMain.on('check-solution-pdf', async (event, { courseName, assignmentName }) => {
    try {
      const config = settingsManager?.getSettings();
      const downloader = new FileDownloader(config?.downloadPath);
      const pathManager = downloader.getPathManager();

      const assignmentFolder = pathManager.getAssignmentPath(courseName, assignmentName);
      const solutionPath = path.join(assignmentFolder, 'solution.pdf');

      const fs = require('fs');
      const exists = fs.existsSync(solutionPath);

      event.reply('solution-pdf-result', {
        exists,
        filePath: exists ? solutionPath : null
      });
    } catch (error: any) {
      console.error('Error checking for solution.pdf:', error);
      event.reply('solution-pdf-result', { exists: false, filePath: null });
    }
  });

  // File selection for submission
  ipcMain.on('select-submission-file', async (event) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openFile'],
        filters: [
          { name: 'All Files', extensions: ['*'] },
          { name: 'PDF', extensions: ['pdf'] },
          { name: 'Documents', extensions: ['doc', 'docx', 'txt'] },
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] }
        ]
      });

      if (!result.canceled && result.filePaths.length > 0) {
        event.reply('submission-file-selected', {
          filePath: result.filePaths[0]
        });
      } else {
        event.reply('submission-file-selected', { filePath: null });
      }
    } catch (error: any) {
      console.error('Error selecting file:', error);
      event.reply('submission-file-selected', { filePath: null });
    }
  });

  // Submit assignment
  ipcMain.on('submit-assignment', async (event, { assignment, comment, attachments }) => {
    try {
      console.log('Submission request received:', {
        assignmentId: assignment.id,
        courseId: assignment.courseId,
        attachmentCount: attachments?.length || 0
      });

      const config = settingsManager?.getSettings();
      if (!assignmentChecker) {
        event.reply('submit-error', {
          error: 'LMS not configured',
          assignmentId: assignment.id
        });
        return;
      }

      // Get the LMS client
      const client = (assignmentChecker as any).client;
      if (!client) {
        event.reply('submit-error', {
          error: 'LMS client not available',
          assignmentId: assignment.id
        });
        return;
      }

      // Validate that we have courseId
      if (!assignment.courseId) {
        event.reply('submit-error', {
          error: 'Assignment courseId is missing',
          assignmentId: assignment.id
        });
        return;
      }

      // Submit the assignment
      console.log('Calling client.submitAssignment...');
      const result = await client.submitAssignment({
        assignmentId: assignment.id,
        courseId: assignment.courseId,
        comment,
        attachments
      });

      console.log('Submission result:', result);

      if (result.success) {
        event.reply('submit-success', {
          assignmentId: assignment.id,
          assignmentName: assignment.name
        });
      } else {
        event.reply('submit-error', {
          error: result.error || 'Submission failed',
          assignmentId: assignment.id
        });
      }
    } catch (error: any) {
      console.error('Error submitting assignment:', error);
      event.reply('submit-error', {
        error: error.message || 'Failed to submit assignment',
        assignmentId: assignment?.id
      });
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  settingsManager = new SettingsManager();
  assignmentChecker = new AssignmentChecker(settingsManager);

  // Initialize HandwritingService
  const settings = settingsManager.getSettings();
  const pathManager = new PathManager(settings?.downloadPath);
  const handwritingService = new HandwritingService(pathManager);

  setupIPC();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});
