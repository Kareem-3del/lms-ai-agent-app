export interface FileAttachment {
  id: string;
  fileName: string;
  url: string;
  size?: number;
  contentType?: string;
}

export interface Assignment {
  id: string;
  name: string;
  description?: string;
  dueDate: string;
  courseId: string;
  courseName: string;
  url?: string;
  submitted: boolean;
  submittedDate?: string;
  attachments?: FileAttachment[];
  category?: 'math' | 'coding' | 'writing' | 'other';
}

export interface Lecture {
  id: string;
  name: string;
  description?: string;
  courseId: string;
  courseName: string;
  url?: string;
  attachments?: FileAttachment[];
  createdDate?: string;
}

export interface Course {
  id: string;
  name: string;
}

export interface SubjectFormattingPreference {
  courseName: string;
  category: 'math' | 'coding' | 'writing' | 'other';
  useLatex: boolean;
  customPromptInstructions?: string;
}

export interface LMSConfig {
  lmsType: 'canvas' | 'moodle' | 'blackboard';
  lmsUrl: string;
  apiToken: string;
  username?: string;
  password?: string;
  useCredentialLogin?: boolean;
  checkInterval: number;
  soundEnabled: boolean;
  autoDownload?: boolean;
  downloadPath?: string;
  geminiApiKey?: string;
  geminiModel?: string;
  subjectPreferences?: SubjectFormattingPreference[];
  extraRules?: string;
  pdfHeaderFields?: string[]; // Fields to show in PDF header: 'name', 'id', 'course', 'dueDate', 'category', 'generated'
  useHandwriting?: boolean; // Use handwriting font and paper texture in PDFs
  handwritingFont?: string; // Font family for handwriting: 'Homemade Apple', 'Caveat', 'Indie Flower', 'Patrick Hand', etc.
  handwritingColor?: string; // Ink/text color for handwriting: hex color code (e.g., '#2d2d2d')
  fontSize?: number; // Font size in pixels (14-24px)
  paperStyle?: string; // Paper background style: 'aged-vintage', 'clean-white', 'lined-notebook', 'parchment', etc.
}
