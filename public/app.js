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

            const actions = card.querySelector('.connection-actions');
            const button = actions?.querySelector('.btn-primary');

            // For documentation, change to "Add" and show Answerly button
            if (source === 'documentation') {
                if (button) button.textContent = 'Add';
                const answerlyBtn = actions?.querySelector('.btn-answerly');
                if (answerlyBtn) answerlyBtn.style.display = 'block';
            } else {
                if (button) button.textContent = 'Configure';
            }
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
            const message = data.totalFiles > data.filesUploaded
                ? `${data.filesUploaded} file(s) added successfully! Total: ${data.totalFiles} files`
                : 'Documentation connected successfully!';
            alert(message);
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
                    <span class="doc-icon">${getDocIcon(doc.originalName || doc.filename)}</span>
                    <span>${doc.originalName || doc.filename || 'Untitled'}</span>
                </div>
            </td>
            <td>Documentation</td>
            <td><span class="category-badge">${doc.category || 'General'}</span></td>
            <td>${formatFileSize(doc.size || 0)}</td>
            <td>${formatDate(doc.uploadedAt)}</td>
            <td>
                <span class="status-badge ${doc.status || 'active'}">${doc.status || 'active'}</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="viewDocument('${doc.id}')" title="View">
                        👁️
                    </button>
                    <button class="btn-icon" onclick="editDocument('${doc.id}')" title="Edit">
                        ✏️
                    </button>
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

function getDocIcon(filename) {
    if (!filename) return '📄';

    const ext = filename.toLowerCase().split('.').pop();
    const icons = {
        'pdf': '📕',
        'doc': '📘',
        'docx': '📘',
        'txt': '📄',
        'md': '📝',
        'csv': '📊',
        'xlsx': '📊',
        'xls': '📊'
    };
    return icons[ext] || '📄';
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

async function viewDocument(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) {
        alert('Document not found');
        return;
    }

    // Set document title and metadata
    document.getElementById('view-doc-title-header').textContent = doc.originalName || doc.filename;
    document.getElementById('view-doc-metadata').innerHTML = `
        <strong>Category:</strong> ${doc.category || 'General'} &nbsp;|&nbsp;
        <strong>Tags:</strong> ${doc.tags?.join(', ') || 'None'} &nbsp;|&nbsp;
        <strong>Size:</strong> ${formatFileSize(doc.size || 0)} &nbsp;|&nbsp;
        <strong>Uploaded:</strong> ${formatDate(doc.uploadedAt)} &nbsp;|&nbsp;
        <strong>Status:</strong> ${doc.status || 'active'}
    `;

    // Show loading message
    const contentArea = document.getElementById('view-doc-content');
    contentArea.textContent = 'Loading document content...';

    // Show the modal
    document.getElementById('view-document-modal').classList.add('active');

    // Fetch document content from server
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/datasources/documents/${docId}/content`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            contentArea.textContent = data.content || '[No content available]';
        } else {
            contentArea.textContent = '[Error loading document content]';
        }
    } catch (error) {
        console.error('Error loading document content:', error);
        contentArea.textContent = '[Error loading document content]';
    }
}

function closeViewDocumentModal() {
    document.getElementById('view-document-modal').classList.remove('active');
}

let currentEditingDocId = null;

async function editDocument(docId) {
    const doc = allDocuments.find(d => d.id === docId);
    if (!doc) {
        alert('Document not found');
        return;
    }

    currentEditingDocId = docId;

    // Populate the edit form
    document.getElementById('edit-doc-title').value = doc.originalName || doc.filename || '';
    document.getElementById('edit-doc-category').value = doc.category || 'other';
    document.getElementById('edit-doc-tags').value = doc.tags?.join(', ') || '';
    document.getElementById('edit-doc-status').value = doc.status || 'active';

    // Show loading message in content area
    const contentArea = document.getElementById('edit-doc-content');
    contentArea.value = 'Loading document content...';

    // Show the modal
    document.getElementById('edit-document-modal').classList.add('active');

    // Fetch document content from server
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/datasources/documents/${docId}/content`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            contentArea.value = data.content || '';

            // Disable editing for binary files
            if (data.isBinary) {
                contentArea.disabled = true;
                contentArea.style.backgroundColor = '#f5f5f5';
                contentArea.style.cursor = 'not-allowed';
            } else {
                contentArea.disabled = false;
                contentArea.style.backgroundColor = 'white';
                contentArea.style.cursor = 'text';
            }
        } else {
            contentArea.value = '[Error loading document content]';
        }
    } catch (error) {
        console.error('Error loading document content:', error);
        contentArea.value = '[Error loading document content]';
    }
}

function closeEditDocumentModal() {
    document.getElementById('edit-document-modal').classList.remove('active');
    currentEditingDocId = null;
}

async function saveDocumentEdits() {
    if (!currentEditingDocId) {
        alert('No document selected for editing');
        return;
    }

    const title = document.getElementById('edit-doc-title').value;
    const category = document.getElementById('edit-doc-category').value;
    const tags = document.getElementById('edit-doc-tags').value;
    const status = document.getElementById('edit-doc-status').value;
    const content = document.getElementById('edit-doc-content').value;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/datasources/documents/${currentEditingDocId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, category, tags, status, content })
        });

        if (response.ok) {
            alert('Document updated successfully!');
            closeEditDocumentModal();
            await loadKnowledgeHubDocuments();
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to update document');
        }
    } catch (error) {
        console.error('Error updating document:', error);
        alert('Failed to update document');
    }
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

// Answerly Functions
let answerlyActive = false;
let recognition = null;
let answerlyInterval = null;

function activateAnswerly() {
    document.getElementById('answerly-modal').classList.add('active');
}

function closeAnswerlyModal() {
    if (answerlyActive) {
        if (!confirm('Answerly is currently listening. Are you sure you want to close?')) {
            return;
        }
        stopAnswerly();
    }
    document.getElementById('answerly-modal').classList.remove('active');
}

function startAnswerly() {
    // Hide inactive view, show active view
    document.getElementById('answerly-inactive').style.display = 'none';
    document.getElementById('answerly-active').style.display = 'block';
    answerlyActive = true;

    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }

            // Update live transcript
            const transcriptDiv = document.getElementById('live-transcript');
            transcriptDiv.textContent = transcript || 'Listening...';
            transcriptDiv.scrollTop = transcriptDiv.scrollHeight;

            // Check for questions and generate answers
            if (event.results[event.results.length - 1].isFinal) {
                detectAndAnswerQuestions(transcript);
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
        };

        recognition.start();
    } else {
        alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
        stopAnswerly();
    }
}

function stopAnswerly() {
    answerlyActive = false;
    if (recognition) {
        recognition.stop();
        recognition = null;
    }

    // Reset UI
    document.getElementById('answerly-inactive').style.display = 'block';
    document.getElementById('answerly-active').style.display = 'none';
    document.getElementById('live-transcript').textContent = 'Waiting for conversation...';
}

async function detectAndAnswerQuestions(text) {
    // Simple question detection (can be enhanced with AI)
    const questionWords = ['what', 'how', 'when', 'where', 'who', 'why', 'can', 'does', 'is', 'are'];
    const sentences = text.toLowerCase().split(/[.!?]+/);

    for (const sentence of sentences) {
        const isQuestion = questionWords.some(word => sentence.trim().startsWith(word)) || sentence.includes('?');

        if (isQuestion && sentence.trim().length > 10) {
            // Generate answer from knowledge base
            await generateAnswer(sentence.trim());
        }
    }
}

async function generateAnswer(question) {
    const responsesDiv = document.getElementById('answerly-responses');

    // Clear "No questions" message if present
    if (responsesDiv.textContent.includes('No questions detected')) {
        responsesDiv.innerHTML = '';
    }

    // Add question to UI
    const qaBlock = document.createElement('div');
    qaBlock.style.cssText = 'margin-bottom: 16px; padding: 16px; background: var(--background-alt); border-radius: 8px; border-left: 4px solid var(--primary-color);';
    qaBlock.innerHTML = `
        <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">❓ ${question}</div>
        <div style="color: var(--text-secondary); font-size: 14px;">
            <span style="display: inline-block; animation: pulse 1s infinite;">💭 Generating answer...</span>
        </div>
    `;
    responsesDiv.insertBefore(qaBlock, responsesDiv.firstChild);

    // Simulate AI answer generation (replace with actual AI call)
    try {
        // This is a placeholder - you would call your AI/search backend here
        const answer = await simulateAIAnswer(question);

        qaBlock.innerHTML = `
            <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">❓ ${question}</div>
            <div style="color: var(--text-secondary); font-size: 14px; line-height: 1.6;">
                ✅ ${answer}
            </div>
        `;
    } catch (error) {
        qaBlock.innerHTML = `
            <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">❓ ${question}</div>
            <div style="color: var(--error-color); font-size: 14px;">
                ❌ Error generating answer
            </div>
        `;
    }

    responsesDiv.scrollTop = 0;
}

async function simulateAIAnswer(question) {
    // Placeholder function - replace with actual AI/knowledge base search
    await new Promise(resolve => setTimeout(resolve, 1500));
    return "Based on your knowledge base, here's the answer to your question. This is a demo response that would be replaced with actual AI-generated content from your uploaded documents.";
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