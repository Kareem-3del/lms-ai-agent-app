const { ipcRenderer } = require('electron');

const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const settingsForm = document.getElementById('settingsForm');
const cancelBtn = document.getElementById('cancelBtn');
const assignmentList = document.getElementById('assignmentList');
const connectionStatus = document.getElementById('connectionStatus');
const lastCheck = document.getElementById('lastCheck');
const useCredentialLogin = document.getElementById('useCredentialLogin');
const credentialFields = document.getElementById('credentialFields');
const tokenField = document.getElementById('tokenField');

settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.toggle('hidden');
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

settingsForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const formData = new FormData(settingsForm);
  const useCredentials = formData.get('useCredentialLogin') === 'on';

  const settings = {
    lmsType: formData.get('lmsType'),
    lmsUrl: formData.get('lmsUrl'),
    useCredentialLogin: useCredentials,
    checkInterval: parseInt(formData.get('checkInterval')),
    soundEnabled: formData.get('soundEnabled') === 'on',
    autoDownload: formData.get('autoDownload') === 'on',
    downloadPath: formData.get('downloadPath')
  };

  if (useCredentials) {
    settings.username = formData.get('username');
    settings.password = formData.get('password');
  } else {
    settings.apiToken = formData.get('apiToken');
  }

  connectionStatus.textContent = 'Connecting...';
  connectionStatus.className = 'checking';

  ipcRenderer.send('save-settings', settings);
});

ipcRenderer.on('settings-loaded', (event, settings) => {
  if (settings) {
    document.getElementById('lmsType').value = settings.lmsType || 'canvas';
    document.getElementById('lmsUrl').value = settings.lmsUrl || '';
    document.getElementById('checkInterval').value = settings.checkInterval || 15;
    document.getElementById('soundEnabled').checked = settings.soundEnabled !== false;
    document.getElementById('autoDownload').checked = settings.autoDownload !== false;
    document.getElementById('downloadPath').value = settings.downloadPath || '';

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
  }
});

ipcRenderer.on('login-success', (event, message) => {
  connectionStatus.textContent = 'Connected';
  connectionStatus.className = 'connected';
  settingsPanel.classList.add('hidden');
});

ipcRenderer.on('login-error', (event, error) => {
  connectionStatus.textContent = 'Login Failed';
  connectionStatus.className = 'disconnected';
  alert(`Login failed: ${error}`);
});

ipcRenderer.on('connection-status', (event, status) => {
  connectionStatus.textContent = status;
  connectionStatus.className = status.toLowerCase();
});

ipcRenderer.on('last-check-time', (event, time) => {
  lastCheck.textContent = `Last check: ${formatTime(time)}`;
});

ipcRenderer.on('assignments-updated', (event, assignments) => {
  renderAssignments(assignments);
});

function renderAssignments(assignments) {
  if (!assignments || assignments.length === 0) {
    assignmentList.innerHTML = `
      <div class="empty-state">
        <p>No assignments found</p>
        <p class="hint">You're all caught up!</p>
      </div>
    `;
    return;
  }

  assignmentList.innerHTML = assignments.map(assignment => {
    const dueClass = getDueClass(assignment.dueDate);
    const dueText = formatDueDate(assignment.dueDate);

    return `
      <div class="assignment-card">
        <h3>${escapeHtml(assignment.name)}</h3>
        <div class="assignment-meta">
          <span class="assignment-course">${escapeHtml(assignment.courseName)}</span>
          <span class="assignment-due ${dueClass}">${dueText}</span>
        </div>
        ${assignment.description ? `<p>${escapeHtml(assignment.description)}</p>` : ''}
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

ipcRenderer.send('request-settings');
ipcRenderer.send('request-assignments');
