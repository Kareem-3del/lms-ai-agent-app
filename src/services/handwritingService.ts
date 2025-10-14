import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { PathManager } from './pathManager';

export interface HandwritingData {
  dataUrl: string;
  width: number;
  height: number;
  assignmentId: string;
  courseName: string;
  assignmentName: string;
}

export class HandwritingService {
  private pathManager: PathManager;

  constructor(pathManager: PathManager) {
    this.pathManager = pathManager;
    this.setupIpcHandlers();
  }

  private setupIpcHandlers(): void {
    // Save handwriting canvas as PNG image
    ipcMain.handle('handwriting:save-image', async (_event, data: HandwritingData) => {
      return this.saveHandwritingImage(data);
    });

    // Save handwriting canvas as PDF (will be implemented in renderer)
    ipcMain.handle('handwriting:save-pdf', async (_event, pdfData: {
      buffer: Buffer;
      courseName: string;
      assignmentName: string;
      filename: string
    }) => {
      return this.saveHandwritingPDF(pdfData);
    });

    // Get list of saved handwriting files for an assignment
    ipcMain.handle('handwriting:list-files', async (_event, courseName: string, assignmentName: string) => {
      return this.listHandwritingFiles(courseName, assignmentName);
    });

    // Delete a handwriting file
    ipcMain.handle('handwriting:delete-file', async (_event, filePath: string) => {
      return this.deleteHandwritingFile(filePath);
    });
  }

  /**
   * Save handwriting canvas data as PNG image
   */
  private async saveHandwritingImage(data: HandwritingData): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const assignmentPath = this.pathManager.getAssignmentPath(data.courseName, data.assignmentName);

      // Create handwriting subfolder
      const handwritingPath = path.join(assignmentPath, 'Handwriting');
      if (!fs.existsSync(handwritingPath)) {
        fs.mkdirSync(handwritingPath, { recursive: true });
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `handwriting_${timestamp}.png`;
      const filePath = path.join(handwritingPath, filename);

      // Convert data URL to buffer
      const base64Data = data.dataUrl.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Save file
      fs.writeFileSync(filePath, buffer);

      console.log(`Handwriting image saved: ${filePath}`);
      return { success: true, filePath };
    } catch (error: any) {
      console.error('Error saving handwriting image:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Save handwriting as PDF file
   */
  private async saveHandwritingPDF(pdfData: {
    buffer: Buffer;
    courseName: string;
    assignmentName: string;
    filename: string
  }): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const assignmentPath = this.pathManager.getAssignmentPath(pdfData.courseName, pdfData.assignmentName);

      // Create handwriting subfolder
      const handwritingPath = path.join(assignmentPath, 'Handwriting');
      if (!fs.existsSync(handwritingPath)) {
        fs.mkdirSync(handwritingPath, { recursive: true });
      }

      const filePath = path.join(handwritingPath, pdfData.filename);

      // Save PDF buffer to file
      fs.writeFileSync(filePath, pdfData.buffer);

      console.log(`Handwriting PDF saved: ${filePath}`);
      return { success: true, filePath };
    } catch (error: any) {
      console.error('Error saving handwriting PDF:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * List all handwriting files for an assignment
   */
  private async listHandwritingFiles(courseName: string, assignmentName: string): Promise<{ success: boolean; files?: string[]; error?: string }> {
    try {
      const assignmentPath = this.pathManager.getAssignmentPath(courseName, assignmentName);
      const handwritingPath = path.join(assignmentPath, 'Handwriting');

      if (!fs.existsSync(handwritingPath)) {
        return { success: true, files: [] };
      }

      const files = fs.readdirSync(handwritingPath)
        .filter(file => file.endsWith('.png') || file.endsWith('.pdf'))
        .map(file => path.join(handwritingPath, file));

      return { success: true, files };
    } catch (error: any) {
      console.error('Error listing handwriting files:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a handwriting file
   */
  private async deleteHandwritingFile(filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Handwriting file deleted: ${filePath}`);
        return { success: true };
      }
      return { success: false, error: 'File not found' };
    } catch (error: any) {
      console.error('Error deleting handwriting file:', error);
      return { success: false, error: error.message };
    }
  }
}
