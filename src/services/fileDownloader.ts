import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { FileAttachment } from '../types/assignment';
import { PathManager } from './pathManager';

export class FileDownloader {
  private pathManager: PathManager;

  constructor(customPath?: string) {
    this.pathManager = new PathManager(customPath);
  }

  async downloadFile(attachment: FileAttachment, folderPath: string, token?: string): Promise<string> {
    try {

      // Create subfolder if it doesn't exist
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const fileName = attachment.fileName || 'download';
      const filePath = path.join(folderPath, fileName);

      // Check if file already exists
      if (fs.existsSync(filePath)) {
        console.log(`File already exists: ${filePath}`);
        return filePath;
      }

      console.log(`Downloading: ${attachment.fileName} from ${attachment.url}`);

      // Add token to URL if provided (for Moodle files)
      let downloadUrl = attachment.url;
      if (token) {
        console.log(`Token available: ${token.substring(0, 8)}...`);
        if (downloadUrl.includes('pluginfile.php') || downloadUrl.includes('/webservice/')) {
          // Add token parameter for Moodle webservice files
          const separator = downloadUrl.includes('?') ? '&' : '?';
          downloadUrl = `${downloadUrl}${separator}token=${token}`;
          console.log(`Added token to download URL`);
        }
      } else {
        console.log('WARNING: No token provided for download');
      }

      // Download file
      const response = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
        timeout: 60000, // 60 second timeout
        maxRedirects: 5
      });

      // Check if response is a JSON error instead of the actual file
      const responseText = Buffer.from(response.data).toString('utf-8');

      // Try to parse as JSON to check for Moodle errors
      try {
        const jsonResponse = JSON.parse(responseText);
        if (jsonResponse.error || jsonResponse.errorcode) {
          const errorMsg = jsonResponse.error || 'Download failed';
          const errorCode = jsonResponse.errorcode || 'unknown';
          console.error(`Moodle error response: ${errorMsg} (${errorCode})`);
          throw new Error(`Moodle error: ${errorMsg} (${errorCode})`);
        }
      } catch (parseError) {
        // Not JSON, this is good - it's the actual file
        // Continue with normal download
      }

      // Write file
      fs.writeFileSync(filePath, Buffer.from(response.data));
      console.log(`Downloaded to: ${filePath}`);

      return filePath;
    } catch (error: any) {
      console.error(`Error downloading file ${attachment.fileName}:`, error);
      throw error;
    }
  }

  async downloadMultipleFiles(
    attachments: FileAttachment[],
    folderPath: string,
    token?: string
  ): Promise<{ [fileName: string]: string }> {
    const results: { [fileName: string]: string } = {};

    for (const attachment of attachments) {
      try {
        const filePath = await this.downloadFile(attachment, folderPath, token);
        results[attachment.fileName] = filePath;
      } catch (error) {
        console.error(`Failed to download ${attachment.fileName}:`, error);
        results[attachment.fileName] = '';
      }
    }

    return results;
  }

  async readFileContent(filePath: string): Promise<string> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      return content;
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      throw error;
    }
  }

  fileExists(attachment: FileAttachment, folderPath: string): boolean {
    try {
      const fileName = attachment.fileName || 'download';
      const filePath = path.join(folderPath, fileName);

      return fs.existsSync(filePath);
    } catch (error) {
      return false;
    }
  }

  getFilePath(attachment: FileAttachment, folderPath: string): string {
    const fileName = attachment.fileName || 'download';
    return path.join(folderPath, fileName);
  }

  getPathManager(): PathManager {
    return this.pathManager;
  }

  formatFileSize(bytes?: number): string {
    if (!bytes) return 'Unknown size';

    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  async convertPdfToImages(pdfPath: string): Promise<string[]> {
    try {
      const pdfPoppler = require('pdf-poppler');
      const outputDir = path.dirname(pdfPath);
      const baseName = path.basename(pdfPath, '.pdf');

      const options = {
        format: 'png',
        out_dir: outputDir,
        out_prefix: `${baseName}-page`,
        page: null // Convert all pages
      };

      await pdfPoppler.convert(pdfPath, options);

      // Find all generated image files
      const imageFiles: string[] = [];
      const files = fs.readdirSync(outputDir);

      for (const file of files) {
        if (file.startsWith(`${baseName}-page`) && file.endsWith('.png')) {
          imageFiles.push(path.join(outputDir, file));
        }
      }

      // Sort by page number
      imageFiles.sort();

      console.log(`Converted PDF to ${imageFiles.length} images`);
      return imageFiles;
    } catch (error) {
      console.error('Error converting PDF to images:', error);
      throw error;
    }
  }

  isPdfFile(fileName: string): boolean {
    return fileName.toLowerCase().endsWith('.pdf');
  }

  isDocxFile(fileName: string): boolean {
    return fileName.toLowerCase().endsWith('.docx') || fileName.toLowerCase().endsWith('.doc');
  }

  async convertDocxToPdf(docxPath: string): Promise<string> {
    try {
      console.log(`Converting DOCX to PDF: ${docxPath}`);
      const libre = require('libreoffice-convert');
      const { promisify } = require('util');
      const convertAsync = promisify(libre.convert);

      // Read the DOCX file
      const docxBuffer = fs.readFileSync(docxPath);

      // Convert to PDF
      const pdfBuffer = await convertAsync(docxBuffer, '.pdf', undefined);

      // Save the PDF in the same directory
      const pdfPath = docxPath.replace(/\.(docx|doc)$/i, '.pdf');
      fs.writeFileSync(pdfPath, pdfBuffer);

      console.log(`Converted DOCX to PDF: ${pdfPath}`);
      return pdfPath;
    } catch (error) {
      console.error('Error in DOCX to PDF conversion:', error);
      console.log('Note: DOCX to PDF conversion requires LibreOffice to be installed on your system.');
      return '';
    }
  }

  async extractDocxText(docxPath: string): Promise<string> {
    try {
      console.log(`Extracting text from DOCX: ${docxPath}`);
      const mammoth = require('mammoth');

      // Extract raw text from DOCX file
      const result = await mammoth.extractRawText({ path: docxPath });
      const text = result.value; // The raw text
      const messages = result.messages;

      if (messages && messages.length > 0) {
        console.log('Mammoth messages:', messages);
      }

      console.log(`Extracted ${text.length} characters from DOCX`);
      return text;
    } catch (error) {
      console.error('Error extracting text from DOCX:', error);
      return '';
    }
  }
}
