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
  // Handwriting humanization & randomization settings
  rotationVariance?: number; // Rotation variance in degrees (0-3), default: 0.5
  spacingVariance?: number; // Letter spacing variance percentage (0-20), default: 5
  wordSpacingVariance?: number; // Word spacing variance percentage (0-30), default: 10
  baselineVariance?: number; // Baseline shift in pixels (0-3), default: 0.8
  inkDensityVariance?: number; // Ink density variance percentage (0-100), default: 25
  blurVariance?: number; // Blur & smudge variance percentage (0-50), default: 15
  sizeVariance?: number; // Character size variance percentage (0-15), default: 3
  enableMarginDoodles?: boolean; // Enable margin doodles & annotations, default: true
  enableInkSpots?: boolean; // Enable ink spots & bleed effects, default: true
  // Advanced handwriting settings
  paperBackground?: string; // Paper background style from dropdown (e.g., 'plain-white', 'lined-with-margin', 'blue-grid')
  tableBackground?: string; // Table/desk background (e.g., 'none', 'golden-oak', 'walnut')
  customFont?: string; // Custom font selection or uploaded font path
  fontSizeAdvanced?: number; // Advanced font size in pixels (12-48px), default: 30
  lineHeight?: number; // Line height multiplier (0.8-3.0), default: 1.30
  letterSpacing?: number; // Letter spacing in pixels (-5 to 10), default: 0
  wordSpacing?: number; // Word spacing in pixels (-5 to 20), default: 0
  enableBlur?: boolean; // Enable blur effect on text
  enableShading?: boolean; // Enable shading/gradient effect
  enablePaperShadow?: boolean; // Enable shadow around paper
  enablePaperTexture?: boolean; // Enable paper texture overlay, default: true
  enableShadowSilhouette?: boolean; // Enable shadow silhouette effect
  enablePaperRotation?: boolean; // Enable slight paper rotation
  enableInkFlow?: boolean; // Enable ink flow variation
  marginTop?: number; // Top margin in pixels (0-100), default: 20
  marginRight?: number; // Right margin in pixels (0-100), default: 20
  marginBottom?: number; // Bottom margin in pixels (0-100), default: 20
  marginLeft?: number; // Left margin in pixels (0-100), default: 20
  mirrorMargins?: boolean; // Mirror left/right margins on even pages
  marginTopEven?: number; // Top margin for even pages (0-100), default: 20
  marginRightEven?: number; // Right margin for even pages (0-100), default: 20
  marginBottomEven?: number; // Bottom margin for even pages (0-100), default: 20
  marginLeftEven?: number; // Left margin for even pages (0-100), default: 20
  randomWordRotation?: boolean; // Enable random word rotation
  randomLetterRotation?: boolean; // Enable random letter rotation
  randomIndentation?: boolean; // Enable random paragraph indentation
  indentationRange?: number; // Indentation range in pixels (0-50), default: 5
  enableHyphenation?: boolean; // Enable automatic hyphenation
  paragraphSpacing?: number; // Spacing between paragraphs in pixels (0-50), default: 0
  outputFormat?: string; // Output format: 'pdf', 'png', 'jpg', 'svg'
  outputQuality?: string; // Output quality: 'draft', 'normal', 'high', 'print'
  pageSize?: string; // Page size: 'a4', 'letter', 'legal', 'a5'
}
