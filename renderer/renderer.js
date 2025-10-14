const { ipcRenderer } = require('electron');

// DOM elements
const settingsBtn = document.getElementById('settingsBtn');
const debugBtn = document.getElementById('debugBtn');
const settingsPanel = document.getElementById('settingsPanel');
const debugPanel = document.getElementById('debugPanel');
const settingsForm = document.getElementById('settingsForm');
const cancelBtn = document.getElementById('cancelBtn');
const closeDebug = document.getElementById('closeDebug');
const clearLogs = document.getElementById('clearLogs');
const refreshData = document.getElementById('refreshData');
const debugLogs = document.getElementById('debugLogs');

const coursesList = document.getElementById('coursesList');
const assignmentList = document.getElementById('assignmentList');
const lecturesList = document.getElementById('lecturesList');
const connectionStatus = document.getElementById('connectionStatus');
const lastCheck = document.getElementById('lastCheck');

const useCredentialLogin = document.getElementById('useCredentialLogin');
const credentialFields = document.getElementById('credentialFields');
const tokenField = document.getElementById('tokenField');

const tabBtns = document.querySelectorAll('.tab-btn');
const coursesView = document.getElementById('coursesView');
const assignmentsView = document.getElementById('assignmentsView');
const lecturesView = document.getElementById('lecturesView');

// State
let courses = [];
let assignments = [];
let lectures = [];
let settings = {};
let downloadedFilePaths = {}; // Store actual file paths by attachment ID
let currentFilter = 'all'; // Current assignment filter

// Debug logging
function addDebugLog(message, type = 'info') {
  const logDiv = document.createElement('div');
  logDiv.className = `debug-log ${type}`;
  const timestamp = new Date().toLocaleTimeString();
  logDiv.textContent = `[${timestamp}] ${message}`;
  debugLogs.appendChild(logDiv);
  debugLogs.scrollTop = debugLogs.scrollHeight;
  console.log(`[${type.toUpperCase()}] ${message}`);
}

// Gemini API key change handler
document.getElementById('geminiApiKey').addEventListener('change', (event) => {
  const apiKey = event.target.value;
  if (apiKey && apiKey.length > 10) {
    addDebugLog('Fetching available Gemini models...');
    ipcRenderer.send('request-gemini-models', apiKey);
  }
});

// Event listeners
settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.toggle('hidden');
});

debugBtn.addEventListener('click', () => {
  debugPanel.classList.toggle('hidden');
  addDebugLog('Debug console opened');
});

closeDebug.addEventListener('click', () => {
  debugPanel.classList.add('hidden');
});

clearLogs.addEventListener('click', () => {
  debugLogs.innerHTML = '';
  addDebugLog('Logs cleared');
});

refreshData.addEventListener('click', () => {
  addDebugLog('Manually refreshing data...');
  ipcRenderer.send('request-assignments');
  ipcRenderer.send('request-courses');
  ipcRenderer.send('request-lectures');
});

cancelBtn.addEventListener('click', () => {
  settingsPanel.classList.add('hidden');
});

// Close settings button (X button)
const closeSettingsBtn = document.getElementById('closeSettings');
if (closeSettingsBtn) {
  closeSettingsBtn.addEventListener('click', () => {
    settingsPanel.classList.add('hidden');
  });
}

// Click outside settings modal to close
settingsPanel.addEventListener('click', (e) => {
  // Only close if clicking directly on the overlay (settingsPanel), not its children
  if (e.target === settingsPanel) {
    settingsPanel.classList.add('hidden');
  }
});

// Prevent clicks inside the settings form from closing the modal
const settingsFormElement = document.getElementById('settingsForm');
if (settingsFormElement) {
  settingsFormElement.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

// ESC key to close settings modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!settingsPanel.classList.contains('hidden')) {
      settingsPanel.classList.add('hidden');
    }
    if (!debugPanel.classList.contains('hidden')) {
      debugPanel.classList.add('hidden');
    }
  }
});

useCredentialLogin.addEventListener('change', () => {
  if (useCredentialLogin.checked) {
    credentialFields.classList.remove('hidden');
    tokenField.classList.add('hidden');
    document.getElementById('username').required = true;
    document.getElementById('password').required = true;
    document.getElementById('apiToken').required = false;
  } else {
    credentialFields.classList.add('hidden');
    tokenField.classList.remove('hidden');
    document.getElementById('username').required = false;
    document.getElementById('password').required = false;
    document.getElementById('apiToken').required = true;
  }
});

// Handwriting toggle
const useHandwriting = document.getElementById('useHandwriting');
const handwritingOptions = document.getElementById('handwritingOptions');
const handwritingColorSize = document.getElementById('handwritingColorSize');
const handwritingFontSize = document.getElementById('handwritingFontSize');
const handwritingPaperStyle = document.getElementById('handwritingPaperStyle');
const handwritingRandomization = document.getElementById('handwritingRandomization');
const advancedHandwritingSettings = document.getElementById('advancedHandwritingSettings');

useHandwriting.addEventListener('change', () => {
  if (useHandwriting.checked) {
    handwritingOptions.style.display = 'block';
    handwritingColorSize.style.display = 'block';
    handwritingFontSize.style.display = 'block';
    handwritingPaperStyle.style.display = 'block';
    handwritingRandomization.style.display = 'block';
    advancedHandwritingSettings.style.display = 'block';
  } else {
    handwritingOptions.style.display = 'none';
    handwritingColorSize.style.display = 'none';
    handwritingFontSize.style.display = 'none';
    handwritingPaperStyle.style.display = 'none';
    handwritingRandomization.style.display = 'none';
    advancedHandwritingSettings.style.display = 'none';
  }
});

// Font size slider value display
const fontSizeSlider = document.getElementById('fontSize');
const fontSizeValue = document.getElementById('fontSizeValue');

fontSizeSlider.addEventListener('input', () => {
  fontSizeValue.textContent = `${fontSizeSlider.value}px`;
});

// Handwriting color preview
const handwritingColorPicker = document.getElementById('handwritingColor');
const handwritingColorPreview = document.getElementById('handwritingColorPreview');

function updateColorPreview() {
  const color = handwritingColorPicker.value;
  handwritingColorPreview.style.color = color;

  // Convert hex to color name description
  const colorNames = {
    '#000000': 'Black',
    '#2d2d2d': 'Dark Gray (Natural)',
    '#1a1a1a': 'Almost Black',
    '#003366': 'Dark Blue',
    '#000080': 'Navy Blue',
    '#8b4513': 'Brown',
    '#654321': 'Dark Brown',
    '#2c3e50': 'Dark Slate'
  };

  handwritingColorPreview.textContent = colorNames[color] || color;
}

handwritingColorPicker.addEventListener('input', updateColorPreview);
handwritingColorPicker.addEventListener('change', updateColorPreview);

// Randomization sliders value display
const rotationVarianceSlider = document.getElementById('rotationVariance');
const rotationVarianceValue = document.getElementById('rotationVarianceValue');
rotationVarianceSlider.addEventListener('input', () => {
  rotationVarianceValue.textContent = `${rotationVarianceSlider.value} degrees`;
});

const spacingVarianceSlider = document.getElementById('spacingVariance');
const spacingVarianceValue = document.getElementById('spacingVarianceValue');
spacingVarianceSlider.addEventListener('input', () => {
  spacingVarianceValue.textContent = `${spacingVarianceSlider.value}%`;
});

const wordSpacingVarianceSlider = document.getElementById('wordSpacingVariance');
const wordSpacingVarianceValue = document.getElementById('wordSpacingVarianceValue');
wordSpacingVarianceSlider.addEventListener('input', () => {
  wordSpacingVarianceValue.textContent = `${wordSpacingVarianceSlider.value}%`;
});

const baselineVarianceSlider = document.getElementById('baselineVariance');
const baselineVarianceValue = document.getElementById('baselineVarianceValue');
baselineVarianceSlider.addEventListener('input', () => {
  baselineVarianceValue.textContent = `${baselineVarianceSlider.value}px`;
});

const inkDensityVarianceSlider = document.getElementById('inkDensityVariance');
const inkDensityVarianceValue = document.getElementById('inkDensityVarianceValue');
inkDensityVarianceSlider.addEventListener('input', () => {
  inkDensityVarianceValue.textContent = `${inkDensityVarianceSlider.value}%`;
});

const blurVarianceSlider = document.getElementById('blurVariance');
const blurVarianceValue = document.getElementById('blurVarianceValue');
blurVarianceSlider.addEventListener('input', () => {
  blurVarianceValue.textContent = `${blurVarianceSlider.value}%`;
});

const sizeVarianceSlider = document.getElementById('sizeVariance');
const sizeVarianceValue = document.getElementById('sizeVarianceValue');
sizeVarianceSlider.addEventListener('input', () => {
  sizeVarianceValue.textContent = `${sizeVarianceSlider.value}%`;
});

// Reset randomization button
document.getElementById('resetRandomization').addEventListener('click', () => {
  rotationVarianceSlider.value = 0.5;
  rotationVarianceValue.textContent = '0.5 degrees';
  spacingVarianceSlider.value = 5;
  spacingVarianceValue.textContent = '5%';
  wordSpacingVarianceSlider.value = 10;
  wordSpacingVarianceValue.textContent = '10%';
  baselineVarianceSlider.value = 0.8;
  baselineVarianceValue.textContent = '0.8px';
  inkDensityVarianceSlider.value = 25;
  inkDensityVarianceValue.textContent = '25%';
  blurVarianceSlider.value = 15;
  blurVarianceValue.textContent = '15%';
  sizeVarianceSlider.value = 3;
  sizeVarianceValue.textContent = '3%';
  document.getElementById('enableMarginDoodles').checked = true;
  document.getElementById('enableInkSpots').checked = true;
  addDebugLog('Reset randomization settings to defaults');
});

// Advanced handwriting settings - Font Size sync
const fontSizeAdvancedSlider = document.getElementById('fontSizeAdvanced');
const fontSizeAdvancedValue = document.getElementById('fontSizeAdvancedValue');

if (fontSizeAdvancedSlider && fontSizeAdvancedValue) {
  fontSizeAdvancedSlider.addEventListener('input', () => {
    fontSizeAdvancedValue.value = fontSizeAdvancedSlider.value;
  });

  fontSizeAdvancedValue.addEventListener('input', () => {
    fontSizeAdvancedSlider.value = fontSizeAdvancedValue.value;
  });
}

// Line Height sync
const lineHeightSlider = document.getElementById('lineHeight');
const lineHeightValue = document.getElementById('lineHeightValue');

if (lineHeightSlider && lineHeightValue) {
  lineHeightSlider.addEventListener('input', () => {
    lineHeightValue.value = lineHeightSlider.value;
  });

  lineHeightValue.addEventListener('input', () => {
    lineHeightSlider.value = lineHeightValue.value;
  });
}

// Letter Spacing sync
const letterSpacingSlider = document.getElementById('letterSpacing');
const letterSpacingValue = document.getElementById('letterSpacingValue');

if (letterSpacingSlider && letterSpacingValue) {
  letterSpacingSlider.addEventListener('input', () => {
    letterSpacingValue.value = letterSpacingSlider.value;
  });

  letterSpacingValue.addEventListener('input', () => {
    letterSpacingSlider.value = letterSpacingValue.value;
  });
}

// Word Spacing sync
const wordSpacingSlider = document.getElementById('wordSpacing');
const wordSpacingValue = document.getElementById('wordSpacingValue');

if (wordSpacingSlider && wordSpacingValue) {
  wordSpacingSlider.addEventListener('input', () => {
    wordSpacingValue.value = wordSpacingSlider.value;
  });

  wordSpacingValue.addEventListener('input', () => {
    wordSpacingSlider.value = wordSpacingValue.value;
  });
}

// Indentation Range sync
const indentationRangeSlider = document.getElementById('indentationRangeSlider');
const indentationRangeValue = document.getElementById('indentationRangeValue');

if (indentationRangeSlider && indentationRangeValue) {
  indentationRangeSlider.addEventListener('input', () => {
    indentationRangeValue.value = indentationRangeSlider.value;
  });

  indentationRangeValue.addEventListener('input', () => {
    indentationRangeSlider.value = indentationRangeValue.value;
  });
}

// Paragraph Spacing sync
const paragraphSpacingSlider = document.getElementById('paragraphSpacing');
const paragraphSpacingValue = document.getElementById('paragraphSpacingValue');

if (paragraphSpacingSlider && paragraphSpacingValue) {
  paragraphSpacingSlider.addEventListener('input', () => {
    paragraphSpacingValue.value = paragraphSpacingSlider.value;
  });

  paragraphSpacingValue.addEventListener('input', () => {
    paragraphSpacingSlider.value = paragraphSpacingValue.value;
  });
}

// Mirror margins toggle
const mirrorMarginsCheckbox = document.getElementById('mirrorMargins');
const evenPageMarginsSection = document.getElementById('evenPageMargins');

if (mirrorMarginsCheckbox && evenPageMarginsSection) {
  mirrorMarginsCheckbox.addEventListener('change', () => {
    if (mirrorMarginsCheckbox.checked) {
      evenPageMarginsSection.style.display = 'block';
    } else {
      evenPageMarginsSection.style.display = 'none';
    }
  });
}

// Random indentation toggle
const randomIndentationCheckbox = document.getElementById('randomIndentation');
const indentationRangeSection = document.getElementById('indentationRange');

if (randomIndentationCheckbox && indentationRangeSection) {
  randomIndentationCheckbox.addEventListener('change', () => {
    if (randomIndentationCheckbox.checked) {
      indentationRangeSection.style.display = 'block';
    } else {
      indentationRangeSection.style.display = 'none';
    }
  });
}

// Font filter buttons
const fontFilterBtns = document.querySelectorAll('[data-font-filter]');
const customFontSelect = document.getElementById('customFont');

fontFilterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const filter = btn.dataset.fontFilter;

    // Update active state
    fontFilterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Filter options
    if (customFontSelect) {
      const options = customFontSelect.querySelectorAll('option');
      options.forEach(option => {
        const languages = option.dataset.languages || '';
        if (filter === 'all') {
          option.style.display = '';
        } else {
          if (languages.includes(filter)) {
            option.style.display = '';
          } else {
            option.style.display = 'none';
          }
        }
      });
    }
  });
});

// Font search functionality
const fontSearchInput = document.getElementById('fontSearch');

if (fontSearchInput && customFontSelect) {
  fontSearchInput.addEventListener('input', () => {
    const searchTerm = fontSearchInput.value.toLowerCase();
    const options = customFontSelect.querySelectorAll('option');

    options.forEach(option => {
      const text = option.textContent.toLowerCase();
      if (text.includes(searchTerm)) {
        option.style.display = '';
      } else {
        option.style.display = 'none';
      }
    });
  });
}

// Tab switching
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;
    addDebugLog(`Switched to ${view} view`);

    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    coursesView.classList.add('hidden');
    assignmentsView.classList.add('hidden');
    lecturesView.classList.add('hidden');

    if (view === 'courses') coursesView.classList.remove('hidden');
    if (view === 'assignments') assignmentsView.classList.remove('hidden');
    if (view === 'lectures') lecturesView.classList.remove('hidden');
  });
});

// Filter buttons
const filterBtns = document.querySelectorAll('.filter-btn');
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    addDebugLog(`Filtering assignments: ${currentFilter}`);

    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    renderAssignments(assignments);
  });
});

// Settings form
settingsForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const formData = new FormData(settingsForm);
  const useCredentials = formData.get('useCredentialLogin') === 'on';

  // Collect selected PDF header fields
  const pdfHeaderFields = [];
  document.querySelectorAll('input[name="pdfHeaderField"]:checked').forEach(checkbox => {
    pdfHeaderFields.push(checkbox.value);
  });

  const newSettings = {
    lmsType: formData.get('lmsType'),
    lmsUrl: formData.get('lmsUrl'),
    useCredentialLogin: useCredentials,
    checkInterval: parseInt(formData.get('checkInterval')),
    soundEnabled: formData.get('soundEnabled') === 'on',
    autoDownload: formData.get('autoDownload') === 'on',
    downloadPath: formData.get('downloadPath'),
    geminiApiKey: formData.get('geminiApiKey'),
    geminiModel: formData.get('geminiModel'),
    extraRules: formData.get('extraRules'),
    pdfHeaderFields: pdfHeaderFields,
    useHandwriting: formData.get('useHandwriting') === 'on',
    handwritingFont: formData.get('handwritingFont') || 'Homemade Apple',
    handwritingColor: formData.get('handwritingColor') || '#2d2d2d',
    fontSize: parseInt(formData.get('fontSize')) || 18,
    paperStyle: formData.get('paperStyle') || 'aged-vintage',
    rotationVariance: parseFloat(formData.get('rotationVariance')) || 0.5,
    spacingVariance: parseInt(formData.get('spacingVariance')) || 5,
    wordSpacingVariance: parseInt(formData.get('wordSpacingVariance')) || 10,
    baselineVariance: parseFloat(formData.get('baselineVariance')) || 0.8,
    inkDensityVariance: parseInt(formData.get('inkDensityVariance')) || 25,
    blurVariance: parseInt(formData.get('blurVariance')) || 15,
    sizeVariance: parseInt(formData.get('sizeVariance')) || 3,
    enableMarginDoodles: formData.get('enableMarginDoodles') === 'on',
    enableInkSpots: formData.get('enableInkSpots') === 'on',
    // Advanced handwriting settings
    paperBackground: formData.get('paperBackground') || 'plain-white',
    tableBackground: formData.get('tableBackground') || 'none',
    customFont: formData.get('customFont') || 'font1',
    fontSizeAdvanced: parseInt(formData.get('fontSizeAdvanced')) || 30,
    lineHeight: parseFloat(formData.get('lineHeight')) || 1.30,
    letterSpacing: parseFloat(formData.get('letterSpacing')) || 0,
    wordSpacing: parseInt(formData.get('wordSpacing')) || 0,
    enableBlur: formData.get('enableBlur') === 'on',
    enableShading: formData.get('enableShading') === 'on',
    enablePaperShadow: formData.get('enablePaperShadow') === 'on',
    enablePaperTexture: formData.get('enablePaperTexture') === 'on',
    enableShadowSilhouette: formData.get('enableShadowSilhouette') === 'on',
    enablePaperRotation: formData.get('enablePaperRotation') === 'on',
    enableInkFlow: formData.get('enableInkFlow') === 'on',
    marginTop: parseInt(formData.get('marginTop')) || 20,
    marginRight: parseInt(formData.get('marginRight')) || 20,
    marginBottom: parseInt(formData.get('marginBottom')) || 20,
    marginLeft: parseInt(formData.get('marginLeft')) || 20,
    mirrorMargins: formData.get('mirrorMargins') === 'on',
    marginTopEven: parseInt(formData.get('marginTopEven')) || 20,
    marginRightEven: parseInt(formData.get('marginRightEven')) || 20,
    marginBottomEven: parseInt(formData.get('marginBottomEven')) || 20,
    marginLeftEven: parseInt(formData.get('marginLeftEven')) || 20,
    randomWordRotation: formData.get('randomWordRotation') === 'on',
    randomLetterRotation: formData.get('randomLetterRotation') === 'on',
    randomIndentation: formData.get('randomIndentation') === 'on',
    indentationRange: parseInt(formData.get('indentationRangeSlider')) || 5,
    enableHyphenation: formData.get('enableHyphenation') === 'on',
    paragraphSpacing: parseInt(formData.get('paragraphSpacing')) || 0,
    outputFormat: formData.get('outputFormat') || 'pdf',
    outputQuality: formData.get('outputQuality') || 'normal',
    pageSize: formData.get('pageSize') || 'a4'
  };

  if (useCredentials) {
    newSettings.username = formData.get('username');
    newSettings.password = formData.get('password');
    addDebugLog(`Attempting login for user: ${newSettings.username}`);
  } else {
    newSettings.apiToken = formData.get('apiToken');
    addDebugLog('Using API token authentication');
  }

  settings = newSettings;

  connectionStatus.textContent = 'Connecting...';
  connectionStatus.className = 'checking';

  ipcRenderer.send('save-settings', newSettings);
});

// IPC listeners
ipcRenderer.on('settings-loaded', (event, loadedSettings) => {
  if (loadedSettings) {
    settings = loadedSettings;
    document.getElementById('lmsType').value = settings.lmsType || 'canvas';
    document.getElementById('lmsUrl').value = settings.lmsUrl || '';
    document.getElementById('checkInterval').value = settings.checkInterval || 15;
    document.getElementById('soundEnabled').checked = settings.soundEnabled !== false;
    document.getElementById('autoDownload').checked = settings.autoDownload !== false;
    document.getElementById('downloadPath').value = settings.downloadPath || '';
    document.getElementById('geminiApiKey').value = settings.geminiApiKey || '';
    document.getElementById('geminiModel').value = settings.geminiModel || 'gemini-1.5-pro';
    document.getElementById('extraRules').value = settings.extraRules || '';

    // Set PDF header fields checkboxes
    const pdfHeaderFields = settings.pdfHeaderFields || ['name', 'id'];
    document.querySelectorAll('input[name="pdfHeaderField"]').forEach(checkbox => {
      checkbox.checked = pdfHeaderFields.includes(checkbox.value);
    });

    // Set handwriting settings
    document.getElementById('useHandwriting').checked = settings.useHandwriting || false;
    document.getElementById('handwritingFont').value = settings.handwritingFont || 'Homemade Apple';
    document.getElementById('handwritingColor').value = settings.handwritingColor || '#2d2d2d';
    document.getElementById('fontSize').value = settings.fontSize || 18;
    document.getElementById('fontSizeValue').textContent = `${settings.fontSize || 18}px`;
    document.getElementById('paperStyle').value = settings.paperStyle || 'aged-vintage';

    // Set randomization settings
    document.getElementById('rotationVariance').value = settings.rotationVariance !== undefined ? settings.rotationVariance : 0.5;
    document.getElementById('rotationVarianceValue').textContent = `${settings.rotationVariance !== undefined ? settings.rotationVariance : 0.5} degrees`;
    document.getElementById('spacingVariance').value = settings.spacingVariance !== undefined ? settings.spacingVariance : 5;
    document.getElementById('spacingVarianceValue').textContent = `${settings.spacingVariance !== undefined ? settings.spacingVariance : 5}%`;
    document.getElementById('wordSpacingVariance').value = settings.wordSpacingVariance !== undefined ? settings.wordSpacingVariance : 10;
    document.getElementById('wordSpacingVarianceValue').textContent = `${settings.wordSpacingVariance !== undefined ? settings.wordSpacingVariance : 10}%`;
    document.getElementById('baselineVariance').value = settings.baselineVariance !== undefined ? settings.baselineVariance : 0.8;
    document.getElementById('baselineVarianceValue').textContent = `${settings.baselineVariance !== undefined ? settings.baselineVariance : 0.8}px`;
    document.getElementById('inkDensityVariance').value = settings.inkDensityVariance !== undefined ? settings.inkDensityVariance : 25;
    document.getElementById('inkDensityVarianceValue').textContent = `${settings.inkDensityVariance !== undefined ? settings.inkDensityVariance : 25}%`;
    document.getElementById('blurVariance').value = settings.blurVariance !== undefined ? settings.blurVariance : 15;
    document.getElementById('blurVarianceValue').textContent = `${settings.blurVariance !== undefined ? settings.blurVariance : 15}%`;
    document.getElementById('sizeVariance').value = settings.sizeVariance !== undefined ? settings.sizeVariance : 3;
    document.getElementById('sizeVarianceValue').textContent = `${settings.sizeVariance !== undefined ? settings.sizeVariance : 3}%`;
    document.getElementById('enableMarginDoodles').checked = settings.enableMarginDoodles !== false;
    document.getElementById('enableInkSpots').checked = settings.enableInkSpots !== false;

    // Update color preview
    updateColorPreview();

    // Load advanced handwriting settings
    if (document.getElementById('paperBackground')) {
      document.getElementById('paperBackground').value = settings.paperBackground || 'plain-white';
    }
    if (document.getElementById('tableBackground')) {
      document.getElementById('tableBackground').value = settings.tableBackground || 'none';
    }
    if (document.getElementById('customFont')) {
      document.getElementById('customFont').value = settings.customFont || 'font1';
    }
    if (document.getElementById('fontSizeAdvanced')) {
      document.getElementById('fontSizeAdvanced').value = settings.fontSizeAdvanced || 30;
      document.getElementById('fontSizeAdvancedValue').value = settings.fontSizeAdvanced || 30;
    }
    if (document.getElementById('lineHeight')) {
      document.getElementById('lineHeight').value = settings.lineHeight || 1.30;
      document.getElementById('lineHeightValue').value = settings.lineHeight || 1.30;
    }
    if (document.getElementById('letterSpacing')) {
      document.getElementById('letterSpacing').value = settings.letterSpacing || 0;
      document.getElementById('letterSpacingValue').value = settings.letterSpacing || 0;
    }
    if (document.getElementById('wordSpacing')) {
      document.getElementById('wordSpacing').value = settings.wordSpacing || 0;
      document.getElementById('wordSpacingValue').value = settings.wordSpacing || 0;
    }
    if (document.getElementById('enableBlur')) {
      document.getElementById('enableBlur').checked = settings.enableBlur || false;
    }
    if (document.getElementById('enableShading')) {
      document.getElementById('enableShading').checked = settings.enableShading || false;
    }
    if (document.getElementById('enablePaperShadow')) {
      document.getElementById('enablePaperShadow').checked = settings.enablePaperShadow || false;
    }
    if (document.getElementById('enablePaperTexture')) {
      document.getElementById('enablePaperTexture').checked = settings.enablePaperTexture !== false;
    }
    if (document.getElementById('enableShadowSilhouette')) {
      document.getElementById('enableShadowSilhouette').checked = settings.enableShadowSilhouette || false;
    }
    if (document.getElementById('enablePaperRotation')) {
      document.getElementById('enablePaperRotation').checked = settings.enablePaperRotation || false;
    }
    if (document.getElementById('enableInkFlow')) {
      document.getElementById('enableInkFlow').checked = settings.enableInkFlow || false;
    }
    if (document.getElementById('marginTop')) {
      document.getElementById('marginTop').value = settings.marginTop || 20;
      document.getElementById('marginRight').value = settings.marginRight || 20;
      document.getElementById('marginBottom').value = settings.marginBottom || 20;
      document.getElementById('marginLeft').value = settings.marginLeft || 20;
    }
    if (document.getElementById('mirrorMargins')) {
      document.getElementById('mirrorMargins').checked = settings.mirrorMargins || false;
      if (settings.mirrorMargins) {
        document.getElementById('evenPageMargins').style.display = 'block';
      }
    }
    if (document.getElementById('marginTopEven')) {
      document.getElementById('marginTopEven').value = settings.marginTopEven || 20;
      document.getElementById('marginRightEven').value = settings.marginRightEven || 20;
      document.getElementById('marginBottomEven').value = settings.marginBottomEven || 20;
      document.getElementById('marginLeftEven').value = settings.marginLeftEven || 20;
    }
    if (document.getElementById('randomWordRotation')) {
      document.getElementById('randomWordRotation').checked = settings.randomWordRotation || false;
    }
    if (document.getElementById('randomLetterRotation')) {
      document.getElementById('randomLetterRotation').checked = settings.randomLetterRotation || false;
    }
    if (document.getElementById('randomIndentation')) {
      document.getElementById('randomIndentation').checked = settings.randomIndentation || false;
      if (settings.randomIndentation) {
        document.getElementById('indentationRange').style.display = 'block';
      }
    }
    if (document.getElementById('indentationRangeSlider')) {
      document.getElementById('indentationRangeSlider').value = settings.indentationRange || 5;
      document.getElementById('indentationRangeValue').value = settings.indentationRange || 5;
    }
    if (document.getElementById('enableHyphenation')) {
      document.getElementById('enableHyphenation').checked = settings.enableHyphenation || false;
    }
    if (document.getElementById('paragraphSpacing')) {
      document.getElementById('paragraphSpacing').value = settings.paragraphSpacing || 0;
      document.getElementById('paragraphSpacingValue').value = settings.paragraphSpacing || 0;
    }
    if (document.getElementById('outputFormat')) {
      document.getElementById('outputFormat').value = settings.outputFormat || 'pdf';
    }
    if (document.getElementById('outputQuality')) {
      document.getElementById('outputQuality').value = settings.outputQuality || 'normal';
    }
    if (document.getElementById('pageSize')) {
      document.getElementById('pageSize').value = settings.pageSize || 'a4';
    }

    if (settings.useHandwriting) {
      document.getElementById('handwritingOptions').style.display = 'block';
      document.getElementById('handwritingColorSize').style.display = 'block';
      document.getElementById('handwritingFontSize').style.display = 'block';
      document.getElementById('handwritingPaperStyle').style.display = 'block';
      document.getElementById('handwritingRandomization').style.display = 'block';
      advancedHandwritingSettings.style.display = 'block';
    }

    const useCredentials = settings.useCredentialLogin !== false;
    document.getElementById('useCredentialLogin').checked = useCredentials;

    if (useCredentials) {
      document.getElementById('username').value = settings.username || '';
      document.getElementById('password').value = settings.password || '';
      credentialFields.classList.remove('hidden');
      tokenField.classList.add('hidden');
    } else {
      document.getElementById('apiToken').value = settings.apiToken || '';
      credentialFields.classList.add('hidden');
      tokenField.classList.remove('hidden');
    }
    addDebugLog('Settings loaded');

    // Fetch available models if API key is configured
    if (settings.geminiApiKey && settings.geminiApiKey.length > 10) {
      ipcRenderer.send('request-gemini-models', settings.geminiApiKey);
    }

    // Only re-render assignments if geminiApiKey changed (to update button states)
    const previousHasGemini = settings && settings.geminiApiKey && settings.geminiApiKey.length > 0;
    const currentHasGemini = loadedSettings.geminiApiKey && loadedSettings.geminiApiKey.length > 0;

    if (previousHasGemini !== currentHasGemini && assignments && assignments.length > 0) {
      addDebugLog('Gemini API key changed, updating assignment buttons');
      renderAssignments(assignments);
    }

    // Auto-connect if settings are configured
    const isConfigured = settings.lmsUrl &&
                        (settings.useCredentialLogin ? (settings.username && settings.password) : settings.apiToken);
    if (isConfigured) {
      addDebugLog('Auto-connecting with saved credentials...');
      ipcRenderer.send('save-settings', settings);
    }
  }
});

ipcRenderer.on('login-success', (event, message) => {
  connectionStatus.textContent = 'Connected';
  connectionStatus.className = 'connected';
  settingsPanel.classList.add('hidden');
  addDebugLog('Login successful', 'info');
});

ipcRenderer.on('login-error', (event, error) => {
  connectionStatus.textContent = 'Login Failed';
  connectionStatus.className = 'disconnected';
  addDebugLog(`Login failed: ${error}`, 'error');
  alert(`Login failed: ${error}`);
});

ipcRenderer.on('connection-status', (event, status) => {
  connectionStatus.textContent = status;
  connectionStatus.className = status.toLowerCase();
  addDebugLog(`Connection status: ${status}`);
});

ipcRenderer.on('last-check-time', (event, time) => {
  lastCheck.textContent = `Last check: ${formatTime(time)}`;
});

ipcRenderer.on('courses-updated', (event, coursesData) => {
  // Only update if data actually changed
  const coursesChanged = JSON.stringify(courses) !== JSON.stringify(coursesData);
  if (coursesChanged || courses.length === 0) {
    courses = coursesData;
    addDebugLog(`Loaded ${courses.length} courses`);
    renderCourses(courses);
  }
});

ipcRenderer.on('assignments-updated', (event, assignmentsData) => {
  // Only update if data actually changed
  const assignmentsChanged = JSON.stringify(assignments) !== JSON.stringify(assignmentsData);
  if (assignmentsChanged || assignments.length === 0) {
    assignments = assignmentsData;
    addDebugLog(`Loaded ${assignments.length} assignments`);
    renderAssignments(assignments);
  }
});

ipcRenderer.on('lectures-updated', (event, lecturesData) => {
  // Only update if data actually changed
  const lecturesChanged = JSON.stringify(lectures) !== JSON.stringify(lecturesData);
  if (lecturesChanged || lectures.length === 0) {
    lectures = lecturesData;
    addDebugLog(`Loaded ${lectures.length} lectures`);
    renderLectures(lectures);
  }
});

ipcRenderer.on('gemini-models-result', (event, models) => {
  const modelSelect = document.getElementById('geminiModel');
  const currentValue = modelSelect.value || settings.geminiModel || 'gemini-1.5-pro';

  modelSelect.innerHTML = '';

  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    if (model === currentValue) {
      option.selected = true;
    }
    modelSelect.appendChild(option);
  });

  addDebugLog(`Loaded ${models.length} Gemini models`);
});

// Render functions
function renderCourses(coursesData) {
  if (!coursesData || coursesData.length === 0) {
    coursesList.innerHTML = `
      <div class="empty-state">
        <p>No courses found</p>
        <p class="hint">Configure your LMS settings to get started</p>
      </div>
    `;
    return;
  }

  coursesList.innerHTML = coursesData.map(course => {
    const courseAssignments = assignments.filter(a => a.courseId === course.id);
    const urgentCount = courseAssignments.filter(a => {
      const hours = (new Date(a.dueDate) - new Date()) / (1000 * 60 * 60);
      return hours < 24 && hours > 0;
    }).length;

    return `
      <div class="course-card" data-course-id="${course.id}">
        <h3>${escapeHtml(course.name)}</h3>
        <div class="course-stats">
          <div class="course-stat ${urgentCount > 0 ? 'urgent' : ''}">
            ${courseAssignments.length} Assignment${courseAssignments.length !== 1 ? 's' : ''}
          </div>
          ${urgentCount > 0 ? `<div class="course-stat urgent">${urgentCount} Urgent</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function detectCategory(assignment) {
  const text = `${assignment.name} ${assignment.description || ''}`.toLowerCase();

  const mathKeywords = ['math', 'equation', 'calculus', 'algebra', 'geometry', 'statistics', 'integral', 'derivative'];
  const codingKeywords = ['code', 'program', 'algorithm', 'function', 'implement', 'java', 'python', 'javascript'];

  const mathScore = mathKeywords.filter(k => text.includes(k)).length;
  const codingScore = codingKeywords.filter(k => text.includes(k)).length;

  if (mathScore > codingScore && mathScore > 0) return 'math';
  if (codingScore > 0) return 'coding';
  return 'other';
}

function filterAssignments(assignmentsData) {
  const now = new Date();

  switch(currentFilter) {
    case 'upcoming':
      return assignmentsData.filter(a => !a.submitted && new Date(a.dueDate) >= now);
    case 'overdue':
      return assignmentsData.filter(a => !a.submitted && new Date(a.dueDate) < now);
    case 'submitted':
      return assignmentsData.filter(a => a.submitted);
    case 'not-submitted':
      return assignmentsData.filter(a => !a.submitted);
    case 'all':
    default:
      return assignmentsData;
  }
}

function getSubmissionTimingText(assignment) {
  if (!assignment.submitted || !assignment.submittedDate) {
    return null;
  }

  const submittedDate = new Date(assignment.submittedDate);
  const dueDate = new Date(assignment.dueDate);
  const diffMs = dueDate - submittedDate;
  const diffHours = Math.abs(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = Math.floor(diffHours % 24);

  if (diffMs > 0) {
    // Submitted before due date
    if (diffDays > 0) {
      return `Submitted ${diffDays}d ${remainingHours}h early`;
    } else {
      return `Submitted ${Math.floor(diffHours)}h early`;
    }
  } else {
    // Submitted after due date
    if (diffDays > 0) {
      return `Submitted ${diffDays}d ${remainingHours}h late`;
    } else {
      return `Submitted ${Math.floor(diffHours)}h late`;
    }
  }
}

function renderAssignments(assignmentsData) {
  if (!assignmentsData || assignmentsData.length === 0) {
    assignmentList.innerHTML = `
      <div class="empty-state">
        <p>No assignments found</p>
        <p class="hint">You're all caught up!</p>
      </div>
    `;
    return;
  }

  const filteredAssignments = filterAssignments(assignmentsData);

  if (filteredAssignments.length === 0) {
    assignmentList.innerHTML = `
      <div class="empty-state">
        <p>No assignments match this filter</p>
        <p class="hint">Try a different filter</p>
      </div>
    `;
    return;
  }

  assignmentList.innerHTML = filteredAssignments.map(assignment => {
    const dueClass = getDueClass(assignment.dueDate);
    const dueText = formatDueDate(assignment.dueDate);
    const isOverdue = new Date(assignment.dueDate) < new Date();
    const category = detectCategory(assignment);
    const categoryTag = category === 'math' ? '<span class="category-tag math-tag">📐 Math</span>' :
                        category === 'coding' ? '<span class="category-tag coding-tag">💻 Coding</span>' : '';
    const hasGemini = settings && settings.geminiApiKey && settings.geminiApiKey.length > 0;
    const submissionTiming = getSubmissionTimingText(assignment);

    return `
      <div class="assignment-card ${assignment.submitted ? 'submitted' : ''}" data-assignment-id="${assignment.id}">
        <div class="assignment-header">
          <div class="assignment-title-row">
            <h3>${escapeHtml(assignment.name)}</h3>
            <div class="assignment-badges">
              ${assignment.submitted ? '<span class="status-badge submitted-badge">✓ Submitted</span>' : ''}
              ${isOverdue && !assignment.submitted ? '<span class="status-badge overdue-badge">⚠ Overdue</span>' : ''}
            </div>
          </div>
          ${categoryTag}
        </div>
        <div class="assignment-meta">
          <span class="assignment-course">${escapeHtml(assignment.courseName)}</span>
          <span class="assignment-due ${dueClass}">${dueText}</span>
        </div>
        ${assignment.submitted && assignment.submittedDate ? `
          <div class="submission-info">
            <div class="submission-date">
              <strong>📅 Submitted:</strong> ${new Date(assignment.submittedDate).toLocaleString()}
            </div>
            ${submissionTiming ? `<div class="submission-timing ${submissionTiming.includes('late') ? 'late' : 'early'}">${submissionTiming}</div>` : ''}
          </div>
        ` : ''}
        ${assignment.description ? `<p class="assignment-desc">${escapeHtml(assignment.description.substring(0, 150))}...</p>` : ''}
        ${assignment.attachments && assignment.attachments.length > 0 ? `
          <div class="assignment-files">
            <strong>📎 Attachments:</strong>
            ${assignment.attachments.map(file => `
              <div class="file-item-wrapper" data-attachment-id="${file.id}" data-course-name="${escapeHtml(assignment.courseName)}" data-assignment-name="${escapeHtml(assignment.name)}">
                <div class="file-item-info">
                  <span class="file-name">📄 ${escapeHtml(file.fileName)}</span>
                  <span class="file-size">${file.size ? formatFileSize(file.size) : ''}</span>
                </div>
                <div class="file-status" id="status-${file.id}">
                  <span class="status-text">Checking...</span>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
        <div class="assignment-actions">
          <button class="btn btn-action" onclick="summarizeAssignment('${assignment.id}')"${!hasGemini ? ' disabled title="Configure Gemini API key in settings"' : ''}>📝 Summary</button>
          <button class="btn btn-action btn-solve" onclick="solveAssignment('${assignment.id}')"${!hasGemini ? ' disabled title="Configure Gemini API key in settings"' : ''}>🤖 Solve</button>
          ${assignment.url ? `<button class="btn btn-action" onclick="viewAssignment('${assignment.url}')">👁️ View</button>` : ''}
          ${!assignment.submitted ? `<button class="btn btn-action btn-submit" onclick="openSubmitDialog('${assignment.id}')">📤 Submit</button>` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Check file status for all attachments after DOM is updated (only if not already checked)
  if (filteredAssignments.length > 0) {
    setTimeout(() => checkAllAttachmentStatus(), 100);
  }
}

// Check status for all attachments in the current view
function checkAllAttachmentStatus() {
  const wrappers = document.querySelectorAll('.file-item-wrapper');
  wrappers.forEach(wrapper => {
    const attachmentId = wrapper.dataset.attachmentId;
    const courseName = wrapper.dataset.courseName;
    const assignmentName = wrapper.dataset.assignmentName;
    const lectureName = wrapper.dataset.lectureName;

    // Check if this is a lecture or assignment attachment
    if (lectureName) {
      // Find the lecture and attachment data
      const lecture = lectures.find(l =>
        l.courseName === courseName && l.name === lectureName
      );

      if (lecture && lecture.attachments) {
        const attachment = lecture.attachments.find(f => f.id === attachmentId);
        if (attachment) {
          ipcRenderer.send('check-file-exists', {
            attachment: attachment,
            courseName: courseName,
            lectureName: lectureName
          });
        }
      }
    } else if (assignmentName) {
      // Find the assignment and attachment data
      const assignment = assignments.find(a =>
        a.courseName === courseName && a.name === assignmentName
      );

      if (assignment && assignment.attachments) {
        const attachment = assignment.attachments.find(f => f.id === attachmentId);
        if (attachment) {
          ipcRenderer.send('check-file-exists', {
            attachment: attachment,
            courseName: courseName,
            assignmentName: assignmentName
          });
        }
      }
    }
  });
}

function renderLectures(lecturesData) {
  if (!lecturesData || lecturesData.length === 0) {
    lecturesList.innerHTML = `
      <div class="empty-state">
        <p>No lectures found</p>
        <p class="hint">Check back later</p>
      </div>
    `;
    return;
  }

  lecturesList.innerHTML = lecturesData.map(lecture => {
    return `
      <div class="lecture-card" data-lecture-id="${lecture.id}">
        <h3>${escapeHtml(lecture.name)}</h3>
        <div class="lecture-meta">
          <span class="lecture-course">${escapeHtml(lecture.courseName)}</span>
          ${lecture.createdDate ? `<span class="lecture-date">${new Date(lecture.createdDate).toLocaleDateString()}</span>` : ''}
        </div>
        ${lecture.description ? `<p class="lecture-desc">${escapeHtml(lecture.description.substring(0, 150))}...</p>` : ''}
        ${lecture.attachments && lecture.attachments.length > 0 ? `
          <div class="lecture-files">
            <strong>📎 Attachments:</strong>
            ${lecture.attachments.map(file => `
              <div class="file-item-wrapper" data-attachment-id="${file.id}" data-course-name="${escapeHtml(lecture.courseName)}" data-lecture-name="${escapeHtml(lecture.name)}">
                <div class="file-item-info">
                  <span class="file-name">📄 ${escapeHtml(file.fileName)}</span>
                  <span class="file-size">${file.size ? formatFileSize(file.size) : ''}</span>
                </div>
                <div class="file-status" id="status-${file.id}">
                  <span class="status-text">Checking...</span>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
        <div class="lecture-actions">
          ${lecture.url ? `<button class="btn btn-action" onclick="viewAssignment('${lecture.url}')">👁️ View</button>` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Check file status for all attachments after DOM is updated
  if (lecturesData.length > 0) {
    setTimeout(() => checkAllAttachmentStatus(), 100);
  }
}

function getDueClass(dueDate) {
  const now = new Date();
  const due = new Date(dueDate);
  const hoursUntilDue = (due - now) / (1000 * 60 * 60);

  if (hoursUntilDue < 0) return 'urgent';
  if (hoursUntilDue < 24) return 'urgent';
  if (hoursUntilDue < 72) return 'soon';
  return '';
}

function formatDueDate(dueDate) {
  const now = new Date();
  const due = new Date(dueDate);
  const diff = due - now;

  if (diff < 0) return 'Overdue';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days === 0) {
    return `Due in ${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  return `Due in ${days} day${days !== 1 ? 's' : ''}`;
}

function formatTime(date) {
  const d = new Date(date);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Action button handlers
function summarizeAssignment(assignmentId) {
  const assignment = assignments.find(a => a.id === assignmentId);
  if (!assignment) return;

  addDebugLog(`Requesting summary for: ${assignment.name}`);
  const card = document.querySelector(`[data-assignment-id="${assignmentId}"]`);
  const btn = card.querySelector('button[onclick*="summarizeAssignment"]');
  btn.disabled = true;
  btn.textContent = '⏳ Summarizing...';

  ipcRenderer.send('summarize-assignment', assignment);
}

function solveAssignment(assignmentId) {
  const assignment = assignments.find(a => a.id === assignmentId);
  if (!assignment) return;

  addDebugLog(`Requesting solution for: ${assignment.name}`);
  const card = document.querySelector(`[data-assignment-id="${assignmentId}"]`);
  const btn = card.querySelector('button[onclick*="solveAssignment"]');
  btn.disabled = true;
  btn.textContent = '⏳ Solving...';

  ipcRenderer.send('solve-assignment', assignment);
}

function viewAssignment(url) {
  addDebugLog(`Opening assignment in browser: ${url}`);
  ipcRenderer.send('open-url', url);
}

function openFile(url) {
  addDebugLog(`Opening file: ${url}`);
  ipcRenderer.send('open-url', url);
}

function downloadAttachment(fileJson, subfolder) {
  try {
    const file = JSON.parse(fileJson);
    addDebugLog(`Downloading attachment: ${file.fileName}`);
    ipcRenderer.send('download-attachment', { attachment: file, subfolder });
  } catch (error) {
    addDebugLog(`Error downloading attachment: ${error.message}`, 'error');
  }
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// Listen for progress updates
ipcRenderer.on('solve-progress', (event, data) => {
  addDebugLog(`${data.status} (${data.progress}%)`, 'info');

  const card = document.querySelector(`[data-assignment-id="${data.assignmentId}"]`);
  if (card) {
    const btn = card.querySelector('button[onclick*="solveAssignment"]');
    if (btn) {
      // Update button text with progress
      btn.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 120px;">
          <div style="font-size: 11px;">${data.status}</div>
          <div style="width: 100%; background: rgba(255,255,255,0.3); height: 4px; border-radius: 2px; overflow: hidden;">
            <div style="width: ${data.progress}%; background: #2ecc71; height: 100%; transition: width 0.3s ease;"></div>
          </div>
        </div>
      `;
    }
  }
});

// Listen for AI responses
ipcRenderer.on('summary-result', (event, data) => {
  addDebugLog(`Summary received for: ${data.assignmentName}`, 'info');
  alert(`Summary for "${data.assignmentName}":\n\n${data.summary}`);

  // Re-enable button
  const card = document.querySelector(`[data-assignment-id="${data.assignmentId}"]`);
  if (card) {
    const btn = card.querySelector('button[onclick*="summarizeAssignment"]');
    if (btn) {
      btn.disabled = false;
      btn.textContent = '📝 Summary';
    }
  }
});

ipcRenderer.on('solve-result', (event, data) => {
  addDebugLog(`Solution saved to: ${data.filePath}`, 'info');

  // Check if we're in submit dialog mode
  if (currentSubmitAssignment && currentSubmitAssignment.id === data.assignmentId) {
    // We're in the submit dialog - automatically add solution.pdf to attachments
    addDebugLog('Adding generated solution.pdf to submission attachments');
    solutionPdfExists = true;
    submissionAttachments.push({
      fileName: 'solution.pdf',
      filePath: data.filePath,
      autoDetected: true
    });
    renderSubmissionAttachments();

    // Show success message
    alert(`Solution generated successfully!\nThe solution.pdf has been automatically added to your submission.`);
  } else {
    // Normal solve flow (not from submit dialog)
    alert(`Solution for "${data.assignmentName}" saved to:\n${data.filePath}\n\nWould you like to open it?`);

    // Re-enable button
    const card = document.querySelector(`[data-assignment-id="${data.assignmentId}"]`);
    if (card) {
      const btn = card.querySelector('button[onclick*="solveAssignment"]');
      if (btn) {
        btn.disabled = false;
        btn.textContent = '🤖 Solve';
      }
    }

    ipcRenderer.send('open-file', data.filePath);
  }
});

ipcRenderer.on('ai-error', (event, data) => {
  addDebugLog(`AI Error: ${data.error}`, 'error');
  alert(`Error: ${data.error}`);

  // Check if we're in submit dialog mode
  if (currentSubmitAssignment && currentSubmitAssignment.id === data.assignmentId) {
    // Re-render attachments to show the solve button again
    renderSubmissionAttachments();
  } else {
    // Re-enable buttons in the main assignment card
    const card = document.querySelector(`[data-assignment-id="${data.assignmentId}"]`);
    if (card) {
      const btns = card.querySelectorAll('button[onclick*="Assignment"]');
      btns.forEach(btn => {
        btn.disabled = false;
        if (btn.onclick && btn.onclick.toString().includes('summarize')) {
          btn.textContent = '📝 Summary';
        } else if (btn.onclick && btn.onclick.toString().includes('solve')) {
          btn.textContent = '🤖 Solve';
        }
      });
    }
  }
});

ipcRenderer.on('download-complete', (event, data) => {
  addDebugLog(`Downloaded: ${data.fileName} to ${data.filePath}`, 'info');

  // Store the actual file path
  downloadedFilePaths[data.attachmentId] = data.filePath;

  // Update status to show downloaded
  const statusDiv = document.getElementById(`status-${data.attachmentId}`);
  if (statusDiv) {
    statusDiv.innerHTML = `
      <span class="status-badge downloaded">✓ Downloaded</span>
      <button class="btn-download">📂 Open</button>
    `;
  }

  // Show success message and offer to open folder
  if (confirm(`Downloaded: ${data.fileName}\n\nSaved to: ${data.filePath}\n\nWould you like to open the folder?`)) {
    const path = require('path');
    const folderPath = path.dirname(data.filePath);
    ipcRenderer.send('open-file', folderPath);
  }
});

ipcRenderer.on('download-error', (event, data) => {
  addDebugLog(`Download failed: ${data.fileName} - ${data.error}`, 'error');
  alert(`Failed to download ${data.fileName}:\n${data.error}`);

  // Update status to show retry button
  const statusDiv = document.getElementById(`status-${data.attachmentId}`);
  if (statusDiv) {
    statusDiv.innerHTML = `
      <span class="status-badge error">✗ Failed</span>
      <button class="btn-download retry">🔄 Retry</button>
    `;
  }
});

// File existence check result
ipcRenderer.on('file-exists-result', (event, data) => {
  const statusDiv = document.getElementById(`status-${data.attachmentId}`);
  if (statusDiv) {
    if (data.exists) {
      // Store the file path if it exists
      if (data.filePath) {
        downloadedFilePaths[data.attachmentId] = data.filePath;
      }

      statusDiv.innerHTML = `
        <span class="status-badge downloaded">✓ Downloaded</span>
        <button class="btn-download">📂 Open</button>
      `;
    } else {
      // Simple download button - event delegation will handle the click
      statusDiv.innerHTML = `
        <button class="btn-download">⬇️ Download</button>
      `;
    }
  }
});

// Listen for download progress updates
ipcRenderer.on('download-progress', (event, data) => {
  const statusDiv = document.getElementById(`status-${data.attachmentId}`);
  if (statusDiv) {
    statusDiv.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 2px; min-width: 100px;">
        <div style="font-size: 10px;">${data.status}</div>
        <div style="width: 100%; background: rgba(0,0,0,0.1); height: 3px; border-radius: 2px; overflow: hidden;">
          <div style="width: ${data.progress}%; background: #3498db; height: 100%; transition: width 0.3s ease;"></div>
        </div>
      </div>
    `;
  }
});

// Download attachment by ID helper
function downloadAttachmentById(attachment, courseName, assignmentName) {
  addDebugLog(`Downloading: ${attachment.fileName}`);

  ipcRenderer.send('download-attachment', {
    attachment,
    courseName,
    assignmentName
  });
}

// Download lecture attachment by ID helper
function downloadLectureAttachmentById(attachment, courseName, lectureName) {
  addDebugLog(`Downloading lecture attachment: ${attachment.fileName}`);

  ipcRenderer.send('download-attachment', {
    attachment,
    courseName,
    lectureName
  });
}

// Global click handler for download buttons (using event delegation)
document.addEventListener('click', (e) => {
  const target = e.target;

  // Check if this is a button or clicked inside a button
  if (!target.classList.contains('btn-download')) return;

  // Handle retry buttons
  if (target.classList.contains('retry')) {
    const wrapper = target.closest('.file-item-wrapper');
    if (wrapper) {
      retryDownload(wrapper.dataset.attachmentId);
    }
    return;
  }

  // Handle open folder buttons (check if it has "📂" emoji)
  if (target.textContent.includes('📂')) {
    const statusDiv = target.closest('.file-status');
    if (statusDiv) {
      const attachmentId = statusDiv.id.replace('status-', '');
      openDownloadedFile(attachmentId);
    }
    return;
  }

  // Handle download buttons (check if it has "⬇️" emoji)
  if (target.textContent.includes('⬇️')) {
    const wrapper = target.closest('.file-item-wrapper');
    if (!wrapper) return;

    const attachmentId = wrapper.dataset.attachmentId;
    const courseName = wrapper.dataset.courseName;
    const lectureName = wrapper.dataset.lectureName;
    const assignmentName = wrapper.dataset.assignmentName;

    // Find the appropriate attachment
    if (lectureName) {
      const lecture = lectures.find(l => l.courseName === courseName && l.name === lectureName);
      if (lecture) {
        const attachment = lecture.attachments.find(f => f.id === attachmentId);
        if (attachment) {
          downloadLectureAttachmentById(attachment, courseName, lectureName);
        }
      }
    } else if (assignmentName) {
      const assignment = assignments.find(a => a.courseName === courseName && a.name === assignmentName);
      if (assignment) {
        const attachment = assignment.attachments.find(f => f.id === attachmentId);
        if (attachment) {
          downloadAttachmentById(attachment, courseName, assignmentName);
        }
      }
    }
  }
});

// Retry download helper
function retryDownload(attachmentId) {
  const wrapper = document.querySelector(`[data-attachment-id="${attachmentId}"]`);
  const lectureCard = wrapper ? wrapper.closest('.lecture-card') : null;
  const assignmentCard = wrapper ? wrapper.closest('.assignment-card') : null;

  // Check if this is a lecture or assignment
  if (lectureCard) {
    const lectureId = lectureCard.dataset.lectureId;
    const lecture = lectures.find(l => l.id === lectureId);

    if (lecture) {
      const attachment = lecture.attachments.find(f => f.id === attachmentId);
      if (attachment) {
        downloadLectureAttachmentById(attachment, lecture.courseName, lecture.name);
      }
    }
  } else if (assignmentCard) {
    const assignmentId = assignmentCard.dataset.assignmentId;
    const assignment = assignments.find(a => a.id === assignmentId);

    if (assignment) {
      const attachment = assignment.attachments.find(f => f.id === attachmentId);
      if (attachment) {
        downloadAttachmentById(attachment, assignment.courseName, assignment.name);
      }
    }
  }
}

// Open downloaded file helper - opens the folder containing the file
function openDownloadedFile(attachmentId) {
  // First, try to use the stored file path
  const filePath = downloadedFilePaths[attachmentId];

  if (filePath) {
    const path = require('path');
    const folderPath = path.dirname(filePath);
    addDebugLog(`Opening folder: ${folderPath}`);
    ipcRenderer.send('open-file', folderPath);
  } else {
    // Fallback: construct the path (shouldn't happen if everything works correctly)
    addDebugLog('File path not found in cache, constructing manually', 'warn');

    const wrapper = document.querySelector(`[data-attachment-id="${attachmentId}"]`);
    const lectureCard = wrapper ? wrapper.closest('.lecture-card') : null;
    const assignmentCard = wrapper ? wrapper.closest('.assignment-card') : null;

    // Check if this is a lecture or assignment
    if (lectureCard) {
      const lectureId = lectureCard.dataset.lectureId;
      const lecture = lectures.find(l => l.id === lectureId);

      if (lecture) {
        const attachment = lecture.attachments.find(f => f.id === attachmentId);
        if (attachment) {
          const path = require('path');
          const config = settings;
          const downloadsPath = config?.downloadPath || require('electron').app.getPath('downloads');
          const subfolder = `${lecture.courseName}/${lecture.name}`.replace(/[/\\?%*:|"<>]/g, '-');
          const constructedPath = path.join(downloadsPath, 'LMS Downloads', 'Lectures', subfolder, attachment.fileName);
          const folderPath = path.dirname(constructedPath);

          addDebugLog(`Opening folder (fallback): ${folderPath}`);
          ipcRenderer.send('open-file', folderPath);
        }
      } else {
        addDebugLog('Could not find lecture or attachment for opening folder', 'error');
      }
    } else if (assignmentCard) {
      const assignmentId = assignmentCard.dataset.assignmentId;
      const assignment = assignments.find(a => a.id === assignmentId);

      if (assignment) {
        const attachment = assignment.attachments.find(f => f.id === attachmentId);
        if (attachment) {
          const path = require('path');
          const config = settings;
          const downloadsPath = config?.downloadPath || require('electron').app.getPath('downloads');
          const subfolder = `${assignment.courseName}/${assignment.name}`.replace(/[/\\?%*:|"<>]/g, '-');
          const constructedPath = path.join(downloadsPath, 'LMS Downloads', subfolder, attachment.fileName);
          const folderPath = path.dirname(constructedPath);

          addDebugLog(`Opening folder (fallback): ${folderPath}`);
          ipcRenderer.send('open-file', folderPath);
        }
      } else {
        addDebugLog('Could not find assignment or attachment for opening folder', 'error');
      }
    }
  }
}

// Submit dialog state
let currentSubmitAssignment = null;
let submissionAttachments = [];
let solutionPdfExists = false;

// Open submit dialog
function openSubmitDialog(assignmentId) {
  const assignment = assignments.find(a => a.id === assignmentId);
  if (!assignment) return;

  currentSubmitAssignment = assignment;
  submissionAttachments = [];
  solutionPdfExists = false;

  // Show assignment info
  const submitInfo = document.getElementById('submitAssignmentInfo');
  submitInfo.innerHTML = `
    <h3>${escapeHtml(assignment.name)}</h3>
    <p><strong>Course:</strong> ${escapeHtml(assignment.courseName)}</p>
    <p><strong>Due:</strong> ${formatDueDate(assignment.dueDate)}</p>
  `;

  // Clear comment
  document.getElementById('submissionComment').value = '';

  // Check for solution.pdf in assignment folder
  addDebugLog(`Checking for solution.pdf in assignment folder...`);
  ipcRenderer.send('check-solution-pdf', {
    courseName: assignment.courseName,
    assignmentName: assignment.name
  });

  // Show modal
  document.getElementById('submitModal').classList.remove('hidden');
}

// Close submit dialog
function closeSubmitDialog() {
  document.getElementById('submitModal').classList.add('hidden');
  currentSubmitAssignment = null;
  submissionAttachments = [];
}

// Handle solution.pdf check result
ipcRenderer.on('solution-pdf-result', (event, data) => {
  if (data.exists && data.filePath) {
    addDebugLog(`Found solution.pdf: ${data.filePath}`);
    solutionPdfExists = true;
    // Auto-add solution.pdf to attachments
    submissionAttachments.push({
      fileName: 'solution.pdf',
      filePath: data.filePath,
      autoDetected: true
    });
  } else {
    addDebugLog('No solution.pdf found in assignment folder');
    solutionPdfExists = false;
  }
  renderSubmissionAttachments();
});

// Render submission attachments
function renderSubmissionAttachments() {
  const container = document.getElementById('submissionAttachments');
  const hasGemini = settings && settings.geminiApiKey && settings.geminiApiKey.length > 0;

  if (submissionAttachments.length === 0) {
    if (!solutionPdfExists && hasGemini) {
      container.innerHTML = `
        <div class="empty-message">
          <p>No solution.pdf found</p>
          <button class="btn btn-solve-inline" onclick="solveFromSubmitDialog()">
            🤖 Solve Assignment to Generate Solution
          </button>
        </div>
      `;
    } else {
      container.innerHTML = '<div class="empty-message">No attachments added yet</div>';
    }
    container.classList.add('empty');
    return;
  }

  container.classList.remove('empty');
  container.innerHTML = submissionAttachments.map((attachment, index) => `
    <div class="attachment-item">
      <div class="attachment-info">
        <div class="attachment-icon">📄</div>
        <div class="attachment-details">
          <div class="attachment-name">${escapeHtml(attachment.fileName)}</div>
          <div class="attachment-meta">${attachment.filePath ? attachment.filePath : 'To be selected'}</div>
        </div>
        ${attachment.autoDetected ? '<span class="attachment-badge">Auto-detected</span>' : ''}
      </div>
      <button class="btn-remove" onclick="removeSubmissionAttachment(${index})">Remove</button>
    </div>
  `).join('');
}

// Solve assignment from submit dialog
function solveFromSubmitDialog() {
  if (!currentSubmitAssignment) return;

  addDebugLog(`Solving assignment from submit dialog: ${currentSubmitAssignment.name}`);

  // Update the button to show loading state
  const container = document.getElementById('submissionAttachments');
  container.innerHTML = `
    <div class="empty-message">
      <p>⏳ Solving assignment...</p>
      <p style="font-size: 0.85rem; color: var(--text-secondary);">This may take a moment</p>
    </div>
  `;

  // Trigger solve assignment
  ipcRenderer.send('solve-assignment', currentSubmitAssignment);
}

// Add custom attachment
function addCustomAttachment() {
  addDebugLog('Requesting file selection for custom attachment...');
  ipcRenderer.send('select-submission-file');
}

// Handle file selection result
ipcRenderer.on('submission-file-selected', (event, data) => {
  if (data.filePath) {
    const path = require('path');
    const fileName = path.basename(data.filePath);
    addDebugLog(`File selected: ${fileName}`);

    submissionAttachments.push({
      fileName: fileName,
      filePath: data.filePath,
      autoDetected: false
    });

    renderSubmissionAttachments();
  }
});

// Remove submission attachment
function removeSubmissionAttachment(index) {
  const attachment = submissionAttachments[index];
  addDebugLog(`Removing attachment: ${attachment.fileName}`);
  submissionAttachments.splice(index, 1);
  renderSubmissionAttachments();
}

// Submit assignment
function submitAssignment() {
  if (!currentSubmitAssignment) return;

  const comment = document.getElementById('submissionComment').value;

  if (submissionAttachments.length === 0) {
    if (!confirm('You haven\'t added any attachments. Do you want to submit anyway?')) {
      return;
    }
  }

  addDebugLog(`Submitting assignment: ${currentSubmitAssignment.name}`);

  // Disable submit button
  const submitBtn = document.querySelector('.modal-footer .btn-primary');
  submitBtn.disabled = true;
  submitBtn.textContent = '⏳ Submitting...';

  ipcRenderer.send('submit-assignment', {
    assignment: currentSubmitAssignment,
    comment: comment,
    attachments: submissionAttachments
  });
}

// Handle submission result
ipcRenderer.on('submit-success', (event, data) => {
  addDebugLog(`Assignment submitted successfully: ${data.assignmentName}`, 'info');
  alert(`Successfully submitted: ${data.assignmentName}`);

  // Update the assignment as submitted
  const assignment = assignments.find(a => a.id === data.assignmentId);
  if (assignment) {
    assignment.submitted = true;
    assignment.submittedDate = new Date().toISOString();
  }

  // Re-render assignments
  renderAssignments(assignments);

  // Close dialog
  closeSubmitDialog();

  // Re-enable submit button
  const submitBtn = document.querySelector('.modal-footer .btn-primary');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Assignment';
  }
});

ipcRenderer.on('submit-error', (event, data) => {
  addDebugLog(`Submission failed: ${data.error}`, 'error');
  alert(`Failed to submit assignment:\n${data.error}`);

  // Re-enable submit button
  const submitBtn = document.querySelector('.modal-footer .btn-primary');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Assignment';
  }
});

// Initialize
addDebugLog('LMS Center initialized');
ipcRenderer.send('request-settings');
ipcRenderer.send('request-assignments');
ipcRenderer.send('request-courses');
ipcRenderer.send('request-lectures');
