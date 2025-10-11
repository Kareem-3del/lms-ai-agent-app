import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { DownloadTask, CourseFolder, DownloadSettings } from '../types/download';
import { app } from 'electron';

const streamPipeline = promisify(pipeline);

export class DownloadManager {
  private downloadTasks: Map<string, DownloadTask> = new Map();
  private courseFolders: Map<string, CourseFolder> = new Map();
  private settings: DownloadSettings;

  constructor(settings?: Partial<DownloadSettings>) {
    this.settings = {
      baseDownloadPath: settings?.baseDownloadPath || path.join(app.getPath('documents'), 'LMS Downloads'),
      autoDownload: settings?.autoDownload ?? true,
      organizeByFolder: settings?.organizeByFolder ?? true
    };

    this.ensureBaseDirectory();
  }

  private ensureBaseDirectory() {
    if (!fs.existsSync(this.settings.baseDownloadPath)) {
      fs.mkdirSync(this.settings.baseDownloadPath, { recursive: true });
    }
  }

  private sanitizeFolderName(name: string): string {
    return name.replace(/[<>:"/\\|?*]/g, '_').trim();
  }

  private ensureCourseFolders(courseId: string, courseName: string): CourseFolder {
    if (this.courseFolders.has(courseId)) {
      return this.courseFolders.get(courseId)!;
    }

    const sanitizedCourseName = this.sanitizeFolderName(courseName);
    const basePath = path.join(this.settings.baseDownloadPath, sanitizedCourseName);
    const assignmentsPath = path.join(basePath, 'Assignments');
    const lecturesPath = path.join(basePath, 'Lectures');
    const resourcesPath = path.join(basePath, 'Resources');

    [basePath, assignmentsPath, lecturesPath, resourcesPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    const courseFolder: CourseFolder = {
      courseId,
      courseName,
      basePath,
      assignmentsPath,
      lecturesPath,
      resourcesPath
    };

    this.courseFolders.set(courseId, courseFolder);
    return courseFolder;
  }

  private getTargetFolder(courseId: string, courseName: string, type: 'assignment' | 'lecture' | 'resource'): string {
    const courseFolder = this.ensureCourseFolders(courseId, courseName);

    switch (type) {
      case 'assignment':
        return courseFolder.assignmentsPath;
      case 'lecture':
        return courseFolder.lecturesPath;
      case 'resource':
        return courseFolder.resourcesPath;
      default:
        return courseFolder.basePath;
    }
  }

  async downloadFile(
    url: string,
    fileName: string,
    courseId: string,
    courseName: string,
    assignmentName: string,
    type: 'assignment' | 'lecture' | 'resource' = 'assignment',
    headers?: Record<string, string>
  ): Promise<DownloadTask> {
    const taskId = `${courseId}-${fileName}-${Date.now()}`;

    const task: DownloadTask = {
      id: taskId,
      fileName,
      url,
      courseName,
      assignmentName,
      type,
      status: 'pending',
      progress: 0
    };

    this.downloadTasks.set(taskId, task);

    try {
      task.status = 'downloading';

      const targetFolder = this.getTargetFolder(courseId, courseName, type);
      const sanitizedFileName = this.sanitizeFolderName(fileName);
      const filePath = path.join(targetFolder, sanitizedFileName);

      const response = await axios({
        method: 'GET',
        url,
        responseType: 'stream',
        headers: headers || {}
      });

      const totalLength = response.headers['content-length'];
      let downloadedLength = 0;

      response.data.on('data', (chunk: Buffer) => {
        downloadedLength += chunk.length;
        if (totalLength) {
          task.progress = (downloadedLength / parseInt(totalLength)) * 100;
        }
      });

      await streamPipeline(
        response.data,
        fs.createWriteStream(filePath)
      );

      task.status = 'completed';
      task.progress = 100;
      task.filePath = filePath;

      console.log(`Downloaded: ${fileName} to ${filePath}`);

      return task;
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to download ${fileName}:`, error);
      return task;
    }
  }

  async downloadAssignmentFiles(
    assignmentId: string,
    assignmentName: string,
    courseId: string,
    courseName: string,
    files: Array<{ url: string; fileName: string }>,
    authToken?: string
  ): Promise<DownloadTask[]> {
    const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : undefined;

    const downloadPromises = files.map(file =>
      this.downloadFile(
        file.url,
        file.fileName,
        courseId,
        courseName,
        assignmentName,
        'assignment',
        headers
      )
    );

    return Promise.all(downloadPromises);
  }

  getDownloadTask(taskId: string): DownloadTask | undefined {
    return this.downloadTasks.get(taskId);
  }

  getAllDownloadTasks(): DownloadTask[] {
    return Array.from(this.downloadTasks.values());
  }

  getActiveDownloads(): DownloadTask[] {
    return Array.from(this.downloadTasks.values())
      .filter(task => task.status === 'downloading' || task.status === 'pending');
  }

  getCourseFolderPath(courseId: string): string | undefined {
    return this.courseFolders.get(courseId)?.basePath;
  }

  updateSettings(settings: Partial<DownloadSettings>) {
    this.settings = { ...this.settings, ...settings };
    this.ensureBaseDirectory();
  }

  getSettings(): DownloadSettings {
    return { ...this.settings };
  }
}
