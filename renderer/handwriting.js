// Handwriting canvas functionality using signature_pad and jsPDF
const { jsPDF } = require('jspdf');
const SignaturePad = require('signature_pad').default;

// Canvas and signature pad state
let signaturePad = null;
let currentAssignment = null;
let charRotationEnabled = true;
let charRotationAngle = 0;
let scribbleEnabled = true;
let scribbleIntensity = 3;

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
    velocityFilterWeight: 0.7,
    onEnd: () => {
      console.log('Stroke ended, checking effects...');

      // Add a small delay to ensure the stroke is fully processed
      setTimeout(() => {
        let modified = false;

        // Apply scribble effect first
        if (scribbleEnabled && scribbleIntensity > 0) {
          console.log('Applying scribble effect');
          applyScribbleEffect();
          modified = true;
        }

        // Then apply rotation
        if (charRotationEnabled && charRotationAngle !== 0) {
          console.log('Applying rotation to stroke');
          applyCharacterRotationToStroke();
          modified = true;
        }

        if (!modified) {
          console.log('No effects applied');
        }
      }, 50);
    }
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
  const charRotationInput = document.getElementById('charRotation');
  const charRotationValue = document.getElementById('charRotationValue');
  const enableCharRotationInput = document.getElementById('enableCharRotation');

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

  if (charRotationInput && charRotationValue) {
    charRotationInput.addEventListener('input', (e) => {
      charRotationAngle = parseFloat(e.target.value);
      charRotationValue.textContent = charRotationAngle;
    });
  }

  if (enableCharRotationInput) {
    enableCharRotationInput.addEventListener('change', (e) => {
      charRotationEnabled = e.target.checked;
    });
  }

  // Scribble controls
  const scribbleIntensityInput = document.getElementById('scribbleIntensity');
  const scribbleIntensityValue = document.getElementById('scribbleIntensityValue');
  const enableScribbleInput = document.getElementById('enableScribble');

  if (scribbleIntensityInput && scribbleIntensityValue) {
    scribbleIntensityInput.addEventListener('input', (e) => {
      scribbleIntensity = parseFloat(e.target.value);
      scribbleIntensityValue.textContent = scribbleIntensity;
    });
  }

  if (enableScribbleInput) {
    enableScribbleInput.addEventListener('change', (e) => {
      scribbleEnabled = e.target.checked;
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
 * Apply character rotation to the last stroke
 */
function applyCharacterRotationToStroke() {
  if (!charRotationEnabled || charRotationAngle === 0) return;
  
  console.log('Applying rotation:', charRotationAngle, 'degrees');
  
  const data = signaturePad.toData();
  if (!data || data.length === 0) {
    console.log('No data to rotate');
    return;
  }
  
  // Get the last stroke
  const lastStroke = data[data.length - 1];
  if (!lastStroke || !lastStroke.points || lastStroke.points.length === 0) {
    console.log('No valid stroke to rotate');
    return;
  }
  
  console.log('Rotating stroke with', lastStroke.points.length, 'points');
  
  // Calculate the center of the stroke for rotation
  let centerX = 0, centerY = 0;
  lastStroke.points.forEach(point => {
    centerX += point.x;
    centerY += point.y;
  });
  centerX /= lastStroke.points.length;
  centerY /= lastStroke.points.length;
  
  console.log('Rotation center:', centerX, centerY);
  
  // Apply rotation to each point in the stroke
  const angleRad = (charRotationAngle * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  
  lastStroke.points.forEach((point, index) => {
    // Translate to origin
    const x = point.x - centerX;
    const y = point.y - centerY;
    
    // Apply rotation
    const rotatedX = x * cos - y * sin;
    const rotatedY = x * sin + y * cos;
    
    // Translate back
    point.x = rotatedX + centerX;
    point.y = rotatedY + centerY;
    
    if (index === 0) {
      console.log('First point rotated from', x + centerX, y + centerY, 'to', point.x, point.y);
    }
  });
  
  // Clear and redraw the signature pad with the rotated stroke
  signaturePad.clear();
  signaturePad.fromData(data);
  
  console.log('Rotation applied and redrawn');
}

/**
 * Apply natural scribble effect to the last stroke
 */
function applyScribbleEffect() {
  if (!scribbleEnabled || scribbleIntensity === 0) return;

  console.log('Applying scribble with intensity:', scribbleIntensity);

  const data = signaturePad.toData();
  if (!data || data.length === 0) {
    console.log('No data to scribble');
    return;
  }

  // Get the last stroke
  const lastStroke = data[data.length - 1];
  if (!lastStroke || !lastStroke.points || lastStroke.points.length === 0) {
    console.log('No valid stroke to scribble');
    return;
  }

  console.log('Adding natural variations to stroke with', lastStroke.points.length, 'points');

  // Apply natural variations to each point
  const intensity = scribbleIntensity / 10; // Normalize to 0-1

  lastStroke.points.forEach((point, index) => {
    // Skip first and last points to maintain stroke endpoints
    if (index === 0 || index === lastStroke.points.length - 1) return;

    // Random jitter - creates natural hand tremor effect
    const jitterX = (Math.random() - 0.5) * 2 * intensity * 2;
    const jitterY = (Math.random() - 0.5) * 2 * intensity * 2;

    // Apply smooth variation using sine wave for more natural wobble
    const smoothFactorX = Math.sin(index * 0.3 + Math.random() * Math.PI) * intensity * 1.5;
    const smoothFactorY = Math.cos(index * 0.25 + Math.random() * Math.PI) * intensity * 1.5;

    point.x += jitterX + smoothFactorX;
    point.y += jitterY + smoothFactorY;

    // Add slight pressure variation for more natural look
    if (point.pressure !== undefined) {
      const pressureVariation = (Math.random() - 0.5) * 0.1 * intensity;
      point.pressure = Math.max(0.1, Math.min(1, point.pressure + pressureVariation));
    }
  });

  // Add occasional larger wobbles to simulate hand movement adjustments
  const wobblePoints = Math.floor(lastStroke.points.length * 0.2 * intensity);
  for (let i = 0; i < wobblePoints; i++) {
    const randomIndex = Math.floor(Math.random() * (lastStroke.points.length - 2)) + 1;
    const point = lastStroke.points[randomIndex];

    const wobbleX = (Math.random() - 0.5) * 3 * intensity;
    const wobbleY = (Math.random() - 0.5) * 3 * intensity;

    point.x += wobbleX;
    point.y += wobbleY;
  }

  // Clear and redraw the signature pad with the scribbled stroke
  signaturePad.clear();
  signaturePad.fromData(data);

  console.log('Scribble effect applied and redrawn');
}

/**
 * Test rotation with a preset angle
 */
function testRotation() {
  console.log('Testing rotation...');
  
  // Set rotation to 45 degrees
  charRotationAngle = 45;
  charRotationEnabled = true;
  
  // Update UI
  const charRotationInput = document.getElementById('charRotation');
  const charRotationValue = document.getElementById('charRotationValue');
  const enableCharRotationInput = document.getElementById('enableCharRotation');
  
  if (charRotationInput) {
    charRotationInput.value = 45;
  }
  if (charRotationValue) {
    charRotationValue.textContent = '45';
  }
  if (enableCharRotationInput) {
    enableCharRotationInput.checked = true;
  }
  
  console.log('Rotation set to 45 degrees, enabled:', charRotationEnabled);
  
  // Show a message
  alert('Rotation set to 45°. Now draw something to see the rotation effect!');
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
