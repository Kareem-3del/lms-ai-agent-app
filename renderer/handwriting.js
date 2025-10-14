// Handwriting canvas functionality using signature_pad and jsPDF
const { jsPDF } = require('jspdf');
const SignaturePad = require('signature_pad').default;

// Canvas and signature pad state
let signaturePad = null;
let currentAssignment = null;

/**
 * Initialize the handwriting canvas
 */
function initializeHandwritingCanvas() {
  const canvas = document.getElementById('handwritingCanvas');

  if (!canvas) {
    console.error('Handwriting canvas not found');
    return;
  }

  // Initialize SignaturePad
  signaturePad = new SignaturePad(canvas, {
    backgroundColor: 'rgb(255, 255, 255)',
    penColor: '#000000',
    minWidth: 1,
    maxWidth: 2,
    throttle: 16, // 60fps
    velocityFilterWeight: 0.7
  });

  // Setup pen color and size controls
  setupCanvasControls();

  // Resize canvas to fit container
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

/**
 * Resize canvas to maintain proper dimensions
 */
function resizeCanvas() {
  const canvas = document.getElementById('handwritingCanvas');
  const container = canvas.parentElement;

  if (!canvas || !container) return;

  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const rect = container.getBoundingClientRect();

  // Set canvas dimensions
  canvas.width = rect.width * ratio;
  canvas.height = 600 * ratio;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = '600px';

  const context = canvas.getContext('2d');
  context.scale(ratio, ratio);

  // Restore signature pad after resize
  if (signaturePad) {
    signaturePad.clear();
  }
}

/**
 * Setup canvas controls (pen color, size, etc.)
 */
function setupCanvasControls() {
  const penColorInput = document.getElementById('penColor');
  const penSizeInput = document.getElementById('penSize');
  const penSizeValue = document.getElementById('penSizeValue');

  if (penColorInput) {
    penColorInput.addEventListener('change', (e) => {
      if (signaturePad) {
        signaturePad.penColor = e.target.value;
      }
    });
  }

  if (penSizeInput && penSizeValue) {
    penSizeInput.addEventListener('input', (e) => {
      const size = parseFloat(e.target.value);
      penSizeValue.textContent = size.toFixed(1);

      if (signaturePad) {
        signaturePad.minWidth = size * 0.5;
        signaturePad.maxWidth = size;
      }
    });
  }
}

/**
 * Open handwriting modal for an assignment
 */
function openHandwritingModal(assignment = null) {
  currentAssignment = assignment;

  const modal = document.getElementById('handwritingModal');
  if (modal) {
    modal.classList.remove('hidden');

    // Initialize canvas if not already done
    if (!signaturePad) {
      initializeHandwritingCanvas();
    } else {
      signaturePad.clear();
      resizeCanvas();
    }
  }
}

/**
 * Close handwriting modal
 */
function closeHandwritingModal() {
  const modal = document.getElementById('handwritingModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

/**
 * Clear the canvas
 */
function clearCanvas() {
  if (signaturePad) {
    signaturePad.clear();
  }
}

/**
 * Undo last stroke
 */
function undoStroke() {
  if (signaturePad) {
    const data = signaturePad.toData();
    if (data && data.length > 0) {
      data.pop(); // Remove last stroke
      signaturePad.fromData(data);
    }
  }
}

/**
 * Save canvas as PNG image
 */
async function saveAsImage() {
  if (!signaturePad || signaturePad.isEmpty()) {
    alert('Please draw something first!');
    return;
  }

  if (!currentAssignment) {
    alert('No assignment selected');
    return;
  }

  try {
    // Get canvas data as data URL
    const dataUrl = signaturePad.toDataURL('image/png');
    const canvas = document.getElementById('handwritingCanvas');

    const result = await window.electronAPI.invoke('handwriting:save-image', {
      dataUrl,
      width: canvas.width,
      height: canvas.height,
      assignmentId: currentAssignment.id,
      courseName: currentAssignment.courseName,
      assignmentName: currentAssignment.name
    });

    if (result.success) {
      alert(`Image saved successfully!\n${result.filePath}`);
      closeHandwritingModal();

      // Refresh assignment list to show new file
      if (typeof refreshAssignments === 'function') {
        refreshAssignments();
      }
    } else {
      alert(`Failed to save image: ${result.error}`);
    }
  } catch (error) {
    console.error('Error saving image:', error);
    alert(`Error: ${error.message}`);
  }
}

/**
 * Save canvas as PDF using jsPDF
 */
async function saveAsPDF() {
  if (!signaturePad || signaturePad.isEmpty()) {
    alert('Please draw something first!');
    return;
  }

  if (!currentAssignment) {
    alert('No assignment selected');
    return;
  }

  try {
    // Get canvas as data URL
    const canvas = document.getElementById('handwritingCanvas');
    const imgData = canvas.toDataURL('image/png');

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Calculate dimensions to fit on A4 page
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const availableWidth = pdfWidth - (2 * margin);

    // Calculate image dimensions maintaining aspect ratio
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const aspectRatio = canvasWidth / canvasHeight;

    let imgWidth = availableWidth;
    let imgHeight = imgWidth / aspectRatio;

    // If image is too tall, scale down
    if (imgHeight > (pdfHeight - 2 * margin)) {
      imgHeight = pdfHeight - (2 * margin);
      imgWidth = imgHeight * aspectRatio;
    }

    // Center image on page
    const x = (pdfWidth - imgWidth) / 2;
    const y = margin;

    // Add assignment header
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(currentAssignment.name, pdfWidth / 2, y + 5, { align: 'center' });

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Course: ${currentAssignment.courseName}`, pdfWidth / 2, y + 12, { align: 'center' });
    pdf.text(`Date: ${new Date().toLocaleDateString()}`, pdfWidth / 2, y + 18, { align: 'center' });

    // Add image to PDF
    pdf.addImage(imgData, 'PNG', x, y + 25, imgWidth, imgHeight);

    // Get PDF as array buffer
    const pdfBuffer = pdf.output('arraybuffer');

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `handwriting_${currentAssignment.name}_${timestamp}.pdf`;

    // Save PDF via IPC
    const result = await window.electronAPI.invoke('handwriting:save-pdf', {
      buffer: Buffer.from(pdfBuffer),
      courseName: currentAssignment.courseName,
      assignmentName: currentAssignment.name,
      filename
    });

    if (result.success) {
      alert(`PDF saved successfully!\n${result.filePath}`);
      closeHandwritingModal();

      // Refresh assignment list to show new file
      if (typeof refreshAssignments === 'function') {
        refreshAssignments();
      }
    } else {
      alert(`Failed to save PDF: ${result.error}`);
    }
  } catch (error) {
    console.error('Error saving PDF:', error);
    alert(`Error: ${error.message}`);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Canvas will be initialized when modal is first opened
  });
} else {
  // DOM already loaded
  // Canvas will be initialized when modal is first opened
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    openHandwritingModal,
    closeHandwritingModal,
    clearCanvas,
    undoStroke,
    saveAsImage,
    saveAsPDF,
    initializeHandwritingCanvas
  };
}
