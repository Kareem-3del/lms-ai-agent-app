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
});

cancelBtn.addEventListener('click', () => {
  settingsPanel.classList.add('hidden');
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

useHandwriting.addEventListener('change', () => {
  if (useHandwriting.checked) {
    handwritingOptions.style.display = 'block';
  } else {
    handwritingOptions.style.display = 'none';
  }
});

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
    handwritingFont: formData.get('handwritingFont') || 'Caveat'
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
    document.getElementById('handwritingFont').value = settings.handwritingFont || 'Caveat';
    if (settings.useHandwriting) {
      document.getElementById('handwritingOptions').style.display = 'block';
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

    // Re-render assignments to update action buttons based on geminiApiKey
    if (assignments && assignments.length > 0) {
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
  courses = coursesData;
  addDebugLog(`Loaded ${courses.length} courses`);
  renderCourses(courses);
});

ipcRenderer.on('assignments-updated', (event, assignmentsData) => {
  assignments = assignmentsData;
  addDebugLog(`Loaded ${assignments.length} assignments`);
  renderAssignments(assignments);
});

ipcRenderer.on('lectures-updated', (event, lecturesData) => {
  lectures = lecturesData;
  addDebugLog(`Loaded ${lectures.length} lectures`);
  renderLectures(lectures);
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

  // Check file status for all attachments after DOM is updated
  setTimeout(() => checkAllAttachmentStatus(), 100);
}

// Check status for all attachments in the current view
function checkAllAttachmentStatus() {
  const wrappers = document.querySelectorAll('.file-item-wrapper');
  wrappers.forEach(wrapper => {
    const attachmentId = wrapper.dataset.attachmentId;
    const courseName = wrapper.dataset.courseName;
    const assignmentName = wrapper.dataset.assignmentName;

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
      <div class="lecture-card">
        <h3>${escapeHtml(lecture.name)}</h3>
        <div class="lecture-meta">
          <span class="lecture-course">${escapeHtml(lecture.courseName)}</span>
          ${lecture.createdDate ? `<span class="lecture-date">${new Date(lecture.createdDate).toLocaleDateString()}</span>` : ''}
        </div>
        ${lecture.description ? `<p class="lecture-desc">${escapeHtml(lecture.description.substring(0, 150))}...</p>` : ''}
        ${lecture.attachments && lecture.attachments.length > 0 ? `
          <div class="lecture-files">
            ${lecture.attachments.map(file => `
              <div class="file-item" onclick="openFile('${file.url}')">
                📄 ${escapeHtml(file.fileName)}
              </div>
            `).join('')}
          </div>
        ` : ''}
        ${lecture.url ? `<button class="btn btn-action" onclick="viewAssignment('${lecture.url}')">👁️ View</button>` : ''}
      </div>
    `;
  }).join('');
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
      <button class="btn-download" onclick="openDownloadedFile('${data.attachmentId}')">📂 Open</button>
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
      <button class="btn-download retry" onclick="retryDownload('${data.attachmentId}')">🔄 Retry</button>
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
        <button class="btn-download" onclick="openDownloadedFile('${data.attachmentId}')">📂 Open</button>
      `;
    } else {
      // Find the attachment data from the wrapper
      const wrapper = statusDiv.closest('.file-item-wrapper');
      const assignmentCard = statusDiv.closest('.assignment-card');
      const assignmentId = assignmentCard ? assignmentCard.dataset.assignmentId : '';
      const assignment = assignments.find(a => a.id === assignmentId);

      if (assignment) {
        const attachment = assignment.attachments.find(f => f.id === data.attachmentId);
        if (attachment) {
          statusDiv.innerHTML = `
            <button class="btn-download" onclick='downloadAttachmentById(${JSON.stringify(attachment)}, "${assignment.courseName.replace(/'/g, "\\'")}", "${assignment.name.replace(/'/g, "\\'")}")'>⬇️ Download</button>
          `;
        }
      }
    }
  }
});

// Download attachment by ID helper
function downloadAttachmentById(attachment, courseName, assignmentName) {
  addDebugLog(`Downloading: ${attachment.fileName}`);

  // Update status to show downloading
  const statusDiv = document.getElementById(`status-${attachment.id}`);
  if (statusDiv) {
    statusDiv.innerHTML = `<span class="status-text downloading">⏳ Downloading...</span>`;
  }

  ipcRenderer.send('download-attachment', {
    attachment,
    courseName,
    assignmentName
  });
}

// Retry download helper
function retryDownload(attachmentId) {
  const wrapper = document.querySelector(`[data-attachment-id="${attachmentId}"]`);
  const assignmentCard = wrapper ? wrapper.closest('.assignment-card') : null;
  const assignmentId = assignmentCard ? assignmentCard.dataset.assignmentId : '';
  const assignment = assignments.find(a => a.id === assignmentId);

  if (assignment) {
    const attachment = assignment.attachments.find(f => f.id === attachmentId);
    if (attachment) {
      downloadAttachmentById(attachment, assignment.courseName, assignment.name);
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
    const assignmentCard = wrapper ? wrapper.closest('.assignment-card') : null;
    const assignmentId = assignmentCard ? assignmentCard.dataset.assignmentId : '';
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
