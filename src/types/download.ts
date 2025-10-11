export interface DownloadSettings {
  baseDownloadPath: string;
  autoDownload: boolean;
  organizeByFolder: boolean;
}

export interface DownloadTask {
  id: string;
  fileName: string;
  url: string;
  courseName: string;
  assignmentName: string;
  type: 'assignment' | 'lecture' | 'resource';
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress: number;
  filePath?: string;
  error?: string;
}

export interface CourseFolder {
  courseId: string;
  courseName: string;
  basePath: string;
  assignmentsPath: string;
  lecturesPath: string;
  resourcesPath: string;
}
