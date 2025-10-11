# Subject Formatting Preferences

## Overview

The LMS Center now supports saving formatting preferences for specific subjects/courses. This allows you to customize how the AI generates solutions for different courses, ensuring consistency across all assignments from the same subject.

## Features

### 1. **Per-Subject Configuration**
- Save formatting preferences specific to each course
- Automatically applies saved preferences to all assignments from that course
- Override automatic category detection with manual settings

### 2. **LaTeX Control for Math Assignments**
- Choose between LaTeX notation ($$...$$) or plain text formatting
- Perfect for courses that require specific mathematical notation styles
- Ensures consistent formatting across all math assignments

### 3. **Custom Instructions**
- Add custom prompt instructions for specific subjects
- Tailorformatting rules, solution style, or any special requirements
- Instructions are automatically included when solving assignments

## How to Use

### Using the GeminiService API

```typescript
import { GeminiService } from './services/geminiService';
import { SubjectFormattingPreference } from './types/assignment';

const geminiService = new GeminiService(apiKey, modelName);

// Check if preferences exist for a subject
if (geminiService.shouldPromptForPreferences(assignment)) {
  // Prompt user for preferences
  const preference: SubjectFormattingPreference = {
    courseName: assignment.courseName,
    category: 'math',  // 'math' | 'coding' | 'writing' | 'other'
    useLatex: true,    // true for LaTeX, false for plain text
    customPromptInstructions: 'Use detailed step-by-step explanations'
  };

  geminiService.saveSubjectPreference(preference);
}

// Or create from assignment automatically
const preference = geminiService.createPreferenceFromAssignment(
  assignment,
  true,  // useLatex
  'Show all intermediate steps'  // custom instructions
);
geminiService.saveSubjectPreference(preference);
```

### Managing Preferences

```typescript
// Get preference for a specific course
const pref = geminiService.getSubjectPreference('Mathematics for Engineers');

// Get all saved preferences
const allPrefs = geminiService.getAllSubjectPreferences();

// Delete a preference
geminiService.deleteSubjectPreference('Mathematics for Engineers');
```

## Preference Options

### SubjectFormattingPreference Interface

```typescript
interface SubjectFormattingPreference {
  courseName: string;                    // Exact course name
  category: 'math' | 'coding' | 'writing' | 'other';
  useLatex: boolean;                     // Use LaTeX notation (primarily for math)
  customPromptInstructions?: string;     // Optional custom instructions
}
```

### Category Options

- **math**: For mathematics, calculus, algebra, etc.
  - `useLatex: true` → Uses LaTeX notation ($$\frac{n!}{s^{n+1}}$$)
  - `useLatex: false` → Uses plain text notation (n! / s^(n+1))

- **coding**: For programming assignments
  - Generates student-like code with simple variable names
  - Minimal comments, straightforward logic

- **writing**: For essays, reports, compositions
  - Generates comprehensive written content

- **other**: For general assignments
  - Generic solution format

### Custom Instructions

Add any special requirements for the subject:

```typescript
customPromptInstructions: `
- Always include units in final answers
- Show dimensional analysis
- Reference relevant physics principles
`
```

## Storage

Preferences are stored in: `{userData}/subject-preferences.json`

Format:
```json
[
  {
    "courseName": "Mathematics for Engineers and Scientists 4",
    "category": "math",
    "useLatex": true,
    "customPromptInstructions": "Use Laplace transform notation with proper mathematical formatting"
  },
  {
    "courseName": "Introduction to Programming",
    "category": "coding",
    "useLatex": false,
    "customPromptInstructions": "Include example test cases with each solution"
  }
]
```

## Example Workflow

1. **First Assignment from a Course**:
   ```typescript
   // Check if we need to ask user for preferences
   if (geminiService.shouldPromptForPreferences(assignment)) {
     // Show dialog to user asking about formatting preferences
     // - What category is this? (auto-detected: Math)
     // - Use LaTeX notation? (recommended for math)
     // - Any custom instructions?

     const userPreference = showPreferenceDialog(assignment);
     geminiService.saveSubjectPreference(userPreference);
   }

   // Solve assignment (will use saved preferences)
   const solution = await geminiService.solveAssignment(assignment);
   ```

2. **Subsequent Assignments**:
   ```typescript
   // Preferences are automatically loaded and applied
   const solution = await geminiService.solveAssignment(assignment);
   // Uses saved LaTeX setting and custom instructions
   ```

## Benefits

- **Consistency**: All assignments from the same course use the same formatting
- **Efficiency**: Set preferences once, use for all future assignments
- **Customization**: Tailor AI behavior to match course requirements
- **Flexibility**: Change preferences anytime by saving new settings

## Notes

- Preferences are matched by exact course name
- The first assignment from a new course is a good time to set preferences
- LaTeX formatting is automatically used for detected math assignments unless overridden
- Custom instructions are appended to the standard prompts
