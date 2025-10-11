import * as path from 'path';
import { app } from 'electron';

export class PathManager {
  private baseDownloadPath: string;

  constructor(customPath?: string) {
    // Use custom path or default to Downloads folder (without "LMS Downloads" subfolder)
    this.baseDownloadPath = customPath || app.getPath('downloads');
  }

  /**
   * Sanitize folder/file names by removing invalid characters
   */
  private sanitizeName(name: string): string {
    return name.replace(/[/\\?%*:|"<>]/g, '-').trim();
  }

  /**
   * Get the course folder path
   * Example: C:/Users/user/Downloads/CourseName
   */
  getCoursePath(courseName: string): string {
    return path.join(this.baseDownloadPath, this.sanitizeName(courseName));
  }

  /**
   * Get the assignment folder path
   * Example: C:/Users/user/Downloads/CourseName/Assignment-1
   */
  getAssignmentPath(courseName: string, assignmentName: string): string {
    return path.join(
      this.getCoursePath(courseName),
      this.sanitizeName(assignmentName)
    );
  }

  /**
   * Get the lectures folder path
   * Example: C:/Users/user/Downloads/CourseName/Lectures
   */
  getLecturesPath(courseName: string): string {
    return path.join(this.getCoursePath(courseName), 'Lectures');
  }

  /**
   * Get the specific lecture folder path
   * Example: C:/Users/user/Downloads/CourseName/Lectures/Lecture-1
   */
  getLecturePath(courseName: string, lectureName: string): string {
    return path.join(this.getLecturesPath(courseName), this.sanitizeName(lectureName));
  }

  /**
   * Get base download path
   */
  getBasePath(): string {
    return this.baseDownloadPath;
  }
}
