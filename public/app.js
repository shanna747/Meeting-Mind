// Page navigation
let currentUser = null;
let selectedSubscription = 'free';

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

function showLogin() {
    showPage('login-page');
}

function showRegister() {
    showPage('register-page');
}

function showDashboard() {
    showPage('dashboard-page');
    showDashboardView();
    loadDashboardData();
}

function showDashboardView() {
    // Hide all dashboard views
    document.querySelectorAll('.dashboard-view').forEach(view => {
        view.classList.remove('active');
    });

    // Show dashboard view
    document.getElementById('dashboard-view').classList.add('active');

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector('.nav-link[onclick="showDashboardView()"]').classList.add('active');
}

function showKnowledgeHub() {
    // Hide all dashboard views
    document.querySelectorAll('.dashboard-view').forEach(view => {
        view.classList.remove('active');
    });

    // Show knowledge hub view
    document.getElementById('knowledge-hub-view').classList.add('active');

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector('.nav-link[onclick="showKnowledgeHub()"]').classList.add('active');

    // Load documents when viewing Knowledge Hub
    loadKnowledgeHubDocuments();
}

// Plan selection
function selectPlan(planType) {
    selectedSubscription = planType;
    document.querySelectorAll('.plan-card').forEach(card => {
        card.classList.remove('selected');
    });

    const radio = document.getElementById(`plan-${planType}`);
    if (radio) {
        radio.checked = true;
        radio.closest('.plan-card').classList.add('selected');
    }
}

// Authentication handlers
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showDashboard();
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}

async function handleRegister(event) {
    event.preventDefault();

    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const company = document.getElementById('register-company').value;

    // Get selected subscription
    const subscription = document.querySelector('input[name="subscription"]:checked').value;

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                email,
                password,
                company,
                subscription
            })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            showDashboard();
        } else {
            alert(data.error || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Registration failed. Please try again.');
    }
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showPage('landing-page');
}

// Dashboard functions
function loadDashboardData() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        document.getElementById('user-name').textContent = user.name;

        // Update subscription info
        const planNames = {
            'free': 'Starter (Free)',
            'pro': 'Professional',
            'business': 'Business'
        };

        const planLimits = {
            'free': '15 minutes',
            'pro': '30 minutes',
            'business': '60 minutes'
        };

        // Update both badge and old locations if they exist
        const currentPlanBadge = document.getElementById('current-plan-badge');
        const meetingLimitBadge = document.getElementById('meeting-limit-badge');

        if (currentPlanBadge) {
            currentPlanBadge.textContent = planNames[user.subscription] || 'Free';
        }
        if (meetingLimitBadge) {
            meetingLimitBadge.textContent = planLimits[user.subscription] || '15 minutes';
        }

        // Load active meetings
        loadActiveMeetings();

        // Load connection status
        loadConnectionStatus();
    }
}

async function loadActiveMeetings() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/integrations/meetings/active', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.meetings && data.meetings.length > 0) {
            displayActiveMeetings(data.meetings);
        }
    } catch (error) {
        console.error('Error loading meetings:', error);
    }
}

function displayActiveMeetings(meetings) {
    const container = document.getElementById('active-meetings-list');

    if (meetings.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No active meetings</p></div>';
        return;
    }

    container.innerHTML = meetings.map(meeting => `
        <div class="meeting-item">
            <h4>${meeting.title}</h4>
            <p>Platform: ${meeting.platform}</p>
            <p>Started: ${new Date(meeting.startTime).toLocaleTimeString()}</p>
            <p>Status: ${meeting.status}</p>
        </div>
    `).join('');
}

async function loadConnectionStatus() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/datasources/status', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        updateConnectionUI(data);
    } catch (error) {
        console.error('Error loading connection status:', error);
    }
}

function updateConnectionUI(connections) {
    // Update each connection card based on status
    Object.keys(connections).forEach(source => {
        const card = document.querySelector(`[data-source="${source}"]`);
        if (card && connections[source].connected) {
            const status = card.querySelector('.connection-status');
            status.classList.remove('disconnected');
            status.classList.add('connected');
            status.innerHTML = '<span class="status-indicator"></span><span>Connected</span>';

            const button = card.querySelector('button');
            button.textContent = 'Configure';
        }
    });
}

// Modal Management
function openConnectionModal(formId) {
    const modal = document.getElementById('connection-modal');
    const forms = document.querySelectorAll('.connection-form');

    // Hide all forms
    forms.forEach(form => form.classList.remove('active'));

    // Show selected form
    const selectedForm = document.getElementById(formId);
    if (selectedForm) {
        selectedForm.classList.add('active');
    }

    // Show modal
    modal.classList.add('active');
}

function closeConnectionModal() {
    const modal = document.getElementById('connection-modal');
    modal.classList.remove('active');

    // Reset all forms
    document.querySelectorAll('.connection-form').forEach(form => {
        form.classList.remove('active');
        form.querySelectorAll('input, select, textarea').forEach(input => {
            if (input.type !== 'file') {
                input.value = '';
            }
        });
    });

    // Clear file list
    document.getElementById('file-list').innerHTML = '';
}

// Tab Switching for Documentation
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    event.target.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Connection functions
function connectDocumentation() {
    openConnectionModal('documentation-form');
    setupFileUpload();
}


// File Upload Handler
function setupFileUpload() {
    const dropZone = document.getElementById('file-drop-zone');
    const fileInput = document.getElementById('doc-files');
    const fileList = document.getElementById('file-list');

    // Click to upload
    dropZone.addEventListener('click', () => fileInput.click());

    // File selection
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    function handleFiles(files) {
        fileList.innerHTML = '';
        Array.from(files).forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span class="file-item-name">${file.name} (${formatFileSize(file.size)})</span>
                <span class="file-item-remove" onclick="removeFile(${index})">Remove</span>
            `;
            fileList.appendChild(fileItem);
        });
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
}

function removeFile(index) {
    const fileInput = document.getElementById('doc-files');
    const dt = new DataTransfer();
    const files = Array.from(fileInput.files);

    files.forEach((file, i) => {
        if (i !== index) dt.items.add(file);
    });

    fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event('change'));
}

// Submit Functions
async function submitDocumentation() {
    const fileInput = document.getElementById('doc-files');
    const urlInput = document.getElementById('doc-url');
    const category = document.getElementById('doc-category').value;
    const tags = document.getElementById('doc-tags').value;

    const formData = new FormData();

    // Add files if any
    if (fileInput.files.length > 0) {
        Array.from(fileInput.files).forEach(file => {
            formData.append('files', file);
        });
    }

    // Add URL if provided
    if (urlInput.value) {
        formData.append('url', urlInput.value);
    }

    formData.append('category', category);
    formData.append('tags', tags);

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/datasources/documentation/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();
        if (response.ok) {
            alert('Documentation connected successfully!');
            closeConnectionModal();
            loadConnectionStatus();
        } else {
            alert(data.error || 'Failed to connect documentation');
        }
    } catch (error) {
        console.error('Documentation upload error:', error);
        alert('Failed to upload documentation');
    }
}


// Meeting platform connections
async function connectZoom() {
    alert('Zoom integration: Install the Answerly.ai app from the Zoom App Marketplace, then configure your webhook URL in the Zoom dashboard.\n\nWebhook URL: ' + window.location.origin + '/api/integrations/zoom/webhook');
}

async function connectTeams() {
    alert('Microsoft Teams integration: Go to your Azure AD portal, register the Answerly.ai app, and configure OAuth permissions.\n\nRedirect URI: ' + window.location.origin + '/api/integrations/teams/auth/callback');
}

async function connectGoogleMeet() {
    alert('Google Meet integration: Create a Google Cloud project, enable the Google Meet API, and configure OAuth credentials.\n\nRedirect URI: ' + window.location.origin + '/api/integrations/google-meet/auth/callback');
}

function showUpgrade() {
    if (confirm('Would you like to upgrade your plan?')) {
        showRegister();
    }
}

// WebSocket connection for real-time updates
let ws = null;

function connectWebSocket() {
    if (!currentUser) return;

    ws = new WebSocket(`ws://${window.location.host}`);

    ws.onopen = () => {
        console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        switch (data.type) {
            case 'transcript_update':
                handleTranscriptUpdate(data.data);
                break;
            case 'meeting_started':
                loadActiveMeetings();
                break;
            case 'meeting_ended':
                loadActiveMeetings();
                break;
            case 'time_limit_warning':
                showTimeLimitWarning(data.data);
                break;
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        // Reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
    };
}

function handleTranscriptUpdate(data) {
    console.log('New transcript:', data);
    // Update UI with new transcript data
}

function showTimeLimitWarning(data) {
    alert(`Meeting time limit approaching! You have ${data.remainingMinutes} minutes left.`);
}

// Knowledge Hub Functions
let allDocuments = [];
let currentFilter = 'all';

async function loadKnowledgeHubDocuments() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/datasources/documents', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (data.documents) {
            allDocuments = data.documents;
            updateKnowledgeHubStats();
            displayDocuments(allDocuments);
        }
    } catch (error) {
        console.error('Error loading documents:', error);
    }
}

function updateKnowledgeHubStats() {
    const active = allDocuments.filter(doc => doc.status === 'active').length;
    const archived = allDocuments.filter(doc => doc.status === 'archived').length;
    const totalSize = allDocuments.reduce((sum, doc) => sum + (doc.size || 0), 0);

    document.getElementById('total-documents').textContent = allDocuments.length;
    document.getElementById('active-documents').textContent = active;
    document.getElementById('archived-documents').textContent = archived;
    document.getElementById('total-size').textContent = (totalSize / (1024 * 1024)).toFixed(2) + ' MB';
}

function filterDocuments(filter) {
    currentFilter = filter;

    // Update button states
    document.querySelectorAll('.section-actions button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    let filteredDocs = allDocuments;
    if (filter === 'active') {
        filteredDocs = allDocuments.filter(doc => doc.status === 'active');
    } else if (filter === 'archived') {
        filteredDocs = allDocuments.filter(doc => doc.status === 'archived');
    }

    displayDocuments(filteredDocs);
}

function displayDocuments(documents) {
    const tbody = document.getElementById('documents-table-body');

    if (documents.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-state-row">
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <div class="empty-state">
                        <p>No documents found.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = documents.map(doc => `
        <tr data-doc-id="${doc.id}">
            <td>
                <div class="doc-name">
                    <span class="doc-icon">${getDocIcon(doc.source)}</span>
                    <span>${doc.name}</span>
                </div>
            </td>
            <td>${doc.source}</td>
            <td><span class="category-badge">${doc.category || 'General'}</span></td>
            <td>${formatFileSize(doc.size || 0)}</td>
            <td>${formatDate(doc.createdAt)}</td>
            <td>
                <span class="status-badge ${doc.status}">${doc.status}</span>
            </td>
            <td>
                <div class="action-buttons">
                    ${doc.status === 'active' ?
                        `<button class="btn-icon" onclick="archiveDocument('${doc.id}')" title="Archive">
                            📦
                        </button>` :
                        `<button class="btn-icon" onclick="unarchiveDocument('${doc.id}')" title="Unarchive">
                            📂
                        </button>`
                    }
                    <button class="btn-icon btn-danger" onclick="deleteDocument('${doc.id}')" title="Delete">
                        🗑️
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function getDocIcon(source) {
    const icons = {
        'documentation': '📚',
        'slack': '💬',
        'google-sheets': '📊',
        'notion': '📝',
        'confluence': '🌐',
        'upload': '📄'
    };
    return icons[source] || '📄';
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function archiveDocument(docId) {
    if (!confirm('Archive this document? It will no longer be used in AI responses.')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/datasources/documents/${docId}/archive`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            await loadKnowledgeHubDocuments();
        } else {
            alert('Failed to archive document');
        }
    } catch (error) {
        console.error('Error archiving document:', error);
        alert('Failed to archive document');
    }
}

async function unarchiveDocument(docId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/datasources/documents/${docId}/unarchive`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            await loadKnowledgeHubDocuments();
        } else {
            alert('Failed to unarchive document');
        }
    } catch (error) {
        console.error('Error unarchiving document:', error);
        alert('Failed to unarchive document');
    }
}

async function deleteDocument(docId) {
    if (!confirm('Are you sure you want to permanently delete this document? This action cannot be undone.')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/datasources/documents/${docId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            await loadKnowledgeHubDocuments();
        } else {
            alert('Failed to delete document');
        }
    } catch (error) {
        console.error('Error deleting document:', error);
        alert('Failed to delete document');
    }
}

// Check if user is already logged in
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
        currentUser = JSON.parse(user);
        showDashboard();
        connectWebSocket();
    } else {
        showPage('landing-page');
    }
});