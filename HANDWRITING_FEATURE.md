# Handwriting Feature Documentation

## Overview

The LMS Center now includes a powerful handwriting feature that allows students to write solutions directly within the app using a digital canvas. Solutions can be saved as PNG images or PDF files and automatically organized in assignment folders.

## Technology Stack

### Core Libraries

1. **signature_pad** (v5.1.1)
   - Smooth signature drawing with Bézier curve interpolation
   - Touch and mouse support
   - Responsive canvas
   - 23k+ GitHub stars

2. **jsPDF** (v3.0.3)
   - Client-side PDF generation
   - Image embedding support
   - A4 page formatting
   - 28k+ GitHub stars

## Features

### 1. Interactive Drawing Canvas
- **Smooth Drawing**: Uses Bézier curves for natural handwriting feel
- **Customizable Pen**:
  - Color picker for pen color
  - Adjustable pen size (1-10px)
  - Real-time pen size preview
- **Canvas Controls**:
  - Clear button to reset canvas
  - Undo button to remove last stroke
  - White background for clarity

### 2. Multiple Export Formats

#### PNG Export
- High-quality raster image
- Preserves exact drawing appearance
- Saved in `Handwriting` subfolder within assignment directory
- Filename format: `handwriting_YYYY-MM-DDTHH-MM-SS.png`

#### PDF Export
- Professional document format
- Includes assignment metadata header:
  - Assignment name
  - Course name
  - Generation date
- Image centered on A4 page with proper scaling
- Filename format: `handwriting_[AssignmentName]_YYYY-MM-DD.pdf`

### 3. File Organization
```
Downloads/
└── [CourseName]/
    └── [AssignmentName]/
        └── Handwriting/
            ├── handwriting_2025-01-14T10-30-45.png
            ├── handwriting_2025-01-14T10-35-20.png
            └── handwriting_Assignment1_2025-01-14.pdf
```

## User Interface

### Opening the Handwriting Modal

1. Navigate to an assignment
2. Click "Submit Assignment" button
3. Click "✏️ Handwrite Solution" button
4. The handwriting modal opens with a blank canvas

### Handwriting Toolbar

**Left Section:**
- **Pen Color**: Color picker input
- **Pen Size**: Range slider (1-10px) with live value display

**Right Section:**
- **Clear**: Removes all strokes from canvas
- **Undo**: Removes the last stroke

### Canvas
- 800x600px white canvas
- Responsive design (scales on mobile)
- Crosshair cursor for precision
- Touch-enabled for tablets and touch screens

### Footer Actions
- **Cancel**: Close modal without saving
- **Save as Image**: Export as PNG
- **Save as PDF**: Export as PDF with metadata

## Implementation Details

### Backend (Electron Main Process)

**File**: `src/services/handwritingService.ts`

**IPC Handlers**:
- `handwriting:save-image`: Saves canvas as PNG
- `handwriting:save-pdf`: Saves PDF buffer to file
- `handwriting:list-files`: Lists all handwriting files for assignment
- `handwriting:delete-file`: Deletes a handwriting file

**Key Functions**:
```typescript
saveHandwritingImage(data: HandwritingData): Promise<Result>
saveHandwritingPDF(pdfData): Promise<Result>
listHandwritingFiles(courseName, assignmentName): Promise<Result>
deleteHandwritingFile(filePath): Promise<Result>
```

### Frontend (Renderer Process)

**Files**:
- `renderer/handwriting.js`: Core handwriting logic
- `renderer/index.html`: Modal UI structure
- `renderer/styles.css`: Handwriting-specific styles

**Key Functions**:
```javascript
openHandwritingModal(assignment): void
closeHandwritingModal(): void
clearCanvas(): void
undoStroke(): void
saveAsImage(): Promise<void>
saveAsPDF(): Promise<void>
```

### Canvas Initialization

The canvas is initialized with:
- High DPI support (respects devicePixelRatio)
- Automatic resizing on window resize
- SignaturePad configuration:
  - White background
  - Black pen by default
  - Min width: 1px
  - Max width: 2px
  - 60 FPS throttling
  - Velocity filter for smooth lines

## PDF Generation Process

1. Canvas data is converted to PNG data URL
2. jsPDF creates an A4 portrait document
3. Assignment metadata is added as header text:
   - Assignment name (bold, 12pt, centered)
   - Course name (normal, 10pt, centered)
   - Current date (normal, 10pt, centered)
4. Image is scaled to fit page (maintaining aspect ratio)
5. Image is centered on page with 10mm margins
6. PDF is converted to ArrayBuffer
7. Buffer is sent to main process via IPC
8. Main process saves PDF to file system

## Mobile Responsiveness

**Tablet/Mobile Optimizations**:
- Canvas scales to fit screen width
- Toolbar reorganizes to vertical layout
- Touch events supported natively by signature_pad
- Buttons stack vertically in footer
- Increased touch target sizes

**CSS Breakpoints**:
```css
@media (max-width: 768px) {
  /* Tablet layout adjustments */
}
```

## Integration with Assignment Submission

The handwriting feature integrates seamlessly with the existing assignment submission workflow:

1. User clicks "Handwrite Solution" in submission dialog
2. Handwriting modal opens
3. User draws solution
4. User saves as PNG or PDF
5. File is automatically saved in correct assignment folder
6. File can be attached to submission via file browser
7. Assignment list refreshes to show new files

## Future Enhancements

### Potential Improvements:
1. **Text Recognition**: OCR to convert handwriting to text
2. **Multiple Pages**: Support for multi-page handwritten solutions
3. **Import Images**: Allow importing and annotating over existing images
4. **Drawing Tools**: Shapes (lines, circles, rectangles)
5. **Eraser Tool**: Partial erase instead of full clear
6. **Templates**: Pre-defined templates for common assignment types
7. **Cloud Sync**: Sync handwritten notes across devices
8. **Pressure Sensitivity**: Support for stylus pressure on supported devices

## Troubleshooting

### Canvas Not Displaying
**Solution**: Check that signature_pad and jsPDF are installed:
```bash
npm install signature_pad jspdf
```

### Low Quality Output
**Solution**: The canvas automatically accounts for device pixel ratio. For even higher quality, increase canvas dimensions in `handwriting.js`.

### Touch Not Working on Mobile
**Solution**: Ensure `touch-action: none` is set on canvas in CSS (already implemented).

### PDF Not Saving
**Solution**: Check that:
1. PathManager is initialized correctly
2. Download path exists and is writable
3. No file permission issues

## Code Examples

### Opening Handwriting Modal from Assignment Card
```javascript
const assignmentData = {
  id: '123',
  name: 'Assignment 1',
  courseName: 'Computer Science',
  courseId: '456'
};

openHandwritingModal(assignmentData);
```

### Checking for Handwriting Files
```javascript
const result = await window.electronAPI.invoke('handwriting:list-files',
  'Computer Science',
  'Assignment 1'
);

if (result.success) {
  console.log('Handwriting files:', result.files);
}
```

## Performance Considerations

- **Canvas Rendering**: 60 FPS with throttling prevents performance issues
- **Memory Usage**: Canvas cleared after save to free memory
- **File Sizes**:
  - PNG: Typically 50-200 KB depending on drawing complexity
  - PDF: Typically 100-300 KB (includes embedded PNG)

## Browser Compatibility

The handwriting feature works in Electron (Chromium-based) with:
- Full canvas API support
- Touch events
- High DPI displays
- File System Access API (through Electron IPC)

## Security Considerations

- No external API calls (fully offline)
- All data saved locally
- No cloud storage required
- User controls all data

## Conclusion

The handwriting feature provides a complete solution for students who prefer to handwrite their solutions digitally. With smooth drawing, multiple export formats, and seamless integration with the existing LMS Center workflow, it enhances the assignment submission experience significantly.
