import { GoogleGenerativeAI } from '@google/generative-ai';
import { Assignment, SubjectFormattingPreference } from '../types/assignment';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { PathManager } from './pathManager';

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private apiKey: string;
  private modelName: string;
  private pathManager: PathManager;
  private subjectPreferences: SubjectFormattingPreference[] = [];
  private preferencesFilePath: string;
  private extraRules: string;
  private pdfHeaderFields: string[];
  private useHandwriting: boolean;
  private handwritingFont: string;
  private handwritingColor: string;
  private fontSize: number;
  private paperStyle: string;

  constructor(
    apiKey: string,
    modelName: string = 'gemini-2.0-flash-exp',
    customPath?: string,
    extraRules: string = '',
    pdfHeaderFields: string[] = ['name', 'id'],
    useHandwriting: boolean = true,
    handwritingFont: string = 'Homemade Apple',
    handwritingColor: string = '#2d2d2d',
    fontSize: number = 18,
    paperStyle: string = 'aged-vintage'
  ) {
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.extraRules = extraRules;
    this.pdfHeaderFields = pdfHeaderFields;
    this.useHandwriting = useHandwriting;
    this.handwritingFont = handwritingFont;
    this.handwritingColor = handwritingColor;
    this.fontSize = fontSize;
    this.paperStyle = paperStyle;
    this.pathManager = new PathManager(customPath);
    this.preferencesFilePath = path.join(
      customPath || app.getPath('userData'),
      'subject-preferences.json'
    );
    this.loadSubjectPreferences();
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  setExtraRules(rules: string): void {
    this.extraRules = rules;
  }

  getExtraRules(): string {
    return this.extraRules;
  }

  setPdfHeaderFields(fields: string[]): void {
    this.pdfHeaderFields = fields;
  }

  getPdfHeaderFields(): string[] {
    return this.pdfHeaderFields;
  }

  async listAvailableModels(): Promise<string[]> {
    // Return list of current supported models (2025)
    // Gemini 1.5 models have been retired
    return [
      'gemini-2.0-flash-exp',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-pro'
    ];
  }

  detectAssignmentCategory(assignment: Assignment): 'math' | 'coding' | 'writing' | 'other' {
    // Include course name in detection for better categorization
    const text = `${assignment.name} ${assignment.description || ''} ${assignment.courseName || ''}`.toLowerCase();

    const mathKeywords = ['math', 'mathematics', 'equation', 'calculus', 'algebra', 'geometry', 'statistics',
                          'probability', 'integral', 'derivative', 'theorem', 'proof', 'laplace', 'transform',
                          'differential', 'linear algebra', 'trigonometry', 'engineer', 'scientist'];
    const codingKeywords = ['code', 'program', 'algorithm', 'function', 'class', 'implement',
                            'debug', 'java', 'python', 'javascript', 'c++', 'sql', 'api', 'software',
                            'computer science', 'programming', 'development'];
    const writingKeywords = ['essay', 'report', 'write', 'composition', 'paper', 'document',
                             'article', 'analysis', 'discussion', 'literature', 'english'];

    const mathScore = mathKeywords.filter(k => text.includes(k)).length;
    const codingScore = codingKeywords.filter(k => text.includes(k)).length;
    const writingScore = writingKeywords.filter(k => text.includes(k)).length;

    const maxScore = Math.max(mathScore, codingScore, writingScore);

    if (maxScore === 0) return 'other';
    if (mathScore === maxScore) return 'math';
    if (codingScore === maxScore) return 'coding';
    if (writingScore === maxScore) return 'writing';

    return 'other';
  }

  private loadSubjectPreferences(): void {
    try {
      if (fs.existsSync(this.preferencesFilePath)) {
        const data = fs.readFileSync(this.preferencesFilePath, 'utf-8');
        this.subjectPreferences = JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading subject preferences:', error);
      this.subjectPreferences = [];
    }
  }

  private saveSubjectPreferences(): void {
    try {
      fs.writeFileSync(
        this.preferencesFilePath,
        JSON.stringify(this.subjectPreferences, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Error saving subject preferences:', error);
    }
  }

  getSubjectPreference(courseName: string): SubjectFormattingPreference | undefined {
    return this.subjectPreferences.find(pref => pref.courseName === courseName);
  }

  saveSubjectPreference(preference: SubjectFormattingPreference): void {
    const existingIndex = this.subjectPreferences.findIndex(
      pref => pref.courseName === preference.courseName
    );

    if (existingIndex >= 0) {
      this.subjectPreferences[existingIndex] = preference;
    } else {
      this.subjectPreferences.push(preference);
    }

    this.saveSubjectPreferences();
  }

  getAllSubjectPreferences(): SubjectFormattingPreference[] {
    return this.subjectPreferences;
  }

  deleteSubjectPreference(courseName: string): void {
    this.subjectPreferences = this.subjectPreferences.filter(
      pref => pref.courseName !== courseName
    );
    this.saveSubjectPreferences();
  }

  shouldPromptForPreferences(assignment: Assignment): boolean {
    // Check if we already have preferences for this course
    return !this.getSubjectPreference(assignment.courseName);
  }

  createPreferenceFromAssignment(assignment: Assignment, useLatex?: boolean, customInstructions?: string): SubjectFormattingPreference {
    const category = this.detectAssignmentCategory(assignment);
    return {
      courseName: assignment.courseName,
      category,
      useLatex: useLatex ?? (category === 'math'),
      customPromptInstructions: customInstructions
    };
  }

  private humanizeCode(code: string): string {
    // Make variable names more human-like (typos, bad names)
    const replacements: { [key: string]: string } = {
      'array': 'arrrry',
      'result': 'rslt',
      'temp': 'tmp',
      'value': 'val',
      'index': 'idx',
      'number': 'num',
      'string': 'str',
      'boolean': 'bool',
      'function': 'func',
      'calculate': 'calc',
      'initialize': 'init',
      'maximum': 'max',
      'minimum': 'min',
      'average': 'avg',
      'count': 'cnt',
      'total': 'tot'
    };

    let humanized = code;

    // Apply replacements to variable names (not in strings)
    for (const [formal, casual] of Object.entries(replacements)) {
      // Match word boundaries to avoid replacing parts of other words
      const regex = new RegExp(`\\b${formal}\\b`, 'gi');
      humanized = humanized.replace(regex, casual);
    }

    // Remove excessive comments
    humanized = humanized.replace(/\/\/\s*TODO:.*$/gm, '');
    humanized = humanized.replace(/\/\*\*[\s\S]*?\*\//g, '');

    // Simplify overly complex patterns
    humanized = humanized.replace(/const\s+(\w+)\s*=\s*\(([^)]+)\)\s*=>\s*\{/g, 'function $1($2) {');

    return humanized;
  }

  async generateSummary(assignment: Assignment): Promise<string> {
    if (!this.genAI) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });

      const prompt = `Summarize this assignment in 2-3 sentences:

Title: ${assignment.name}
Description: ${assignment.description || 'No description'}
Course: ${assignment.courseName}
Due: ${new Date(assignment.dueDate).toLocaleDateString()}

Provide a brief, clear summary of what needs to be done.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating summary:', error);
      throw error;
    }
  }

  private stripMarkdownCodeBlock(content: string): string {
    // Remove ```markdown at the start and ``` at the end if present
    let cleaned = content.trim();

    // Remove opening ```markdown or ``` (with any language identifier)
    if (cleaned.startsWith('```')) {
      const firstNewline = cleaned.indexOf('\n');
      if (firstNewline !== -1) {
        cleaned = cleaned.substring(firstNewline + 1);
      }
    }

    // Remove closing ```
    if (cleaned.endsWith('```')) {
      const lastBackticks = cleaned.lastIndexOf('```');
      cleaned = cleaned.substring(0, lastBackticks);
    }

    return cleaned.trim();
  }

  async solveAssignment(
    assignment: Assignment,
    downloadedFiles?: { [fileName: string]: string },
    pdfImages?: { [fileName: string]: string[] },
    docxTexts?: { [fileName: string]: string }
  ): Promise<string> {
    if (!this.genAI) {
      throw new Error('Gemini API key not configured');
    }

    try {
      // Check for saved subject preference
      const savedPreference = this.getSubjectPreference(assignment.courseName);
      const category = savedPreference?.category || this.detectAssignmentCategory(assignment);
      const useLatex = savedPreference?.useLatex ?? (category === 'math');

      const model = this.genAI.getGenerativeModel({ model: this.modelName });

      let attachmentInfo = '';
      const imageParts: any[] = [];

      // Handle DOCX text content
      if (docxTexts && Object.keys(docxTexts).length > 0) {
        attachmentInfo += '\n\nDOCX file content:\n';
        for (const [fileName, text] of Object.entries(docxTexts)) {
          attachmentInfo += `\n--- ${fileName} ---\n${text}\n--- End of ${fileName} ---\n`;
        }
      }

      // Handle PDF images
      if (pdfImages && Object.keys(pdfImages).length > 0) {
        attachmentInfo += '\n\nPDF attachments (converted to images):\n';
        for (const [fileName, imagePaths] of Object.entries(pdfImages)) {
          attachmentInfo += `- ${fileName} (${imagePaths.length} pages)\n`;

          // Read and encode images for Gemini
          for (const imagePath of imagePaths) {
            const imageData = fs.readFileSync(imagePath);
            const base64Image = imageData.toString('base64');
            imageParts.push({
              inlineData: {
                data: base64Image,
                mimeType: 'image/png'
              }
            });
          }
        }
      }

      // Handle other files
      if (downloadedFiles && Object.keys(downloadedFiles).length > 0) {
        attachmentInfo += '\n\nOther attached files:\n';
        for (const [fileName, filePath] of Object.entries(downloadedFiles)) {
          if (filePath && !fileName.toLowerCase().endsWith('.pdf') && !fileName.toLowerCase().endsWith('.docx') && !fileName.toLowerCase().endsWith('.doc')) {
            attachmentInfo += `- ${fileName} (downloaded to: ${filePath})\n`;
          }
        }
      }

      let promptText = '';

      // Add custom instructions if available
      const customInstructions = savedPreference?.customPromptInstructions
        ? `\n\nADDITIONAL INSTRUCTIONS:\n${savedPreference.customPromptInstructions}\n`
        : '';

      // Add extra rules if available (global rules from settings)
      const extraRulesSection = this.extraRules
        ? `\n\nEXTRA RULES (MUST FOLLOW):\n${this.extraRules}\n`
        : '';

      // Debug: Log that we're using extra rules
      if (this.extraRules) {
        console.log('Extra rules being applied to prompt:', this.extraRules.substring(0, 100) + '...');
      }

      if (category === 'math') {
        if (useLatex) {
          promptText = `Solve this math assignment. Output in PROPER MARKDOWN FORMAT with LaTeX notation.

Title: ${assignment.name}
Description: ${assignment.description || 'No description'}${attachmentInfo}${customInstructions}${extraRulesSection}

CRITICAL MARKDOWN + LATEX FORMATTING RULES (MUST FOLLOW EXACTLY):

**MATH NOTATION:**
- Use single $ for inline math: $x^2 + 3x$
- Use double $$ for display equations (on their own line): $$\\frac{n!}{s^{n+1}}$$
- NEVER use backticks (\`) for math - only $ and $$
- NO spaces between $ and the math content
- Display equations must be on their own line with blank lines before/after

**MARKDOWN FORMATTING (USE ALL STANDARD FEATURES):**
- Use **bold** with double asterisks for headers
- Use *italic* with single asterisks for emphasis
- Use - or * for bullet/unordered lists
- Use 1. 2. 3. for numbered/ordered lists
- Use | tables | when presenting data (with | --- | separator row)
- Use > for blockquotes when quoting
- Use --- for horizontal rules/dividers
- Use blank lines between sections
- NEVER use code blocks (\`\`\`) for math equations
- NEVER use HTML tags
- Full Markdown syntax supported - use appropriately!

**LATEX COMMANDS:**
- Use: \\frac{a}{b}, \\sqrt{x}, \\int, \\sum, ^{power}, _{subscript}
- Use: \\mathcal{L}, \\alpha, \\beta, \\pi, \\theta, \\infty
- Use: \\sin, \\cos, \\tan, \\sinh, \\cosh
- Use: \\leq, \\geq, \\neq, \\approx

FORMAT EXAMPLE (FOLLOW EXACTLY):

**Laplace Transform Formulas Used:**

| Formula | Transform |
| --- | --- |
| $\\mathcal{L}\\{t^n\\}$ | $\\frac{n!}{s^{n+1}}$ |
| $\\mathcal{L}\\{e^{at}\\}$ | $\\frac{1}{s - a}$ |
| $\\mathcal{L}\\{\\cos(at)\\}$ | $\\frac{s}{s^2 + a^2}$ |

Or as display equations:

$$\\mathcal{L}\\{t^n\\} = \\frac{n!}{s^{n+1}}$$

$$\\mathcal{L}\\{e^{at}\\} = \\frac{1}{s - a}$$

$$\\mathcal{L}\\{\\cos(at)\\} = \\frac{s}{s^2 + a^2}$$

**Solution for a. $f(t) = t^3e^{-2t} + 2\\cos(4t)$:**

1. Split the function into parts:
   $$\\mathcal{L}\\{f(t)\\} = \\mathcal{L}\\{t^3e^{-2t}\\} + 2\\mathcal{L}\\{\\cos(4t)\\}$$

2. Apply $\\mathcal{L}\\{t^n\\} = \\frac{n!}{s^{n+1}}$ to get $\\mathcal{L}\\{t^3\\}$:
   $$\\mathcal{L}\\{t^3\\} = \\frac{3!}{s^4} = \\frac{6}{s^4}$$

3. Apply the First Shifting Theorem with $a = -2$:
   $$\\mathcal{L}\\{t^3e^{-2t}\\} = \\frac{6}{(s+2)^4}$$

4. Calculate $\\mathcal{L}\\{\\cos(4t)\\}$:
   $$\\mathcal{L}\\{\\cos(4t)\\} = \\frac{s}{s^2 + 16}$$

5. Combine the results:
   $$\\mathcal{L}\\{f(t)\\} = \\frac{6}{(s+2)^4} + \\frac{2s}{s^2 + 16}$$

IMPORTANT RULES:
- NO backticks or code blocks
- NO HTML or special formatting
- Use ONLY: $...$ for inline, $$...$$ for display, **text** for bold
- Keep blank lines between sections
- This MUST be valid Markdown that renders perfectly

Provide complete solutions in proper Markdown format.`;
        } else {
          // Plain text format for math (no LaTeX)
          promptText = `Solve this math assignment. Show your work step by step using clear mathematical notation.

Title: ${assignment.name}
Description: ${assignment.description || 'No description'}${attachmentInfo}${customInstructions}${extraRulesSection}

Requirements:
- Use plain text for all mathematical expressions
- Show each step clearly
- Explain your reasoning
- Use proper mathematical notation (^, /, *, +, -, etc.)
- Label each step (Step 1:, Step 2:, etc.)

Provide a complete solution with all steps explained.`;
        }
      } else if (category === 'coding') {
        promptText = `Solve this programming assignment. Output in PROPER MARKDOWN FORMAT with code blocks.

Title: ${assignment.name}
Description: ${assignment.description || 'No description'}${attachmentInfo}${customInstructions}${extraRulesSection}

MARKDOWN FORMATTING RULES:
- Use **bold** for section headers
- Use \`\`\`language for code blocks (specify language: python, java, javascript, etc.)
- Use blank lines between sections
- Use inline \`code\` for variable names or short snippets in text
- NO raw code without proper markdown code blocks

CODE REQUIREMENTS:
- Write simple, readable code
- Use short variable names (like tmp, idx, val)
- Minimal comments
- Natural, student-like style
- No over-engineering

FORMAT EXAMPLE:

**Solution:**

Here's the implementation using Python:

\`\`\`python
def calculate(arr):
    rslt = 0
    for idx in range(len(arr)):
        rslt += arr[idx]
    return rslt
\`\`\`

**Explanation:**

The function takes an array \`arr\` and calculates the sum by iterating through each element.

**Time Complexity:** O(n)

Provide complete solution in proper Markdown with code blocks.`;
      } else {
        promptText = `Help with this assignment. Output in PROPER MARKDOWN FORMAT.

Title: ${assignment.name}
Description: ${assignment.description || 'No description'}${attachmentInfo}${customInstructions}${extraRulesSection}

MARKDOWN FORMATTING RULES:
- Use **bold** for headers and important terms
- Use blank lines between paragraphs
- Use bullet points with - for lists
- Use numbered lists with 1. 2. 3. when appropriate
- Use > for blockquotes if needed
- NO HTML tags or special formatting
- Keep it clean and readable

Provide a complete, well-formatted solution in Markdown.`;
      }

      // If we have images, send them with the prompt
      let result;
      if (imageParts.length > 0) {
        result = await model.generateContent([promptText, ...imageParts]);
      } else {
        result = await model.generateContent(promptText);
      }

      const response = await result.response;
      let solution = response.text();

      // Strip markdown code block wrapper if present
      solution = this.stripMarkdownCodeBlock(solution);

      // If it's code, humanize it further
      if (category === 'coding') {
        solution = this.humanizeCode(solution);
      }

      return solution;
    } catch (error) {
      console.error('Error solving assignment:', error);
      throw error;
    }
  }

  async saveSolution(assignment: Assignment, solution: string): Promise<string> {
    try {
      // Use PathManager for consistent folder structure
      const assignmentFolder = this.pathManager.getAssignmentPath(
        assignment.courseName,
        assignment.name
      );

      // Create folders if they don't exist
      if (!fs.existsSync(assignmentFolder)) {
        fs.mkdirSync(assignmentFolder, { recursive: true });
      }

      const category = this.detectAssignmentCategory(assignment);

      // Save as Markdown (primary format with LaTeX support) + PDF
      const mdFileName = 'solution.md';
      const mdFilePath = path.join(assignmentFolder, mdFileName);
      await this.saveAsMarkdown(assignment, solution, category, mdFilePath);
      // PDF is generated inside saveAsMarkdown

      // Save as .docx (secondary format)
      const docxFileName = 'solution.docx';
      const docxFilePath = path.join(assignmentFolder, docxFileName);
      await this.saveAsDocx(assignment, solution, category, docxFilePath);

      // Also save as plain text for backward compatibility
      const txtFileName = 'solution.txt';
      const txtFilePath = path.join(assignmentFolder, txtFileName);

      const header = `Assignment: ${assignment.name}
Course: ${assignment.courseName}
Due Date: ${new Date(assignment.dueDate).toLocaleDateString()}
Category: ${category}
Generated: ${new Date().toLocaleString()}

----------------------------------------

`;

      fs.writeFileSync(txtFilePath, header + solution, 'utf-8');

      const pdfPath = mdFilePath.replace('.md', '.pdf');
      console.log(`Solution saved to:\n- Markdown: ${mdFilePath}\n- PDF: ${pdfPath}\n- Word: ${docxFilePath}\n- Text: ${txtFilePath}`);

      return pdfPath; // Return PDF as primary for viewing
    } catch (error) {
      console.error('Error saving solution:', error);
      throw error;
    }
  }

  private async saveAsMarkdown(assignment: Assignment, solution: string, category: string, filePath: string): Promise<void> {
    // Build custom header based on user preferences
    const headerLines: string[] = [];

    this.pdfHeaderFields.forEach(field => {
      switch(field) {
        case 'name':
          headerLines.push(assignment.name);
          break;
        case 'id':
          headerLines.push(assignment.id);
          break;
        case 'course':
          headerLines.push(assignment.courseName);
          break;
        case 'dueDate':
          headerLines.push(new Date(assignment.dueDate).toLocaleDateString());
          break;
        case 'category':
          headerLines.push(category);
          break;
        case 'generated':
          headerLines.push(new Date().toLocaleString());
          break;
      }
    });

    // Join header lines with newlines, or use empty string if no fields selected
    const header = headerLines.length > 0 ? headerLines.join('\n') + '\n\n' : '';

    // The solution already contains proper LaTeX notation from the AI
    // No "Solution:" heading - just header and content
    const markdownContent = header + solution;

    fs.writeFileSync(filePath, markdownContent, 'utf-8');

    // Also generate PDF from markdown
    try {
      const pdfPath = filePath.replace('.md', '.pdf');
      await this.convertMarkdownToPdf(markdownContent, pdfPath);
      console.log(`PDF generated: ${pdfPath}`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Don't throw - PDF is optional, markdown is primary
    }
  }

  private getPaperBackground(): string {
    if (!this.useHandwriting || this.paperStyle === 'clean-white') {
      return 'background: white;';
    }

    const paperStyles: { [key: string]: string } = {
      'aged-vintage': `
        background-color: #f8f6f0;
        background-image:
          radial-gradient(circle at 15% 10%, rgba(80, 80, 80, 0.04) 0%, transparent 15%),
          radial-gradient(ellipse at 75% 25%, rgba(139, 90, 43, 0.09) 0%, transparent 35%),
          repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,.01) 1px, rgba(0,0,0,.01) 2px),
          linear-gradient(180deg, rgba(255, 248, 220, 0.25) 0%, rgba(245, 230, 195, 0.2) 100%);
        box-shadow: inset 0 0 150px rgba(222, 184, 135, 0.18);
      `,
      'cream-white': `background-color: #fffef7; background-image: repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,.005) 1px, rgba(0,0,0,.005) 2px);`,
      'off-white': `background-color: #fafaf8;`,
      'recycled': `background-color: #f5f5dc; background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,.01) 10px, rgba(0,0,0,.01) 11px);`,
      'lined-notebook': `background: linear-gradient(transparent 0%, transparent calc(100% - 1px), #e0e0e0 calc(100% - 1px)), #ffffff; background-size: 100% 2em;`,
      'college-ruled': `background: linear-gradient(transparent 0%, transparent calc(100% - 1px), #a8d1ff 33.33%, #ffffff 33.33%, transparent calc(33.33% + 1px));`,
      'wide-ruled': `background: linear-gradient(transparent 0%, transparent calc(100% - 1px), #d0d0f0 25%, #ffffff 25%); background-size: 100% 3em;`,
      'graph-paper': `background-color: #f9f9f9; background-image: repeating-linear-gradient(0deg, #e0e0e0 0px, #e0e0e0 1px, transparent 1px, transparent 20px), repeating-linear-gradient(90deg, #e0e0e0 0px, #e0e0e0 1px, transparent 1px, transparent 20px);`,
      'dot-grid': `background-color: #ffffff; background-image: radial-gradient(circle, #d0d0d0 1px, transparent 1px); background-size: 20px 20px;`,
      'engineering': `background-color: #f0f5f0; background-image: repeating-linear-gradient(0deg, #c8e6c9 0px, #c8e6c9 0.5px, transparent 0.5px, transparent 10px);`,
      'parchment': `background-color: #f4e8d0; background-image: radial-gradient(ellipse at 60% 40%, rgba(139, 90, 43, 0.15) 0%, transparent 50%), linear-gradient(180deg, rgba(210, 180, 140, 0.3) 0%, rgba(180, 150, 110, 0.2) 100%);`,
      'watercolor': `background: linear-gradient(135deg, #fef9f3 0%, #f7f4ed 25%, #fefaf4 50%, #f9f6f0 75%, #fdfbf7 100%);`,
      'canvas-texture': `background-color: #faf8f5; background-image: repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,.02) 2px, rgba(0,0,0,.02) 3px);`,
      'linen': `background-color: #faf0e6; background-image: linear-gradient(90deg, rgba(139,69,19,0.03) 50%, transparent 50%); background-size: 2px 2px;`,
      'kraft': `background: linear-gradient(135deg, #d4a574 0%, #c89968 50%, #bc8f5e 100%);`,
      'newsprint': `background-color: #e8e8e8; background-image: repeating-linear-gradient(0deg, rgba(0,0,0,0.02) 0px, rgba(0,0,0,0.02) 1px, transparent 1px, transparent 2px);`,
      'tea-stained': `background: radial-gradient(ellipse at 50% 50%, #f5deb3 0%, #daa520 100%); opacity: 0.3;`,
      'coffee-aged': `background-color: #d2b48c; background-image: radial-gradient(circle at 30% 40%, rgba(101, 67, 33, 0.15) 0%, transparent 60%);`,
      'vintage-worn': `background-color: #f0e68c; background-image: radial-gradient(circle, rgba(139, 90, 43, 0.12) 0%, transparent 50%), linear-gradient(180deg, rgba(210, 180, 140, 0.4) 0%, rgba(139, 90, 43, 0.2) 100%);`,
      'burned-edges': `background: linear-gradient(to right, rgba(101, 67, 33, 0.2) 0%, #f4e8d0 5%, #f4e8d0 95%, rgba(101, 67, 33, 0.2) 100%);`,
      'old-book': `background-color: #f9f3e6; background-image: linear-gradient(90deg, rgba(139,69,19,0.1) 0%, transparent 10%);`,
      'legal-pad': `background-color: #ffffcc; background-image: repeating-linear-gradient(transparent, transparent 2em, #ffcccc 2em, #ffcccc calc(2em + 1px));`,
      'blueprint': `background-color: #1e3a8a; color: white !important; background-image: repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, transparent 1px, transparent 20px);`,
      'ledger': `background-color: #f0f8ff; background-image: repeating-linear-gradient(0deg, transparent, transparent 2.5em, #b0c4de calc(2.5em), #b0c4de calc(2.5em + 1px));`,
      'vellum': `background-color: #fffef0; background-image: radial-gradient(ellipse, rgba(245, 245, 220, 0.5) 0%, transparent 70%);`,
      'pastel-blue': `background-color: #e6f2ff;`,
      'pastel-pink': `background-color: #ffe6f0;`,
      'pastel-yellow': `background-color: #fffacd;`,
      'pastel-green': `background-color: #e6ffe6;`,
      'light-gray': `background-color: #f5f5f5;`
    };

    return paperStyles[this.paperStyle] || paperStyles['aged-vintage'];
  }

  private async convertMarkdownToPdf(markdownContent: string, pdfPath: string): Promise<void> {
    const { BrowserWindow } = require('electron');
    const MarkdownIt = require('markdown-it');
    const katex = require('katex');
    const handwritten = require('handwritten.js');

    // Debug: Log handwriting settings
    console.log('PDF Generation Settings:', {
      useHandwriting: this.useHandwriting,
      handwritingFont: this.handwritingFont,
      handwritingColor: this.handwritingColor,
      fontSize: this.fontSize,
      paperStyle: this.paperStyle,
      extraRules: this.extraRules ? this.extraRules.substring(0, 50) + '...' : 'none'
    });

    // For handwriting mode, we'll use the HTML rendering approach below
    // with handwriting fonts + proper LaTeX rendering (not handwritten.js)
    // This gives us the best of both worlds: handwritten style + beautiful math

    // Initialize markdown-it
    const md = new MarkdownIt({
      html: true,
      breaks: true,
      typographer: true
    });

    // Convert LaTeX to KaTeX HTML
    const processLatex = (content: string): string => {
      // Process display math ($$...$$) - handle multiline
      content = content.replace(/\$\$([\s\S]*?)\$\$/g, (match, latex) => {
        try {
          return '<div class="math-display">' + katex.renderToString(latex.trim(), {
            displayMode: true,
            throwOnError: false,
            output: 'html'
          }) + '</div>';
        } catch (e) {
          console.error('KaTeX display math error:', e);
          return `<div class="math-error">${match}</div>`;
        }
      });

      // Process inline math ($...$) - but not already processed display math
      content = content.replace(/\$([^\$\n]+?)\$/g, (match, latex) => {
        try {
          return katex.renderToString(latex.trim(), {
            displayMode: false,
            throwOnError: false,
            output: 'html'
          });
        } catch (e) {
          console.error('KaTeX inline math error:', e);
          return `<span class="math-error">${match}</span>`;
        }
      });

      return content;
    };

    // Process markdown with LaTeX
    const processedContent = processLatex(markdownContent);
    const htmlContent = md.render(processedContent);

    // Determine font and background based on handwriting settings
    const fontFamily = this.useHandwriting
      ? `'${this.handwritingFont}', cursive`
      : `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`;

    const googleFontsUrl = this.useHandwriting
      ? `https://fonts.googleapis.com/css2?family=${this.handwritingFont.replace(/ /g, '+')}:wght@400;700&display=swap`
      : '';

    // Get paper background from user settings
    const paperBackground = this.getPaperBackground();

    // Create HTML with KaTeX CSS and proper styling
    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  ${googleFontsUrl ? `<link rel="stylesheet" href="${googleFontsUrl}">` : ''}
  <style>
    body {
      font-family: ${fontFamily};
      line-height: ${this.useHandwriting ? '2.2' : '1.6'};
      color: ${this.useHandwriting ? this.handwritingColor : '#333'};
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      ${paperBackground}
      font-weight: ${this.useHandwriting ? '400' : 'normal'};
      position: relative;
    }
    ${this.useHandwriting ? `
    /* Faded ink bleed effect with more variation */
    body::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background:
        /* Ink bleeds */
        radial-gradient(circle at 18% 28%, rgba(52, 73, 94, 0.04) 0%, transparent 45%),
        radial-gradient(circle at 65% 55%, rgba(52, 73, 94, 0.05) 0%, transparent 38%),
        radial-gradient(circle at 42% 78%, rgba(52, 73, 94, 0.03) 0%, transparent 32%),
        radial-gradient(circle at 88% 35%, rgba(52, 73, 94, 0.035) 0%, transparent 28%);
      pointer-events: none;
      z-index: 1;
      filter: blur(0.5px);
    }
    /* Enhanced margin doodles and scribbles */
    body::after {
      content: '~ ✓ ★ ⟿ ◯ ✗';
      position: absolute;
      top: 45px;
      right: 25px;
      font-size: 13px;
      color: rgba(65, 65, 65, 0.28);
      transform: rotate(-12deg);
      letter-spacing: 6px;
      pointer-events: none;
      z-index: 1;
      text-shadow: 0.5px 0.5px 1px rgba(0,0,0,0.05);
    }
    ` : ''}
    h1 {
      color: ${this.useHandwriting ? '#3d4f5c' : '#2c3e50'};
      border-bottom: ${this.useHandwriting ? '2px solid rgba(52, 152, 219, 0.6)' : '3px solid #3498db'};
      padding-bottom: 10px;
      font-size: ${this.useHandwriting ? `${this.fontSize * 1.78}px` : '28px'};
      ${this.useHandwriting ? `
      transform: rotate(-0.3deg);
      text-shadow: 1px 1px 2px rgba(0,0,0,0.05);
      letter-spacing: 0.02em;
      position: relative;
      filter: contrast(0.98) brightness(1.02);
      ` : ''}
    }
    ${this.useHandwriting ? `
    /* Add hand-drawn underline effect to h1 */
    h1::after {
      content: '';
      position: absolute;
      bottom: 8px;
      left: 0;
      width: 30%;
      height: 2px;
      background: rgba(52, 152, 219, 0.4);
      transform: rotate(-0.5deg);
      border-radius: 50%;
    }
    /* Scribbles near h1 */
    h1::before {
      content: '~ ∼ ≈';
      position: absolute;
      bottom: -12px;
      left: -30px;
      font-size: 11px;
      color: rgba(70, 70, 70, 0.22);
      transform: rotate(5deg);
      letter-spacing: 4px;
    }
    ` : ''}
    h2 {
      color: ${this.useHandwriting ? '#4a5568' : '#34495e'};
      margin-top: 30px;
      font-size: ${this.useHandwriting ? `${this.fontSize * 1.44}px` : '22px'};
      border-bottom: ${this.useHandwriting ? '1px dashed rgba(236, 240, 241, 0.5)' : '2px solid #ecf0f1'};
      padding-bottom: 8px;
      ${this.useHandwriting ? `
      transform: rotate(0.2deg);
      letter-spacing: 0.015em;
      position: relative;
      filter: contrast(0.97);
      ` : ''}
    }
    ${this.useHandwriting ? `
    /* Margin note for h2 */
    h2::before {
      content: '→';
      position: absolute;
      left: -25px;
      color: rgba(80, 80, 80, 0.3);
      font-size: 16px;
      transform: rotate(-5deg);
    }
    /* Additional doodles on certain h2 */
    h2:nth-of-type(3)::after {
      content: '✧';
      position: absolute;
      right: -20px;
      top: 2px;
      color: rgba(80, 80, 80, 0.25);
      font-size: 14px;
      transform: rotate(-8deg);
    }
    ` : ''}
    h3 {
      color: ${this.useHandwriting ? '#525f6f' : '#34495e'};
      font-size: ${this.useHandwriting ? `${this.fontSize * 1.22}px` : '18px'};
      margin-top: 20px;
      ${this.useHandwriting ? `
      transform: rotate(-0.1deg);
      letter-spacing: 0.01em;
      filter: contrast(0.96) brightness(1.01);
      position: relative;
      ` : ''}
    }
    ${this.useHandwriting ? `
    /* Random doodles on h3 */
    h3:nth-of-type(2)::before {
      content: '◦';
      position: absolute;
      left: -18px;
      color: rgba(75, 75, 75, 0.3);
      font-size: 10px;
    }
    ` : ''}
    p, li {
      font-size: ${this.useHandwriting ? `${this.fontSize}px` : '16px'};
      ${this.useHandwriting ? `
      opacity: 0.91;
      color: rgba(58, 58, 58, 0.93);
      text-shadow: 0.5px 0.5px 1px rgba(0,0,0,0.03);
      letter-spacing: 0.005em;
      word-spacing: 0.08em;
      filter: contrast(0.95);
      position: relative;
      /* Simulate pencil pressure variations through subtle spacing */
      line-height: 2.25;
      ` : ''}
    }
    ${this.useHandwriting ? `
    /* Add ink bleed effect to certain words */
    strong, b {
      filter: contrast(0.98) brightness(0.98);
      text-shadow: 0.3px 0.3px 0.8px rgba(0,0,0,0.08);
      letter-spacing: 0.008em;
    }
    em, i {
      opacity: 0.88;
      color: rgba(55, 55, 55, 0.90);
    }
    ` : ''}
    ${this.useHandwriting ? `
    /* Uneven text with more variation */
    p:nth-child(4n+1) {
      transform: rotate(0.15deg);
      opacity: 0.89;
    }
    p:nth-child(4n+2) {
      transform: rotate(-0.2deg);
      opacity: 0.92;
    }
    p:nth-child(4n+3) {
      transform: rotate(0.08deg);
      opacity: 0.90;
    }
    p:nth-child(4n) {
      transform: rotate(-0.12deg);
      opacity: 0.93;
    }
    /* Faded and smudged text for lists */
    li:nth-child(3n+1) {
      opacity: 0.87;
      filter: blur(0.15px);
    }
    li:nth-child(3n+2) {
      opacity: 0.91;
    }
    li:nth-child(3n) {
      opacity: 0.89;
      filter: contrast(0.93);
    }
    /* Random pencil marks and margin annotations on paragraphs */
    p:nth-of-type(5)::before {
      content: '✓';
      position: absolute;
      left: -20px;
      color: rgba(90, 90, 90, 0.25);
      font-size: 14px;
      transform: rotate(-8deg);
    }
    p:nth-of-type(9)::before {
      content: '!';
      position: absolute;
      left: -18px;
      color: rgba(85, 85, 85, 0.28);
      font-size: 13px;
      transform: rotate(5deg);
    }
    p:nth-of-type(13)::before {
      content: '★';
      position: absolute;
      left: -22px;
      color: rgba(95, 95, 95, 0.22);
      font-size: 12px;
      transform: rotate(-12deg);
    }
    /* Pencil pressure effects - darker/lighter text */
    p:nth-of-type(6n+1) {
      color: rgba(50, 50, 50, 0.95);
      filter: contrast(1.02);
    }
    p:nth-of-type(6n+3) {
      color: rgba(65, 65, 65, 0.86);
      filter: contrast(0.94) brightness(1.03);
    }
    p:nth-of-type(6n+5) {
      color: rgba(58, 58, 58, 0.90);
      filter: contrast(0.97) blur(0.18px);
    }
    /* Random ink spots and bleed on specific elements */
    p:nth-of-type(7)::after {
      content: '';
      position: absolute;
      top: 8px;
      right: -15px;
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: rgba(80, 80, 80, 0.15);
      box-shadow: 1px 1px 2px rgba(0,0,0,0.05);
    }
    ` : ''}
    .math-display {
      margin: 20px 0;
      text-align: center;
      font-size: ${this.useHandwriting ? `${this.fontSize * 1.4}px` : '1.2em'};
      padding: ${this.useHandwriting ? '10px' : '0'};
      ${this.useHandwriting ? `
      transform: rotate(0.2deg);
      opacity: 0.94;
      color: rgba(45, 55, 65, 0.92);
      ` : ''}
    }
    .katex {
      font-size: ${this.useHandwriting ? `${this.fontSize * 1.2}px` : '1.1em'};
      ${this.useHandwriting
        ? `font-family: '${this.handwritingFont}', cursive !important;
           color: rgba(40, 50, 60, 0.9) !important;`
        : `font-family: 'KaTeX_Main', 'Times New Roman', serif !important;`
      }
    }
    /* Apply handwriting font to all KaTeX math elements when handwriting is enabled */
    ${this.useHandwriting ? `
    .katex, .katex-html, .katex * {
      font-family: '${this.handwritingFont}', cursive !important;
      font-style: normal !important;
      color: rgba(40, 50, 60, 0.88) !important;
      position: relative;
    }
    .katex .mord, .katex .mbin, .katex .mrel, .katex .mop,
    .katex .mopen, .katex .mclose, .katex .mpunct, .katex .minner {
      font-family: '${this.handwritingFont}', cursive !important;
    }
    /* Slight variations in math rendering with ink effects */
    .math-display:nth-of-type(odd) .katex {
      opacity: 0.90;
      filter: contrast(0.96);
    }
    .math-display:nth-of-type(even) .katex {
      opacity: 0.93;
      filter: contrast(0.94) blur(0.12px);
    }
    .math-display:nth-of-type(3n+1) {
      transform: rotate(0.18deg);
    }
    .math-display:nth-of-type(3n+2) {
      transform: rotate(-0.15deg);
    }
    /* Add small ink spots near equations */
    .math-display:nth-of-type(4)::before {
      content: '·';
      position: absolute;
      left: -10px;
      top: 50%;
      color: rgba(80, 80, 80, 0.2);
      font-size: 20px;
    }
    ` : ''}
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th {
      background-color: #3498db;
      color: white;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background-color: ${this.useHandwriting ? 'rgba(249, 249, 249, 0.3)' : '#f9f9f9'};
    }
    code {
      background-color: ${this.useHandwriting ? 'rgba(244, 244, 244, 0.4)' : '#f4f4f4'};
      padding: 2px 6px;
      border-radius: 3px;
      font-family: ${this.useHandwriting ? `'${this.handwritingFont}', 'Courier New', monospace` : `'Courier New', monospace`};
      font-size: 0.9em;
      ${this.useHandwriting ? `
      opacity: 0.9;
      color: rgba(60, 60, 60, 0.88);
      filter: contrast(0.96);
      border: 1px solid rgba(200, 200, 200, 0.3);
      ` : ''}
    }
    pre {
      background-color: ${this.useHandwriting ? 'rgba(244, 244, 244, 0.3)' : '#f4f4f4'};
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      border-left: ${this.useHandwriting ? '3px dashed rgba(52, 152, 219, 0.5)' : '4px solid #3498db'};
      ${this.useHandwriting ? `
      transform: rotate(-0.2deg);
      opacity: 0.92;
      position: relative;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
      ` : ''}
    }
    ${this.useHandwriting ? `
    /* Add corner fold effect to code blocks */
    pre::after {
      content: '';
      position: absolute;
      top: 8px;
      right: 8px;
      width: 0;
      height: 0;
      border-left: 10px solid transparent;
      border-top: 10px solid rgba(150, 150, 150, 0.15);
    }
    ` : ''}
    pre code {
      background: none;
      padding: 0;
    }
    blockquote {
      border-left: ${this.useHandwriting ? '3px dashed rgba(52, 152, 219, 0.6)' : '4px solid #3498db'};
      padding-left: 20px;
      margin-left: 0;
      color: #555;
      font-style: italic;
      ${this.useHandwriting ? `
      opacity: 0.89;
      background: rgba(250, 250, 250, 0.3);
      padding: 12px 20px;
      transform: rotate(-0.3deg);
      position: relative;
      ` : ''}
    }
    ${this.useHandwriting ? `
    /* Add quotation mark */
    blockquote::before {
      content: '"';
      position: absolute;
      left: 2px;
      top: -5px;
      font-size: 28px;
      color: rgba(52, 152, 219, 0.3);
      font-family: Georgia, serif;
    }
    ` : ''}
    ul, ol {
      padding-left: 30px;
      ${this.useHandwriting ? 'position: relative;' : ''}
    }
    li {
      margin: 8px 0;
      ${this.useHandwriting ? `
      position: relative;
      padding-left: 5px;
      ` : ''}
    }
    ${this.useHandwriting ? `
    /* Hand-drawn bullet points with variations */
    ul li::marker {
      content: '◦';
      color: rgba(70, 70, 70, 0.6);
    }
    ul li:nth-of-type(3n+1)::marker {
      content: '•';
      color: rgba(75, 75, 75, 0.55);
    }
    ul li:nth-of-type(3n+2)::marker {
      content: '∘';
      color: rgba(65, 65, 65, 0.65);
    }
    /* Random underlines for emphasis on multiple items */
    li:nth-of-type(7)::after,
    li:nth-of-type(11)::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      width: 40%;
      height: 1px;
      background: rgba(80, 80, 80, 0.25);
      transform: rotate(-0.8deg);
    }
    li:nth-of-type(11)::after {
      width: 55%;
      transform: rotate(0.6deg);
      background: rgba(75, 75, 75, 0.22);
    }
    /* Margin doodles on various list items */
    li:nth-of-type(4)::before {
      content: '*';
      position: absolute;
      left: -20px;
      color: rgba(85, 85, 85, 0.3);
      font-size: 12px;
      transform: rotate(-15deg);
    }
    li:nth-of-type(8)::before {
      content: '✓';
      position: absolute;
      left: -22px;
      color: rgba(90, 90, 90, 0.28);
      font-size: 11px;
      transform: rotate(8deg);
    }
    li:nth-of-type(12)::before {
      content: '→';
      position: absolute;
      left: -25px;
      color: rgba(80, 80, 80, 0.25);
      font-size: 13px;
    }
    ` : ''}
    hr {
      border: none;
      border-top: 2px solid #ecf0f1;
      margin: 30px 0;
    }
    .math-error {
      color: #e74c3c;
      background-color: #fadbd8;
      padding: 2px 5px;
      border-radius: 3px;
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>
    `;

    // Create a hidden browser window to render the HTML
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        offscreen: true
      }
    });

    // Load the HTML content
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(fullHtml));

    // Wait for fonts to load if using handwriting
    if (this.useHandwriting) {
      // Execute script to check when fonts are loaded
      await win.webContents.executeJavaScript(`
        document.fonts.ready.then(() => {
          console.log('Fonts loaded');
        });
      `);
      // Give extra time for Google Fonts to load
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      // Normal wait time for non-handwriting PDFs
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Generate PDF
    const pdfData = await win.webContents.printToPDF({
      printBackground: true,
      marginsType: 0,
      pageSize: 'A4',
      landscape: false
    });

    // Save PDF
    fs.writeFileSync(pdfPath, pdfData);

    // Close the window
    win.close();
  }

  private async renderMarkdownToPdf(doc: any, markdown: string): Promise<void> {
    const lines = markdown.split('\n');
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let codeLanguage = '';
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];

    for (const line of lines) {
      // Check for table lines
      if (line.includes('|') && !inCodeBlock) {
        const cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0);

        if (cells.every(c => c.match(/^-+$/))) {
          // Separator row - table headers are set
          inTable = true;
          continue;
        } else if (cells.length > 0) {
          if (!inTable) {
            // First row - these are headers
            tableHeaders = cells;
          } else {
            // Data row
            tableRows.push(cells);
          }
          continue;
        }
      } else if (inTable && line.trim() === '') {
        // End of table - render it
        this.renderTable(doc, tableHeaders, tableRows);
        inTable = false;
        tableHeaders = [];
        tableRows = [];
        doc.moveDown();
        continue;
      }

      // Check for code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          // End of code block - render it
          doc.fontSize(9)
             .font('Courier')
             .fillColor('#2d2d2d')
             .text(codeBlockContent.join('\n'), {
               indent: 20,
               width: 475
             });
          doc.moveDown();
          codeBlockContent = [];
          inCodeBlock = false;
          codeLanguage = '';
        } else {
          // Start of code block
          inCodeBlock = true;
          codeLanguage = line.substring(3).trim();
          if (codeLanguage) {
            doc.fontSize(10).font('Helvetica-Bold').fillColor('#666666').text(`[${codeLanguage}]`, { indent: 20 });
          }
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // Handle headers
      if (line.startsWith('# ')) {
        doc.fontSize(22).font('Helvetica-Bold').fillColor('#000000').text(line.substring(2));
        doc.moveDown(0.5);
      } else if (line.startsWith('## ')) {
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#000000').text(line.substring(3));
        doc.moveDown(0.5);
      } else if (line.startsWith('### ')) {
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000').text(line.substring(4));
        doc.moveDown(0.5);
      }
      // Handle bold text with **
      else if (line.includes('**') && !line.startsWith('**') && !line.endsWith('**')) {
        const parts = line.split('**');
        let currentX = doc.x;
        for (let i = 0; i < parts.length; i++) {
          if (i % 2 === 0) {
            doc.fontSize(11).font('Helvetica').fillColor('#000000').text(parts[i], currentX, doc.y, { continued: i < parts.length - 1, lineBreak: false });
          } else {
            doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text(parts[i], { continued: i < parts.length - 1, lineBreak: false });
          }
        }
        doc.text(''); // Move to next line
        doc.moveDown(0.3);
      }
      // Bold section headers (line starts and ends with **)
      else if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
        const headerText = line.replace(/\*\*/g, '');
        doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a1a1a').text(headerText);
        doc.moveDown(0.5);
      }
      // Handle display math ($$...$$)
      else if (line.trim().startsWith('$$') && line.trim().endsWith('$$')) {
        const mathContent = line.replace(/\$\$/g, '').trim();
        doc.fontSize(12).font('Courier').fillColor('#000080').text(mathContent, {
          align: 'center',
          width: 475
        });
        doc.moveDown(0.8);
      }
      // Handle lines with inline math ($...$) - render with mixed fonts
      else if (line.includes('$') && !line.includes('$$')) {
        const parts = line.split('$');
        let currentX = doc.x;
        for (let i = 0; i < parts.length; i++) {
          if (i % 2 === 0) {
            // Regular text
            doc.fontSize(11).font('Helvetica').fillColor('#000000').text(parts[i], currentX, doc.y, { continued: i < parts.length - 1, lineBreak: false });
          } else {
            // Math content
            doc.fontSize(11).font('Courier').fillColor('#1a1a1a').text(parts[i], { continued: i < parts.length - 1, lineBreak: false });
          }
        }
        doc.text(''); // Move to next line
        doc.moveDown(0.3);
      }
      // Handle horizontal rule
      else if (line.trim() === '---') {
        doc.moveDown(0.5);
        doc.moveTo(60, doc.y).lineTo(535, doc.y).stroke('#cccccc');
        doc.moveDown(0.5);
      }
      // Handle bullet points
      else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        doc.fontSize(11).font('Helvetica').fillColor('#000000').text('• ' + line.trim().substring(2), { indent: 20 });
        doc.moveDown(0.3);
      }
      // Handle numbered/ordered lists
      else if (line.trim().match(/^\d+\.\s/)) {
        doc.fontSize(11).font('Helvetica').fillColor('#000000').text(line.trim(), { indent: 20 });
        doc.moveDown(0.3);
      }
      // Handle blockquotes
      else if (line.trim().startsWith('> ')) {
        doc.fontSize(10).font('Helvetica-Oblique').fillColor('#666666').text(line.trim().substring(2), {
          indent: 30,
          width: 450
        });
        doc.moveDown(0.4);
      }
      // Handle lines with italic text (*)
      else if (line.includes('*') && !line.includes('**')) {
        const parts = line.split('*');
        for (let i = 0; i < parts.length; i++) {
          if (i % 2 === 0) {
            doc.fontSize(11).font('Helvetica').fillColor('#000000').text(parts[i], { continued: i < parts.length - 1, lineBreak: false });
          } else {
            doc.fontSize(11).font('Helvetica-Oblique').fillColor('#000000').text(parts[i], { continued: i < parts.length - 1, lineBreak: false });
          }
        }
        doc.text('');
        doc.moveDown(0.3);
      }
      // Empty line
      else if (line.trim() === '') {
        doc.moveDown(0.4);
      }
      // Step labels or important lines
      else if (line.trim().startsWith('Step ') || line.trim().match(/^[a-z]\./i)) {
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#2d2d2d').text(line);
        doc.moveDown(0.4);
      }
      // Regular text
      else {
        doc.fontSize(11).font('Helvetica').fillColor('#000000').text(line);
        doc.moveDown(0.3);
      }
    }

    // Render any remaining table
    if (inTable && tableHeaders.length > 0) {
      this.renderTable(doc, tableHeaders, tableRows);
    }
  }

  private renderTable(doc: any, headers: string[], rows: string[][]): void {
    const colWidth = (475 - 40) / headers.length; // Available width divided by columns
    const startX = 70;
    let currentY = doc.y;

    // Draw headers
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000');
    headers.forEach((header, i) => {
      doc.text(header, startX + (i * colWidth), currentY, {
        width: colWidth - 10,
        align: 'left'
      });
    });

    currentY += 20;

    // Draw separator line
    doc.moveTo(startX, currentY).lineTo(startX + (colWidth * headers.length), currentY).stroke('#cccccc');
    currentY += 10;

    // Draw rows
    doc.fontSize(10).font('Helvetica').fillColor('#000000');
    rows.forEach(row => {
      const rowStartY = currentY;
      row.forEach((cell, i) => {
        doc.text(cell, startX + (i * colWidth), currentY, {
          width: colWidth - 10,
          align: 'left'
        });
      });
      currentY += 20;
    });

    doc.y = currentY;
    doc.moveDown(0.5);
  }

  private async saveAsDocx(assignment: Assignment, solution: string, category: string, filePath: string): Promise<void> {
    const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } = require('docx');

    // Helper function to convert LaTeX to readable format with Unicode math symbols
    const cleanLatex = (latex: string): string => {
      // Remove $ and $$ delimiters
      let cleaned = latex.replace(/\$\$/g, '').replace(/\$/g, '');

      // Convert common LaTeX commands to Unicode symbols
      const conversions: { [key: string]: string } = {
        '\\mathcal{L}': '𝓛', '\\mathcal{F}': '𝓕',
        '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
        '\\pi': 'π', '\\theta': 'θ', '\\lambda': 'λ', '\\mu': 'μ',
        '\\sigma': 'σ', '\\tau': 'τ', '\\phi': 'φ', '\\omega': 'ω',
        '\\infty': '∞', '\\int': '∫', '\\sum': '∑', '\\prod': '∏',
        '\\partial': '∂', '\\nabla': '∇', '\\pm': '±', '\\times': '×',
        '\\div': '÷', '\\neq': '≠', '\\leq': '≤', '\\geq': '≥',
        '\\approx': '≈', '\\equiv': '≡', '\\in': '∈', '\\subset': '⊂',
        '\\cup': '∪', '\\cap': '∩', '\\emptyset': '∅',
        '\\rightarrow': '→', '\\leftarrow': '←', '\\Rightarrow': '⇒',
        '\\sqrt': '√', '\\cdot': '·', '\\ldots': '…',
        '\\sin': 'sin', '\\cos': 'cos', '\\tan': 'tan',
        '\\sinh': 'sinh', '\\cosh': 'cosh'
      };

      // Apply symbol conversions
      for (const [latexCmd, unicode] of Object.entries(conversions)) {
        cleaned = cleaned.replace(new RegExp(latexCmd.replace(/\\/g, '\\\\'), 'g'), unicode);
      }

      // Handle \frac{numerator}{denominator} - convert to numerator/denominator
      cleaned = cleaned.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');

      // Handle \bigg| and similar sizing commands (just remove them)
      cleaned = cleaned.replace(/\\bigg\|/g, '|');
      cleaned = cleaned.replace(/\\big\|/g, '|');
      cleaned = cleaned.replace(/\\Big/g, '');
      cleaned = cleaned.replace(/\\bigg/g, '');
      cleaned = cleaned.replace(/\\big/g, '');

      // Clean up remaining braces from LaTeX commands (but keep mathematical braces)
      // Only remove braces that immediately follow LaTeX command patterns
      cleaned = cleaned.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1');

      // Remove any remaining backslashes before letters (leftover LaTeX commands)
      cleaned = cleaned.replace(/\\([a-zA-Z]+)/g, '$1');

      return cleaned;
    };

    // Helper function to parse and format lines with mixed text and LaTeX
    const parseLine = (line: string) => {
      const parts: any[] = [];
      let currentPos = 0;

      // Find all LaTeX expressions (both $...$ and $$...$$)
      const latexRegex = /(\$\$[^$]+\$\$|\$[^$]+\$)/g;
      let match;

      while ((match = latexRegex.exec(line)) !== null) {
        // Add text before LaTeX
        if (match.index > currentPos) {
          const textBefore = line.substring(currentPos, match.index);
          if (textBefore) {
            parts.push({
              type: 'text',
              content: textBefore
            });
          }
        }

        // Add LaTeX content
        const isDisplay = match[0].startsWith('$$');
        parts.push({
          type: 'latex',
          content: match[0],
          isDisplay
        });

        currentPos = match.index + match[0].length;
      }

      // Add remaining text
      if (currentPos < line.length) {
        const textAfter = line.substring(currentPos);
        if (textAfter) {
          parts.push({
            type: 'text',
            content: textAfter
          });
        }
      }

      return parts.length > 0 ? parts : [{ type: 'text', content: line }];
    };

    // Process solution to format mathematical content better
    const contentParagraphs = solution.split('\n').map(line => {
      // Check if line contains LaTeX notation
      const hasDisplayLatex = /\$\$[^$]+\$\$/.test(line);
      const hasInlineLatex = /\$[^$]+\$/.test(line) && !hasDisplayLatex;
      const hasLatex = hasDisplayLatex || hasInlineLatex;

      // Check if line is a list item
      const isListItem = line.trim().startsWith('*') || line.trim().startsWith('-') || line.trim().startsWith('•');

      // Check if line is a bold heading
      const isBoldHeading = line.trim().startsWith('**') && line.trim().endsWith('**');

      if (isBoldHeading) {
        // Bold headings
        const boldText = line.replace(/\*\*/g, '');
        return new Paragraph({
          children: [
            new TextRun({
              text: boldText,
              bold: true,
              size: 28,
              color: '2e2e2e',
            }),
          ],
          spacing: {
            before: 240,
            after: 120,
          },
        });
      } else if (hasDisplayLatex && !hasInlineLatex) {
        // Pure display math line (only $$...$$) - centered, larger font
        const cleanedLine = cleanLatex(line.trim());
        return new Paragraph({
          children: [
            new TextRun({
              text: cleanedLine,
              font: 'Cambria Math',
              size: 28,
              color: '000080',
            }),
          ],
          spacing: {
            before: 240,
            after: 240,
          },
          alignment: AlignmentType.CENTER,
        });
      } else if (hasLatex) {
        // Mixed content with LaTeX - parse and format each part
        const parts = parseLine(line);
        const children = parts.map(part => {
          if (part.type === 'latex') {
            return new TextRun({
              text: cleanLatex(part.content),
              font: 'Cambria Math',
              size: part.isDisplay ? 26 : 24,
              color: '1a1a1a',
              italics: false,
            });
          } else {
            return new TextRun({
              text: part.content,
              font: 'Calibri',
              size: 22,
            });
          }
        });

        return new Paragraph({
          children,
          spacing: {
            before: 160,
            after: 160,
          },
          indent: {
            left: 360,
          },
        });
      } else if (isListItem) {
        // List items with better formatting
        return new Paragraph({
          children: [
            new TextRun({
              text: line,
              font: 'Calibri',
              size: 22,
            }),
          ],
          spacing: {
            before: 120,
            after: 120,
          },
          indent: {
            left: 360,
          },
        });
      } else if (line.trim() === '') {
        // Empty line
        return new Paragraph({ text: '' });
      } else {
        // Regular text - check if it has special formatting
        if (line.trim().startsWith('Step ') || line.trim().match(/^[a-z]\./i)) {
          // Step labels or problem parts - slightly bolder
          return new Paragraph({
            children: [
              new TextRun({
                text: line,
                font: 'Calibri',
                size: 22,
                bold: true,
              }),
            ],
            spacing: {
              before: 180,
              after: 100,
            },
          });
        } else {
          // Regular text
          return new Paragraph({
            children: [
              new TextRun({
                text: line,
                font: 'Calibri',
                size: 22,
              }),
            ],
            spacing: {
              before: 100,
              after: 100,
            },
          });
        }
      }
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: assignment.name,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Course: `,
                bold: true,
              }),
              new TextRun(assignment.courseName),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Due Date: `,
                bold: true,
              }),
              new TextRun(new Date(assignment.dueDate).toLocaleDateString()),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Category: `,
                bold: true,
              }),
              new TextRun(category),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated: `,
                bold: true,
              }),
              new TextRun(new Date().toLocaleString()),
            ],
          }),
          new Paragraph({ text: '' }), // Empty line
          new Paragraph({
            text: 'Solution:',
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({ text: '' }), // Empty line
          ...contentParagraphs,
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(filePath, buffer);
  }
}
