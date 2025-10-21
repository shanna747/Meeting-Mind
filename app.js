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

function showHowItWorks() {
    showPage('how-it-works-page');
}

function showDashboard() {
    showPage('dashboard-page');

    // Load dashboard data (including user name)
    loadDashboardData();

    // Check if user is new (no documents uploaded)
    checkIfNewUser();

    // Show Agent page by default after login
    showDashboardHome();

    // Ensure dashboard highlights are loaded (in case of timing issues)
    setTimeout(() => {
        loadDashboardHighlights();
    }, 100);
}

async function checkIfNewUser() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/datasources/documents', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        const documents = data.documents || [];

        // Always show Answerly dashboard (onboarding removed)
        showAnswerlyDashboard();
    } catch (error) {
        console.error('Error checking user status:', error);
        // Default to showing Answerly dashboard
        showAnswerlyDashboard();
    }
}

function showAnswerlyDashboard() {
    // Hide all dashboard views
    document.querySelectorAll('.dashboard-view').forEach(view => {
        view.classList.remove('active');
    });

    // Show dashboard home view (Agent board)
    document.getElementById('dashboard-home-view').classList.add('active');

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    const agentNavLink = document.querySelector('.nav-link[onclick="showDashboardHome()"]');
    if (agentNavLink) {
        agentNavLink.classList.add('active');
    }

    // Load dashboard highlights to show empty state or active content
    loadDashboardHighlights();
}


async function loadAnswerlyDashboardStats() {
    try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user'));

        // Load document count
        const docsResponse = await fetch('/api/datasources/documents', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const docsData = await docsResponse.json();
        const allDocuments = docsData.documents || [];

        // Count only ACTIVE documents
        const activeDocCount = allDocuments.filter(doc => doc.status === 'active').length;

        // Display active document count
        document.getElementById('answerly-docs-count').textContent = activeDocCount;

        // Enable/disable Go Live button based on ACTIVE document count
        const activateBtn = document.getElementById('answerly-activate-btn');
        const heroTitle = document.getElementById('answerly-hero-title');
        const heroSubtitle = document.getElementById('answerly-hero-subtitle');

        if (activeDocCount === 0) {
            activateBtn.disabled = true;
            // Keep default title and subtitle
            heroTitle.textContent = 'Ready to Start Listening?';
            heroSubtitle.textContent = 'Upload documents to the Knowledge Hub to activate Answerly';
        } else {
            activateBtn.disabled = false;
            // Change title and subtitle when documents are active
            heroTitle.textContent = 'Real Time Answers';
            heroSubtitle.textContent = 'Knowledge is power and key to success';
        }

        // Set time limit based on subscription
        const timeLimits = {
            'free': '15 min',
            'pro': '30 min',
            'business': '60 min'
        };
        document.getElementById('answerly-time-limit').textContent = timeLimits[user?.subscription] || '15 min';

        // Load questions count
        const notesResponse = await fetch('/api/meeting-notes?status=completed', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const notesData = await notesResponse.json();
        const meetings = notesData.meetings || [];
        const totalQuestions = meetings.reduce((sum, m) => sum + (m.summary?.answeredQuestions || 0), 0);
        document.getElementById('answerly-questions-count').textContent = totalQuestions;
    } catch (error) {
        console.error('Error loading Answerly dashboard stats:', error);
    }
}


function showUserProfile() {
    // Show settings modal
    document.getElementById('settings-modal').style.display = 'block';

    // Load user profile data
    if (currentUser) {
        document.getElementById('settings-name').textContent = currentUser.name || currentUser.email;
        document.getElementById('settings-email').textContent = currentUser.email;

        // Display plan name
        const planName = currentUser.subscription || 'free';
        let planDisplay = 'Starter';
        if (planName === 'pro') {
            planDisplay = 'Pro';
        } else if (planName === 'business') {
            planDisplay = 'Business';
        }
        document.getElementById('settings-current-plan').textContent = planDisplay;

        // Set the select dropdown to current plan
        document.getElementById('settings-plan-select').value = planName;
    }
}

function closeSettingsModal() {
    document.getElementById('settings-modal').style.display = 'none';
    document.getElementById('delete-confirm-input').value = ''; // Clear the delete confirmation input
}

async function updateSubscriptionPlan() {
    const newPlan = document.getElementById('settings-plan-select').value;

    if (!confirm(`Are you sure you want to change your plan to ${newPlan}?`)) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/auth/update-subscription', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ subscription: newPlan })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser.subscription = newPlan;
            localStorage.setItem('user', JSON.stringify(currentUser));
            alert('Subscription plan updated successfully!');
            showUserProfile(); // Refresh the settings page
        } else {
            alert(data.error || 'Failed to update subscription plan');
        }
    } catch (error) {
        console.error('Update subscription error:', error);
        alert('Failed to update subscription plan');
    }
}

async function pauseSubscription() {
    if (!confirm('Are you sure you want to pause your subscription? You can reactivate it anytime.')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/auth/pause-subscription', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            alert('Subscription paused successfully. You can reactivate it anytime from Settings.');
        } else {
            alert(data.error || 'Failed to pause subscription');
        }
    } catch (error) {
        console.error('Pause subscription error:', error);
        alert('Failed to pause subscription');
    }
}

async function deleteAccount() {
    const confirmText = document.getElementById('delete-confirm-input').value;

    if (confirmText !== 'DELETE') {
        alert('Please type DELETE in the box to confirm account deletion.');
        return;
    }

    if (!confirm('Are you absolutely sure? This action cannot be undone and all your data will be permanently deleted.')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/auth/delete-account', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            alert('Your account has been successfully deleted.');
            handleLogout();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to delete account. Please try again.');
        }
    } catch (error) {
        console.error('Error deleting account:', error);
        alert('Failed to delete account. Please try again.');
    }
}

function showMeetingNotes() {
    // Hide all dashboard views
    document.querySelectorAll('.dashboard-view').forEach(view => {
        view.classList.remove('active');
    });

    // Show meeting notes view
    document.getElementById('meeting-notes-view').classList.add('active');

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector('.nav-link[onclick="showMeetingNotes()"]').classList.add('active');

    // Load meeting notes
    loadMeetingNotes();
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

function showDashboardTab(event, tabName) {
    if (event) event.preventDefault();

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    if (event) {
        event.target.classList.add('active');
    }

    // Update tab content
    document.querySelectorAll('.dashboard-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Load brain data if switching to brain tab
    if (tabName === 'brain') {
        loadBrainData();
    }
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

        // Load connection status and documents
        loadConnectionStatus();
        loadKnowledgeHubDocuments();
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
    // Update each connection card based on status, but NOT documentation
    // Documentation status is determined by document count, not API status
    Object.keys(connections).forEach(source => {
        if (source === 'documentation') return; // Skip documentation, handled by updateAgentCardVisibility

        const card = document.querySelector(`[data-source="${source}"]`);
        if (card && connections[source].connected) {
            const status = card.querySelector('.connection-status');
            status.classList.remove('disconnected');
            status.classList.add('connected');
            status.innerHTML = '<span class="status-indicator"></span><span>Connected</span>';

            const button = card.querySelector('button');
            // Product Documentation uses "Add" button
            if (source === 'documentation') {
                button.textContent = 'Add';
            } else {
                button.textContent = 'Sync';
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

        if (!token) {
            alert('Please log in first to connect data sources');
            closeConnectionModal();
            showLogin();
            return;
        }

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
            await loadKnowledgeHubDocuments();
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
let currentFilter = 'active';

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
            // Default to showing active documents only
            const activeDocs = allDocuments.filter(doc => doc.status === 'active');
            displayDocuments(activeDocs);
            updateAgentCardVisibility();
        }
    } catch (error) {
        console.error('Error loading documents:', error);
    }
}

function updateAgentCardVisibility() {
    const agentCard = document.getElementById('agent-card');
    const getStartedSection = document.getElementById('get-started-section');
    const docCard = document.querySelector('[data-source="documentation"]');
    const answerlyButton = document.getElementById('answerly-button');

    // Hide Agent if no documents exist
    if (allDocuments.length === 0) {
        if (agentCard) agentCard.style.display = 'none';
        if (answerlyButton) answerlyButton.style.display = 'none';
        if (getStartedSection) getStartedSection.style.display = 'block';

        // Ensure documentation card shows "Not Connected"
        if (docCard) {
            const status = docCard.querySelector('.connection-status');
            const button = docCard.querySelector('.btn-answerly, .btn-primary');

            if (status) {
                status.classList.remove('connected');
                status.classList.add('disconnected');
                status.innerHTML = '<span class="status-indicator"></span><span>Not Connected</span>';
            }
            if (button) {
                button.textContent = 'Connect';
            }
        }
    } else {
        // Show Agent if documents exist
        if (agentCard) agentCard.style.display = 'flex';
        if (answerlyButton) answerlyButton.style.display = 'block';
        if (getStartedSection) getStartedSection.style.display = 'none';

        // Ensure documentation card shows "Connected"
        if (docCard) {
            const status = docCard.querySelector('.connection-status');
            const button = docCard.querySelector('.btn-answerly, .btn-primary');

            if (status) {
                status.classList.remove('disconnected');
                status.classList.add('connected');
                status.innerHTML = '<span class="status-indicator"></span><span>Connected</span>';
            }
            if (button) {
                button.textContent = 'Add';
            }
        }
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
    } else {
        // Show all documents (active and archived)
        filteredDocs = allDocuments;
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

    // Sort documents: active first, then archived
    const sortedDocuments = [...documents].sort((a, b) => {
        if (a.status === 'active' && b.status === 'archived') return -1;
        if (a.status === 'archived' && b.status === 'active') return 1;
        return 0;
    });

    tbody.innerHTML = sortedDocuments.map(doc => `
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
                <select class="action-select" onchange="handleDocumentAction(this, '${doc.id}', '${doc.status}')">
                    <option value="">Select Action</option>
                    <option value="view">View</option>
                    <option value="edit">Edit</option>
                    ${doc.status === 'active' ? '<option value="archive">Archive</option>' : '<option value="unarchive">Unarchive</option>'}
                    <option value="delete">Delete</option>
                </select>
            </td>
        </tr>
    `).join('');
}

function handleDocumentAction(select, docId, status) {
    const action = select.value;
    if (!action) return;

    switch(action) {
        case 'view':
            viewDocument(docId);
            break;
        case 'edit':
            editDocument(docId);
            break;
        case 'archive':
            archiveDocument(docId);
            break;
        case 'unarchive':
            unarchiveDocument(docId);
            break;
        case 'delete':
            deleteDocument(docId);
            break;
    }

    // Reset dropdown
    select.value = '';
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
            updateAgentCardVisibility();
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
            updateAgentCardVisibility();
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
            updateAgentCardVisibility();
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
let currentMeetingId = null;
let meetingTranscript = '';
let meetingQuestions = [];
let meetingTimer = null;
let meetingStartTime = null;
let meetingElapsedSeconds = 0;
let answerlyTimerInterval = null;
let answerlyStartTime = null;

function activateAnswerly() {
    // Check if button is disabled
    const activateBtn = document.getElementById('answerly-activate-btn');
    if (activateBtn && activateBtn.disabled) {
        alert('Please upload documents to your Knowledge Hub before activating Answerly.');
        return;
    }

    // Show floating pop-up instead of modal
    document.getElementById('answerly-popup').classList.add('active');
    // Start listening
    startAnswerly();
}

function closeAnswerlyPopup() {
    if (answerlyActive) {
        if (!confirm('Answerly is currently listening. Are you sure you want to close?')) {
            return;
        }
        stopAnswerly();
    }
    document.getElementById('answerly-popup').classList.remove('active');
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

async function startAnswerly() {
    // Create a new meeting session
    const token = localStorage.getItem('token');

    // Generate a fallback meeting ID in case backend fails
    currentMeetingId = 'meeting_' + Date.now();
    meetingTranscript = '';
    meetingQuestions = [];

    try {
        const response = await fetch('/api/meeting-notes/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: `Meeting - ${new Date().toLocaleString()}`
            })
        });

        if (response.ok) {
            const data = await response.json();
            currentMeetingId = data.meetingId;
        } else {
            console.warn('Backend meeting API unavailable, using local meeting ID:', currentMeetingId);
        }
    } catch (error) {
        console.warn('Backend meeting API unavailable, using local meeting ID:', currentMeetingId, error);
    }

    // Hide inactive view, show active view
    document.getElementById('answerly-inactive').style.display = 'none';
    document.getElementById('answerly-active').style.display = 'block';
    answerlyActive = true;

    // Start timer
    meetingStartTime = Date.now();
    meetingElapsedSeconds = 0;
    startMeetingTimer();

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
                meetingTranscript += ' ' + transcript;
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

async function stopAnswerly() {
    answerlyActive = false;
    if (recognition) {
        recognition.stop();
        recognition = null;
    }

    const savedMeetingId = currentMeetingId;

    // Save meeting notes
    if (currentMeetingId) {
        const token = localStorage.getItem('token');
        try {
            await fetch(`/api/meeting-notes/${currentMeetingId}/end`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    transcript: meetingTranscript
                })
            });
        } catch (error) {
            console.error('Error ending meeting session:', error);
        }
    }

    // Reset UI
    document.getElementById('answerly-inactive').style.display = 'block';
    document.getElementById('answerly-active').style.display = 'none';
    document.getElementById('live-transcript').textContent = 'Waiting for conversation...';

    // Clear meeting data
    currentMeetingId = null;
    meetingTranscript = '';
    meetingQuestions = [];

    // Stop timer
    if (meetingTimer) {
        clearInterval(meetingTimer);
        meetingTimer = null;
    }
    meetingElapsedSeconds = 0;

    // Reset modal timer
    const meetingTimerEl = document.getElementById('meeting-timer');
    if (meetingTimerEl) {
        meetingTimerEl.textContent = '00:00';
    }

    // Reset popup timer
    const popupTimerEl = document.getElementById('popup-timer');
    if (popupTimerEl) {
        popupTimerEl.textContent = '00:00';
    }

    const warningDiv = document.getElementById('time-limit-warning');
    if (warningDiv) {
        warningDiv.style.display = 'none';
    }

    // Close modal
    closeAnswerlyModal();

    // Navigate to Meeting Notes and show the saved meeting details
    if (savedMeetingId) {
        showView('meeting-notes-view');
        await loadMeetingNotes();
        // Automatically open the details of the meeting that just ended
        setTimeout(() => {
            viewMeetingDetails(savedMeetingId);
        }, 300);
    }
}

async function detectAndAnswerQuestions(text) {
    // Comprehensive question detection - trigger on question words and patterns
    const questionWords = [
        'how', 'what', 'when', 'where', 'why', 'who',
        'is', 'are', 'was', 'were', 'will', 'would', 'could', 'should',
        'can', 'do', 'does', 'did', 'has', 'have', 'had',
        'which', 'whose', 'whom'
    ];

    const sentences = text.toLowerCase().split(/[.!?]+/);

    for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();

        // Check if sentence starts with a question word
        const startsWithQuestionWord = questionWords.some(word =>
            trimmedSentence.startsWith(word + ' ') || trimmedSentence.startsWith(word + "'")
        );

        // Check if sentence contains a question mark (for tone-based questions)
        const hasQuestionMark = sentence.includes('?');

        // Detect auxiliary verb patterns (e.g., "Do you...", "Is this...", "Can we...")
        const auxiliaryPattern = /^(is|are|was|were|will|would|could|should|can|do|does|did|has|have|had)\s+/i;
        const hasAuxiliaryPattern = auxiliaryPattern.test(trimmedSentence);

        // Consider it a question if it meets any criteria and is substantial
        const isQuestion = (startsWithQuestionWord || hasQuestionMark || hasAuxiliaryPattern) && trimmedSentence.length > 5;

        if (isQuestion) {
            // Check if we've already asked this question (prevent duplicates)
            const alreadyAsked = meetingQuestions.some(q =>
                q.question.toLowerCase().trim() === trimmedSentence
            );

            if (!alreadyAsked) {
                console.log('Detected question:', trimmedSentence);
                // Generate answer from knowledge base
                await generateAnswer(trimmedSentence);
            } else {
                console.log('Question already asked, skipping:', trimmedSentence);
            }
        }
    }
}

async function generateAnswer(question) {
    const responsesDiv = document.getElementById('answerly-responses');
    const popupBody = document.getElementById('answerly-popup-body');

    // Clear initial text in popup
    if (popupBody && popupBody.querySelector('.conversation-flow-text')) {
        popupBody.innerHTML = '';
    }

    // Clear "No questions" message if present in modal
    if (responsesDiv && responsesDiv.textContent.includes('No questions detected')) {
        responsesDiv.innerHTML = '';
    }

    // Add question to modal UI
    let qaBlock = null;
    if (responsesDiv) {
        // Clear "No questions detected" message if present
        if (responsesDiv.textContent.includes('No questions detected')) {
            responsesDiv.innerHTML = '';
        }

        qaBlock = document.createElement('div');
        qaBlock.style.cssText = 'margin-bottom: 16px; padding: 16px; background: var(--background-alt); border-radius: 8px; border-left: 4px solid var(--primary-color);';
        qaBlock.innerHTML = `
            <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">❓ ${question}</div>
            <div style="color: var(--text-secondary); font-size: 14px;">
                <span style="display: inline-block; animation: pulse 1s infinite;">💭 Generating answer...</span>
            </div>
        `;
        responsesDiv.insertBefore(qaBlock, responsesDiv.firstChild);
    } else {
        console.warn('answerly-responses div not found');
    }

    // Add question to popup
    let popupQA = null;
    if (popupBody) {
        popupQA = document.createElement('div');
        popupQA.className = 'popup-qa-item';
        popupQA.innerHTML = `
            <div class="popup-question">❓ ${question}</div>
            <div class="popup-answer">💭 Searching...</div>
        `;
        popupBody.insertBefore(popupQA, popupBody.firstChild);
    }

    // Generate answer from knowledge base
    try {
        const answer = await simulateAIAnswer(question);
        console.log('Generated answer for display:', answer ? answer.substring(0, 150) : 'null/undefined');
        const answered = !answer.includes('couldn\'t find') && !answer.includes('error') && !answer.includes('I searched through');
        const sourceDoc = answer.match(/Based on "([^"]+)"/)?.[1] || '';

        // Update modal
        if (qaBlock) {
            qaBlock.innerHTML = `
                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">
                    Q: ${question}
                </div>
                <div style="color: var(--text-secondary); font-size: 14px; line-height: 1.6;">
                    A: ${answered ? answer : '<strong style="color: #dc3545;">Not Available</strong>'}
                </div>
            `;
            console.log('Updated qaBlock with answer. Answered:', answered);
        } else {
            console.warn('qaBlock not created, cannot update answer display');
        }

        // Update popup
        if (popupQA) {
            popupQA.innerHTML = `
                <div class="popup-question">${answered ? '✅' : '❌'} ${question}</div>
                <div class="popup-answer">${answered ? answer : '<strong style="color: #dc3545;">Not found</strong> - ' + answer}</div>
            `;
        }

        // Auto-scroll popup to top
        if (popupBody) {
            popupBody.scrollTop = 0;
        }

        // Save question to meeting notes
        if (currentMeetingId) {
            const token = localStorage.getItem('token');
            try {
                await fetch(`/api/meeting-notes/${currentMeetingId}/questions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        question,
                        answered,
                        answer,
                        sourceDocument: sourceDoc,
                        needsDocumentation: !answered
                    })
                });

                meetingQuestions.push({ question, answered, answer });
            } catch (error) {
                console.error('Error saving question:', error);
            }
        }
    } catch (error) {
        console.error('Error in generateAnswer:', error);

        // Update modal
        if (qaBlock) {
            qaBlock.innerHTML = `
                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">❓ ${question}</div>
                <div style="color: var(--error-color); font-size: 14px;">
                    ❌ Error generating answer
                </div>
            `;
        }

        // Update popup
        if (popupQA) {
            popupQA.innerHTML = `
                <div class="popup-question">❓ ${question}</div>
                <div class="popup-answer" style="color: var(--error-color);">❌ Error generating answer</div>
            `;
        }
    }

    if (responsesDiv) {
        responsesDiv.scrollTop = 0;
    }
}

async function loadMeetingNotes() {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch('/api/meeting-notes?status=completed', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load meeting notes');
        }

        const data = await response.json();
        const meetings = data.meetings || [];

        // Update stats
        let totalQuestions = 0;
        let answeredQuestions = 0;
        let needsDocs = 0;

        meetings.forEach(meeting => {
            totalQuestions += meeting.summary.totalQuestions || 0;
            answeredQuestions += meeting.summary.answeredQuestions || 0;
            needsDocs += meeting.summary.needsDocumentation || 0;
        });

        document.getElementById('total-meetings').textContent = meetings.length;
        document.getElementById('total-meeting-questions').textContent = totalQuestions;
        document.getElementById('answered-meeting-questions').textContent = answeredQuestions;
        document.getElementById('needs-documentation').textContent = needsDocs;

        // Update table
        const tbody = document.getElementById('meetings-table-body');
        tbody.innerHTML = '';

        if (meetings.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-state-row">
                    <td colspan="7" style="text-align: center; padding: 40px;">
                        <div class="empty-state">
                            <p>No meeting notes yet. Activate Answerly during a meeting to start tracking questions.</p>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            meetings.forEach(meeting => {
                const row = document.createElement('tr');
                const date = new Date(meeting.startTime).toLocaleDateString();
                const duration = formatDuration(meeting.duration || 0);

                row.innerHTML = `
                    <td>${meeting.title}</td>
                    <td>${date}</td>
                    <td>${duration}</td>
                    <td>${meeting.summary.totalQuestions || 0}</td>
                    <td>${meeting.summary.answeredQuestions || 0}</td>
                    <td>${meeting.summary.needsDocumentation || 0}</td>
                    <td>
                        <select class="action-select" onchange="handleMeetingAction(this, '${meeting._id}')">
                            <option value="">Select Action</option>
                            <option value="view">View</option>
                            <option value="delete">Delete</option>
                        </select>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Error loading meeting notes:', error);
    }
}

// Meeting platform connections
function connectZoom() {
    openConnectionModal('zoom-form');
    // Set webhook URL
    document.getElementById('zoom-webhook-url').textContent = window.location.origin + '/api/integrations/zoom/webhook';
}

function connectTeams() {
    openConnectionModal('teams-form');
    // Set redirect URI
    document.getElementById('teams-redirect-uri').textContent = window.location.origin + '/api/integrations/teams/auth/callback';
}

function connectGoogleMeet() {
    openConnectionModal('meet-form');
    // Set redirect URI
    document.getElementById('meet-redirect-uri').textContent = window.location.origin + '/api/integrations/google-meet/auth/callback';
}

// Meeting platform submit functions
async function submitZoomConfig() {
    const accountId = document.getElementById('zoom-account-id').value;
    const clientId = document.getElementById('zoom-client-id').value;
    const clientSecret = document.getElementById('zoom-client-secret').value;
    const webhookToken = document.getElementById('zoom-webhook-token').value;

    if (!accountId || !clientId || !clientSecret) {
        alert('Please fill in all required fields');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/integrations/zoom/configure', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                accountId,
                clientId,
                clientSecret,
                webhookToken
            })
        });

        const data = await response.json();
        if (response.ok) {
            alert('Zoom connected successfully! You can now use Meeting Mind in your Zoom meetings.');
            closeConnectionModal();
            loadConnectionStatus();
        } else {
            alert(data.error || 'Failed to configure Zoom');
        }
    } catch (error) {
        console.error('Zoom configuration error:', error);
        alert('Failed to configure Zoom');
    }
}

async function submitTeamsConfig() {
    const tenantId = document.getElementById('teams-tenant-id').value;
    const clientId = document.getElementById('teams-client-id').value;
    const clientSecret = document.getElementById('teams-client-secret').value;
    const userEmail = document.getElementById('teams-user-email').value;

    if (!tenantId || !clientId || !clientSecret) {
        alert('Please fill in all required fields');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/integrations/teams/configure', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tenantId,
                clientId,
                clientSecret,
                userEmail
            })
        });

        const data = await response.json();
        if (response.ok) {
            if (data.authUrl) {
                // Redirect to Microsoft OAuth
                window.location.href = data.authUrl;
            } else {
                alert('Teams connected successfully!');
                closeConnectionModal();
                loadConnectionStatus();
            }
        } else {
            alert(data.error || 'Failed to configure Teams');
        }
    } catch (error) {
        console.error('Teams configuration error:', error);
        alert('Failed to configure Teams');
    }
}

async function submitMeetConfig() {
    const projectId = document.getElementById('meet-project-id').value;
    const clientId = document.getElementById('meet-client-id').value;
    const clientSecret = document.getElementById('meet-client-secret').value;
    const userEmail = document.getElementById('meet-user-email').value;

    if (!projectId || !clientId || !clientSecret) {
        alert('Please fill in all required fields');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/integrations/google-meet/configure', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                projectId,
                clientId,
                clientSecret,
                userEmail
            })
        });

        const data = await response.json();
        if (response.ok) {
            if (data.authUrl) {
                // Redirect to Google OAuth
                window.location.href = data.authUrl;
            } else {
                alert('Google Meet connected successfully!');
                closeConnectionModal();
                loadConnectionStatus();
            }
        } else {
            alert(data.error || 'Failed to configure Google Meet');
        }
    } catch (error) {
        console.error('Google Meet configuration error:', error);
        alert('Failed to configure Google Meet');
    }
}

function closeMeetingDetailsModal() {
    document.getElementById('meeting-details-modal').classList.remove('active');
}

async function deleteMeeting(meetingId) {
    if (!confirm('Are you sure you want to delete this meeting note?')) {
        return;
    }

    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`/api/meeting-notes/${meetingId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            loadMeetingNotes();
        } else {
            alert('Failed to delete meeting note');
        }
    } catch (error) {
        console.error('Error deleting meeting:', error);
        alert('Failed to delete meeting note');
    }
}

async function simulateAIAnswer(question) {
    try {
        // Check if user has documents
        const storedDocs = localStorage.getItem('meetingDocuments');
        const documents = storedDocs ? JSON.parse(storedDocs) : [];

        if (documents.length === 0) {
            return "I couldn't find any documents in your knowledge base. Please upload some documents first.";
        }

        // Query the backend API using OpenAI + Pinecone
        const token = localStorage.getItem('token');

        console.log('Querying backend API for question:', question);

        const response = await fetch('/api/company-brain/query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                question: question,
                options: {
                    topK: 3,
                    includeContext: true
                }
            })
        });

        if (!response.ok) {
            console.error('API error:', response.status, response.statusText);
            // Fallback to basic search if API fails
            return await fallbackKeywordSearch(question, documents);
        }

        const data = await response.json();

        console.log('API response:', data);

        if (data.answer && data.sources && data.sources.length > 0) {
            // Format answer with source information
            const topSource = data.sources[0];
            return `Based on "${topSource.title}" (confidence: ${(topSource.score * 100).toFixed(0)}%):\n\n${data.answer}`;
        } else if (data.answer) {
            return data.answer;
        } else {
            return `I searched through your documents but couldn't find a relevant answer to: "${question}". Try rephrasing your question or ensure your documents contain this information.`;
        }

    } catch (error) {
        console.error('Error querying knowledge base:', error);

        // Fallback to basic search
        const storedDocs = localStorage.getItem('meetingDocuments');
        const documents = storedDocs ? JSON.parse(storedDocs) : [];

        if (documents.length > 0) {
            const answer = await fallbackKeywordSearch(question, documents);
            console.log('Fallback search returned:', answer ? answer.substring(0, 100) : 'null/undefined');
            return answer;
        }

        return "Sorry, I encountered an error while searching your knowledge base. Please make sure you have uploaded documents.";
    }
}

// Fallback keyword search when API is unavailable
async function fallbackKeywordSearch(question, documents) {
    const questionLower = question.toLowerCase();

    // Extract keywords - keep numbers and meaningful words
    const stopWords = ['a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'but'];

    // Extract ALL words from the question - match every single word
    const allTokens = questionLower.match(/\w+|[+\-*/=]/g) || [];

    // Keep ALL words - no filtering by length or stop words
    // This ensures every word in the question is matched against documents
    const keywords = allTokens.filter(token => token.length > 0);

    // If no keywords found, use the whole question
    if (keywords.length === 0) {
        keywords.push(questionLower.trim());
    }

    console.log('Fallback search - keywords:', keywords);
    console.log('Searching for question:', questionLower);

    let bestMatch = null;
    let bestScore = 0;

    for (const doc of documents) {
        try {
            let content = '';

            if (doc.type === 'text/plain' || doc.type === 'application/json' ||
                doc.type === 'text/markdown' || doc.type === 'text/html' ||
                doc.type === 'text/csv' || doc.name.endsWith('.csv') ||
                doc.name.endsWith('.txt')) {
                const base64Data = doc.data.split(',')[1];
                content = atob(base64Data);
            } else if (doc.type === 'application/pdf') {
                const base64Data = doc.data.split(',')[1];
                const binaryString = atob(base64Data);
                content = binaryString.replace(/[^\x20-\x7E\n]/g, ' ');
            } else if (doc.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                       doc.name.endsWith('.docx')) {
                // .docx files - use mammoth.js to properly extract text
                console.log('Processing .docx file:', doc.name);

                // Convert base64 to ArrayBuffer for mammoth.js
                const base64Data = doc.data.split(',')[1];
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                try {
                    // Use mammoth.js to extract text from .docx
                    if (typeof mammoth !== 'undefined') {
                        const result = await mammoth.extractRawText({ arrayBuffer: bytes.buffer });
                        content = result.value;
                        console.log('Extracted text from .docx using mammoth.js');
                    } else {
                        console.warn('mammoth.js not loaded, skipping .docx file');
                        continue;
                    }
                } catch (error) {
                    console.error('Error extracting .docx content:', error);
                    continue;
                }
            } else if (doc.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
                       doc.type === 'application/vnd.ms-powerpoint' ||
                       doc.name.endsWith('.pptx') || doc.name.endsWith('.ppt')) {
                // PowerPoint files - extract text (basic extraction)
                console.log('Processing PowerPoint file:', doc.name);
                const base64Data = doc.data.split(',')[1];
                const binaryString = atob(base64Data);
                // Extract readable text from the binary content
                content = binaryString.replace(/[^\x20-\x7E\n]/g, ' ')
                    .replace(/<[^>]*>/g, ' ') // Remove XML tags
                    .replace(/\s+/g, ' ') // Normalize whitespace
                    .trim();
                console.log('Extracted text from PowerPoint file');
            } else {
                console.log('Skipping unsupported document type:', doc.type, doc.name);
                continue;
            }

            console.log(`Searching in document: ${doc.name} (${content.length} chars)`);
            console.log('Content preview:', content.substring(0, 200));

            if (content) {
                const contentLower = content.toLowerCase();
                let score = 0;
                let matchedKeywords = [];

                // First, check if the exact question or similar phrase exists
                if (contentLower.includes(questionLower)) {
                    score += 100; // High score for exact question match
                    matchedKeywords.push('exact match');
                    console.log('Found exact question match!');
                }

                // Also search for individual keywords
                keywords.forEach(keyword => {
                    // Escape special regex characters in keyword
                    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                    const exactMatches = (contentLower.match(new RegExp(`\\b${escapedKeyword}\\b`, 'g')) || []).length;
                    const partialMatches = (contentLower.match(new RegExp(escapedKeyword, 'g')) || []).length;

                    if (exactMatches > 0) {
                        score += exactMatches * 3;
                        matchedKeywords.push(keyword);
                        console.log(`Found exact matches for "${keyword}":`, exactMatches);
                    } else if (partialMatches > 0) {
                        score += partialMatches;
                        matchedKeywords.push(keyword);
                        console.log(`Found partial matches for "${keyword}":`, partialMatches);
                    }
                });

                console.log(`Document ${doc.name} score: ${score}, matched keywords:`, matchedKeywords);

                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = { doc, content, score, matchedKeywords };
                }
            }
        } catch (err) {
            console.error('Error reading document:', doc.name, err);
        }
    }

    console.log('Best match:', bestMatch ? bestMatch.doc.name : 'none', 'Score:', bestScore);

    if (bestMatch && bestMatch.score > 0) {
        const content = bestMatch.content;
        const contentLower = content.toLowerCase();

        // Try to find the question in the document and extract the answer
        const questionIndex = contentLower.indexOf(questionLower);

        if (questionIndex !== -1) {
            // Found the exact question - now find where it ends
            const afterQuestionStart = content.substring(questionIndex);

            // Find the end of the question (look for ?, :, or newline)
            const questionEndMatch = afterQuestionStart.match(/[\?\:]/);

            if (questionEndMatch) {
                // Skip past the question mark/colon and any whitespace
                const answerStartIndex = questionIndex + questionEndMatch.index + 1;
                const afterAnswer = content.substring(answerStartIndex).trim();

                // Extract the answer - take text until we hit another question or significant break
                // Split by question marks or double newlines to isolate the answer
                const answerText = afterAnswer.split(/[\?\n]{2,}/)[0].trim();

                // Clean up the answer - remove extra whitespace
                const cleanAnswer = answerText.replace(/\s+/g, ' ').trim();

                if (cleanAnswer && cleanAnswer.length > 0 && cleanAnswer.length < 500) {
                    return `Based on "${bestMatch.doc.name}":\n\n${cleanAnswer}`;
                }
            }

            // Fallback: take text after the question
            const afterQuestion = content.substring(questionIndex + questionLower.length).trim();
            const nextSentences = afterQuestion.substring(0, 200).split(/[\.\!\?]/)[0];
            if (nextSentences && nextSentences.length > 0) {
                return `Based on "${bestMatch.doc.name}":\n\n${nextSentences.trim()}`;
            }
        }

        // Fallback: use keyword-based extraction but with smaller window
        const keyword = bestMatch.matchedKeywords[0];
        const index = contentLower.indexOf(keyword);

        if (index !== -1) {
            // Find sentence boundaries around the keyword
            const start = Math.max(0, index - 100);
            const end = Math.min(content.length, index + 200);
            let snippet = content.substring(start, end).trim();

            // Try to extract just the sentence containing the keyword
            const sentences = snippet.split(/[\.\!\?]/);
            for (const sentence of sentences) {
                if (sentence.toLowerCase().includes(keyword)) {
                    return `Based on "${bestMatch.doc.name}":\n\n${sentence.trim()}`;
                }
            }

            if (start > 0) snippet = '...' + snippet;
            if (end < content.length) snippet = snippet + '...';

            return `Based on "${bestMatch.doc.name}":\n\n${snippet}`;
        }

        return `Based on "${bestMatch.doc.name}":\n\n${content.substring(0, 300)}...`;
    }

    return `I searched through ${documents.length} document(s) but couldn't find relevant information for: "${question}".`;
}

// Meeting Timer Functions
function startMeetingTimer() {
    // Get subscription limits
    const subscription = currentUser?.subscription || 'free';
    const limits = {
        'free': 15 * 60,      // 15 minutes in seconds
        'pro': 120 * 60,      // 2 hours in seconds
        'business': Infinity  // Unlimited
    };
    const timeLimit = limits[subscription];

    meetingTimer = setInterval(() => {
        meetingElapsedSeconds++;
        updateTimerDisplay(meetingElapsedSeconds, timeLimit);

        // Auto-stop if time limit reached (except for business plan)
        if (timeLimit !== Infinity && meetingElapsedSeconds >= timeLimit) {
            alert('Meeting time limit reached for your plan. Please upgrade to continue longer meetings.');
            stopAnswerly();
        }
    }, 1000);
}

function updateTimerDisplay(seconds, timeLimit) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const timeString = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // Update modal timer
    const meetingTimerEl = document.getElementById('meeting-timer');
    if (meetingTimerEl) {
        meetingTimerEl.textContent = timeString;
    }

    // Update pop-up timer
    const popupTimerEl = document.getElementById('popup-timer');
    if (popupTimerEl) {
        popupTimerEl.textContent = timeString;
    }

    // Show warning when approaching time limit
    if (timeLimit !== Infinity) {
        const remainingSeconds = timeLimit - seconds;
        const warningDiv = document.getElementById('time-limit-warning');
        const warningText = document.getElementById('time-remaining-text');

        if (warningDiv && warningText && remainingSeconds <= 120) { // 2 minutes remaining
            warningDiv.style.display = 'block';
            const remainingMins = Math.floor(remainingSeconds / 60);
            const remainingSecs = remainingSeconds % 60;
            warningText.textContent = `⚠️ ${remainingMins}:${String(remainingSecs).padStart(2, '0')} remaining`;
            warningText.style.color = remainingSeconds <= 60 ? 'var(--error-color)' : 'var(--warning-color)';
        } else if (warningDiv) {
            warningDiv.style.display = 'none';
        }
    }
}

// Brain Data Functions
async function loadBrainData() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/brain/data', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok && data.brainData) {
            displayBrainData(data.brainData);
            updateBrainStats(data.brainData);
        }
    } catch (error) {
        console.error('Error loading brain data:', error);
    }
}

function displayBrainData(brainData) {
    const container = document.getElementById('brain-topics-list');

    if (!brainData || brainData.length === 0) {
        container.innerHTML = `
            <div class="empty-brain-state">
                <div class="empty-icon">🧠</div>
                <h3>Your Brain is Empty</h3>
                <p>Connect data sources from the Dashboard to start building your company knowledge base</p>
                <button class="btn-primary" onclick="showDashboardTab(event, 'home')">Go to Dashboard</button>
            </div>
        `;
        return;
    }

    // Group by category/topic
    const grouped = {};
    brainData.forEach(item => {
        const category = item.category || 'General';
        if (!grouped[category]) {
            grouped[category] = [];
        }
        grouped[category].push(item);
    });

    // Populate topic filter
    const topicFilter = document.getElementById('topic-filter');
    topicFilter.innerHTML = '<option value="all">All Topics</option>';
    Object.keys(grouped).forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = `${category} (${grouped[category].length})`;
        topicFilter.appendChild(option);
    });

    // Display grouped data
    let html = '';
    Object.keys(grouped).sort().forEach(category => {
        html += `
            <div class="topic-section" data-topic="${category}">
                <div class="topic-header">
                    <h2>${category}</h2>
                    <span class="item-count">${grouped[category].length} items</span>
                </div>
                <div class="topic-items">
        `;

        grouped[category].forEach(item => {
            const icon = item.type === 'file' ? '📄' : '🔗';
            const sourceIcon = {
                'documentation': '📚',
                'slack': '💬',
                'sheets': '📊',
                'notion': '📝',
                'confluence': '📖'
            }[item.source] || '📄';

            html += `
                <div class="brain-item" data-source="${item.source}" data-item-id="${item.id}">
                    <div class="item-icon">${icon}</div>
                    <div class="item-content">
                        <div class="item-title">${item.filename || item.content}</div>
                        <div class="item-meta">
                            <span class="source-badge">${sourceIcon} ${item.source}</span>
                            ${item.tags && item.tags.length > 0 ? item.tags.map(tag => `<span class="tag">${tag}</span>`).join('') : ''}
                            <span class="date">${new Date(item.addedAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div class="item-actions">
                        ${item.type === 'url' ? `<button class="btn-icon" onclick="viewBrainItem('${item.id}')" title="View URL"><span>👁️</span></button>` : ''}
                        <button class="btn-icon btn-delete" onclick="deleteBrainItem('${item.id}')" title="Delete"><span>🗑️</span></button>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function updateBrainStats(brainData) {
    document.getElementById('total-items').textContent = brainData.length;

    const topics = new Set(brainData.map(item => item.category || 'General'));
    document.getElementById('total-topics').textContent = topics.size;

    const sources = new Set(brainData.map(item => item.source));
    document.getElementById('total-sources').textContent = sources.size;
}

function filterBrainByTopic() {
    const selectedTopic = document.getElementById('topic-filter').value;
    const sections = document.querySelectorAll('.topic-section');

    sections.forEach(section => {
        if (selectedTopic === 'all' || section.dataset.topic === selectedTopic) {
            section.style.display = 'block';
        } else {
            section.style.display = 'none';
        }
    });
}

function filterBrainBySource() {
    const selectedSource = document.getElementById('source-filter').value;
    const items = document.querySelectorAll('.brain-item');

    items.forEach(item => {
        if (selectedSource === 'all' || item.dataset.source === selectedSource) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

async function viewBrainItem(itemId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/brain/item/${itemId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok && data.item) {
            // Open URL in new tab
            if (data.item.type === 'url') {
                window.open(data.item.content, '_blank');
            }
        } else {
            alert(data.error || 'Failed to load item');
        }
    } catch (error) {
        console.error('Error viewing brain item:', error);
        alert('Failed to view item');
    }
}

async function deleteBrainItem(itemId) {
    if (!confirm('Are you sure you want to delete this item from your Brain?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/brain/item/${itemId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            // Remove item from UI
            const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
            if (itemElement) {
                itemElement.remove();
            }

            // Reload brain data to update stats
            loadBrainData();
        } else {
            alert(data.error || 'Failed to delete item');
        }
    } catch (error) {
        console.error('Error deleting brain item:', error);
        alert('Failed to delete item');
    }
}

// Projects and Meetings Functions
let teamMembers = [];
let projects = [];

function showDashboardHome() {
    document.querySelectorAll('.dashboard-view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById('dashboard-home-view').classList.add('active');

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector('.nav-link[onclick="showDashboardHome()"]').classList.add('active');

    // Load dashboard highlights
    loadDashboardHighlights();
}

function loadDashboardHighlights() {
    console.log('loadDashboardHighlights called');

    // Count meeting documents from localStorage
    const storedMeetingDocs = localStorage.getItem('meetingDocuments');
    const meetingDocuments = storedMeetingDocs ? JSON.parse(storedMeetingDocs) : [];
    const totalDocumentsCount = meetingDocuments.length;

    // Calculate questions answered in last 30 days
    const storedMeetings = localStorage.getItem('meetingsHistory');
    const meetings = storedMeetings ? JSON.parse(storedMeetings) : [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const questionsAnsweredLast30Days = meetings
        .filter(meeting => new Date(meeting.date) >= thirtyDaysAgo)
        .reduce((total, meeting) => total + (meeting.questionsAnswered || 0), 0);

    console.log('Document count:', totalDocumentsCount);
    console.log('Questions answered (30 days):', questionsAnsweredLast30Days);

    // Get UI elements
    const emptyState = document.getElementById('agent-empty-state');
    const activeContent = document.getElementById('agent-active-content');

    console.log('Empty state element:', emptyState);
    console.log('Active content element:', activeContent);

    // Show appropriate content based on document count
    if (totalDocumentsCount === 0) {
        // Show empty state
        console.log('Showing empty state');
        if (emptyState) {
            emptyState.style.display = 'block';
        }
        if (activeContent) {
            activeContent.style.display = 'none';
        }
    } else {
        // Show active content with Answerly activation
        console.log('Showing active content');
        if (emptyState) {
            emptyState.style.display = 'none';
        }
        if (activeContent) {
            activeContent.style.display = 'block';
        }

        // Update document count
        const docCountElement = document.getElementById('total-documents-count');
        if (docCountElement) {
            docCountElement.textContent = totalDocumentsCount;
        }

        // Update questions answered count
        const questionsCountElement = document.getElementById('questions-answered-count');
        if (questionsCountElement) {
            questionsCountElement.textContent = questionsAnsweredLast30Days;
        }

        // Display recent activity (empty since projects removed)
        const activityContainer = document.getElementById('recent-activity');
        if (activityContainer) {
            activityContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 40px 0;">No recent activity</p>';
        }
    }
}

function showDocuments() {
    document.querySelectorAll('.dashboard-view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById('documents-view').classList.add('active');

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector('.nav-link[onclick="showDocuments()"]').classList.add('active');

    loadMeetingDocuments();
}

function showMeetings() {
    document.querySelectorAll('.dashboard-view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById('meetings-view').classList.add('active');

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector('.nav-link[onclick="showMeetings()"]').classList.add('active');

    loadMeetingsHistory();
}

let meetingDocuments = [];

// Track which meeting a document upload is for
let currentUploadMeetingId = null;

function openMeetingDocUploadModal() {
    currentUploadMeetingId = null; // Clear any previous meeting ID
    document.getElementById('meeting-doc-upload-modal').style.display = 'block';
}

function uploadDocumentForMeeting(meetingId) {
    currentUploadMeetingId = meetingId; // Store the meeting ID
    showDocuments(); // Navigate to Documents tab
    // Auto-open the upload modal after a short delay to allow page transition
    setTimeout(() => {
        openMeetingDocUploadModal();
    }, 300);
}

function closeMeetingDocUploadModal() {
    document.getElementById('meeting-doc-upload-modal').style.display = 'none';
    document.getElementById('meeting-doc-files').value = '';
    document.getElementById('meeting-doc-files-list').innerHTML = '';
    currentUploadMeetingId = null; // Clear the meeting ID
}

async function uploadMeetingDocuments() {
    const filesInput = document.getElementById('meeting-doc-files');
    const files = filesInput.files;

    if (files.length === 0) {
        alert('Please select at least one document to upload');
        return;
    }

    const token = localStorage.getItem('token');
    let successCount = 0;
    let failCount = 0;

    // Show loading indicator
    const uploadButton = event.target;
    const originalText = uploadButton ? uploadButton.textContent : 'Upload';
    if (uploadButton) {
        uploadButton.textContent = 'Uploading...';
        uploadButton.disabled = true;
    }

    // Convert files to base64 for local storage AND send to backend for ingestion
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const documentId = Date.now().toString() + i;

        try {
            // Read file as text for ingestion
            const fileText = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsText(file);
            });

            // Also read as base64 for local storage
            const fileData = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });

            // Store in localStorage
            meetingDocuments.push({
                id: documentId,
                name: file.name,
                size: file.size,
                type: file.type,
                data: fileData,
                uploadedAt: new Date().toISOString(),
                category: 'Uncategorized'
            });

            // Ingest into Pinecone via backend API
            const ingestResponse = await fetch('/api/company-brain/ingest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    content: fileText,
                    metadata: {
                        title: file.name,
                        documentId: documentId,
                        type: 'document',
                        department: 'general',
                        tags: ['meeting', 'knowledge-base']
                    }
                })
            });

            if (ingestResponse.ok) {
                successCount++;
                console.log(`Document ${file.name} ingested successfully`);
            } else {
                failCount++;
                console.error(`Failed to ingest ${file.name}:`, await ingestResponse.text());
            }

        } catch (error) {
            failCount++;
            console.error(`Error processing ${file.name}:`, error);
        }
    }

    // Save to localStorage
    localStorage.setItem('meetingDocuments', JSON.stringify(meetingDocuments));

    // If this upload was for a specific meeting, mark it with the upload date
    if (currentUploadMeetingId && successCount > 0) {
        const storedMeetings = localStorage.getItem('meetingsHistory');
        const meetings = storedMeetings ? JSON.parse(storedMeetings) : [];

        const meetingIndex = meetings.findIndex(m => m.id === currentUploadMeetingId);
        if (meetingIndex !== -1) {
            meetings[meetingIndex].documentUploadedDate = new Date().toISOString();
            localStorage.setItem('meetingsHistory', JSON.stringify(meetings));
        }
    }

    // Restore button state
    if (uploadButton) {
        uploadButton.textContent = originalText;
        uploadButton.disabled = false;
    }

    // Show result
    if (successCount > 0 && failCount === 0) {
        if (currentUploadMeetingId) {
            alert(`${successCount} document(s) uploaded successfully! The meeting has been updated.`);
        } else {
            alert(`${successCount} document(s) uploaded and indexed successfully!`);
        }
    } else if (successCount > 0) {
        alert(`${successCount} document(s) uploaded successfully. ${failCount} failed to index (but are still available for basic search).`);
    } else {
        alert(`Failed to upload documents. Please try again.`);
    }

    closeMeetingDocUploadModal();
    loadMeetingDocuments();

    // Refresh Agent tab if documents were just added
    loadDashboardHighlights();

    // If upload was for a meeting, reload meetings history to show the update
    if (currentUploadMeetingId) {
        loadMeetingsHistory();
        currentUploadMeetingId = null;
    }
}

function loadMeetingDocuments() {
    // Load from localStorage
    const storedDocs = localStorage.getItem('meetingDocuments');
    if (storedDocs) {
        meetingDocuments = JSON.parse(storedDocs);
    }

    displayMeetingDocuments(meetingDocuments);
}

function displayMeetingDocuments(docs) {
    const emptyState = document.getElementById('meeting-docs-empty-state');
    const docsGrid = document.getElementById('meeting-documents-grid');
    const answerlyCTA = document.getElementById('answerly-activation-cta');
    const meetingsSubtitle = document.getElementById('meetings-subtitle');
    const knowledgeLibraryDesc = document.getElementById('knowledge-library-desc');
    const knowledgeSearch = document.getElementById('knowledge-search');
    const knowledgeFilter = document.getElementById('knowledge-filter');

    // Check if we're displaying all documents or filtered
    const isFiltered = docs.length !== meetingDocuments.length;

    // Show/hide based on document count
    if (meetingDocuments.length === 0) {
        emptyState.style.display = 'block';
        docsGrid.style.display = 'none';
        if (answerlyCTA) answerlyCTA.style.display = 'none';
        if (meetingsSubtitle) meetingsSubtitle.style.display = 'block';
        if (knowledgeLibraryDesc) knowledgeLibraryDesc.style.display = 'block';
        if (knowledgeSearch) knowledgeSearch.style.display = 'none';
        if (knowledgeFilter) knowledgeFilter.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        docsGrid.style.display = 'grid';
        if (answerlyCTA) answerlyCTA.style.display = 'block';
        if (meetingsSubtitle) meetingsSubtitle.style.display = 'none';
        if (knowledgeLibraryDesc) knowledgeLibraryDesc.style.display = 'none';
        if (knowledgeSearch) knowledgeSearch.style.display = 'block';
        if (knowledgeFilter) knowledgeFilter.style.display = 'block';

        // Display document cards in knowledge library style
        docsGrid.innerHTML = docs.map(doc => {
            const fileExt = doc.name.split('.').pop().toLowerCase();
            const fileIcon = fileExt === 'pdf' ? '📕' :
                           fileExt === 'docx' || fileExt === 'doc' ? '📘' :
                           fileExt === 'txt' ? '📄' : '📗';
            const category = doc.category || 'Uncategorized';

            return `
            <div style="background: white; border: 2px solid var(--border-color); border-radius: 12px; padding: 20px; transition: all 0.3s ease;">
                <div style="display: flex; align-items: start; gap: 16px; margin-bottom: 16px;">
                    <div style="font-size: 40px;">${fileIcon}</div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <input type="text" id="doc-name-${doc.id}" value="${doc.name}"
                                onblur="updateDocumentName('${doc.id}', this.value)"
                                style="flex: 1; font-size: 16px; font-weight: 600; border: 1px solid transparent; padding: 4px 8px; border-radius: 4px; background: transparent;"
                                onfocus="this.style.borderColor='var(--primary-color)'; this.style.background='#f9fafb';"
                                onblur="this.style.borderColor='transparent'; this.style.background='transparent';">
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <span style="font-size: 12px; color: var(--text-secondary);">Category:</span>
                            <input type="text" id="doc-category-${doc.id}" value="${category}"
                                onblur="updateDocumentCategory('${doc.id}', this.value)"
                                style="flex: 1; font-size: 13px; border: 1px solid transparent; padding: 4px 8px; border-radius: 4px; background: transparent; color: var(--primary-color); font-weight: 500;"
                                onfocus="this.style.borderColor='var(--primary-color)'; this.style.background='#f9fafb';"
                                onblur="this.style.borderColor='transparent'; this.style.background='transparent';">
                        </div>
                        <div style="display: flex; gap: 16px; font-size: 13px; color: var(--text-secondary);">
                            <span>${(doc.size / 1024).toFixed(2)} KB</span>
                            <span>${fileExt.toUpperCase()}</span>
                        </div>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid var(--border-color);">
                    <span style="font-size: 12px; color: var(--text-secondary);">Uploaded ${new Date(doc.uploadedAt).toLocaleDateString()}</span>
                    <button onclick="event.stopPropagation(); deleteMeetingDocument('${doc.id}')" style="background: #ef4444; color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px;">Remove</button>
                </div>
            </div>
        `;
        }).join('');
    }
}

function filterKnowledgeLibrary() {
    const searchTerm = document.getElementById('knowledge-search').value.toLowerCase();
    const filterType = document.getElementById('knowledge-filter').value;

    let filteredDocs = meetingDocuments.filter(doc => {
        const matchesSearch = doc.name.toLowerCase().includes(searchTerm);
        const fileExt = doc.name.split('.').pop().toLowerCase();
        const matchesFilter = filterType === 'all' || fileExt === filterType;

        return matchesSearch && matchesFilter;
    });

    displayMeetingDocuments(filteredDocs);
}

function updateDocumentName(docId, newName) {
    if (!newName || newName.trim() === '') {
        alert('Document name cannot be empty');
        loadMeetingDocuments();
        return;
    }

    const doc = meetingDocuments.find(d => d.id === docId);
    if (doc) {
        doc.name = newName.trim();
        localStorage.setItem('meetingDocuments', JSON.stringify(meetingDocuments));
    }
}

function updateDocumentCategory(docId, newCategory) {
    const doc = meetingDocuments.find(d => d.id === docId);
    if (doc) {
        doc.category = newCategory.trim() || 'Uncategorized';
        localStorage.setItem('meetingDocuments', JSON.stringify(meetingDocuments));
    }
}

function deleteMeetingDocument(docId) {
    if (!confirm('Are you sure you want to remove this document?')) {
        return;
    }

    meetingDocuments = meetingDocuments.filter(doc => doc.id !== docId);
    localStorage.setItem('meetingDocuments', JSON.stringify(meetingDocuments));
    loadMeetingDocuments();

    // Refresh Agent tab to update document count
    loadDashboardHighlights();
}

// Meetings History Functions
function loadMeetingsHistory() {
    const storedMeetings = localStorage.getItem('meetingsHistory');
    const meetings = storedMeetings ? JSON.parse(storedMeetings) : [];

    const emptyState = document.getElementById('meetings-empty-state');
    const meetingsList = document.getElementById('meetings-list');

    if (meetings.length === 0) {
        emptyState.style.display = 'block';
        meetingsList.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    meetingsList.style.display = 'block';

    // Sort meetings by date (newest first)
    meetings.sort((a, b) => new Date(b.date) - new Date(a.date));

    meetingsList.innerHTML = meetings.map(meeting => {
        const date = new Date(meeting.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        const formattedTime = date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        // Calculate duration in minutes
        const durationMinutes = Math.floor(meeting.duration / 60);
        const durationSeconds = meeting.duration % 60;
        const durationText = `${durationMinutes}m ${durationSeconds}s`;

        // Unanswered questions section
        const hasDocumentUploadedForMeeting = meeting.documentUploadedDate;
        const unansweredSection = meeting.unansweredQuestions && meeting.unansweredQuestions.length > 0 ? `
            <div style="margin-top: 16px; padding: ${hasDocumentUploadedForMeeting ? '12px 16px' : '16px'}; background: ${hasDocumentUploadedForMeeting ? '#d1fae5' : '#fff3cd'}; border-left: 4px solid ${hasDocumentUploadedForMeeting ? '#10b981' : '#ffc107'}; border-radius: 8px;">
                ${hasDocumentUploadedForMeeting ? `
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 16px;">✅</span>
                            <span style="font-size: 13px; color: #065f46; font-weight: 600;">Document uploaded on ${new Date(meeting.documentUploadedDate).toLocaleDateString()}</span>
                        </div>
                    </div>
                ` : `
                    <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #856404; display: flex; align-items: center; gap: 8px;">
                        <span>⚠️</span>
                        Unanswered Questions (${meeting.unansweredQuestions.length})
                    </h4>
                    <ul style="margin: 0 0 12px 0; padding-left: 20px; color: #856404;">
                        ${meeting.unansweredQuestions.map(q => `<li style="margin-bottom: 8px;">${q}</li>`).join('')}
                    </ul>
                    <p style="margin: 0 0 12px 0; font-size: 13px; color: #856404;">
                        💡 Upload relevant documents to help Answerly answer these questions in future meetings.
                    </p>
                    <button
                        onclick="uploadDocumentForMeeting('${meeting.id}')"
                        style="background: #ffc107; color: #856404; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px; transition: all 0.2s;"
                        onmouseover="this.style.background='#ffb300'"
                        onmouseout="this.style.background='#ffc107'">
                        📤 Upload Document
                    </button>
                `}
            </div>
        ` : '';

        return `
            <div style="border: 1px solid var(--border-color); border-radius: 12px; padding: 24px; margin-bottom: 20px; background: white;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                    <div>
                        <h3 style="margin: 0 0 8px 0; font-size: 18px; color: var(--text-primary);">${meeting.title || 'Meeting'}</h3>
                        <p style="margin: 0; color: var(--text-secondary); font-size: 14px;">
                            📅 ${formattedDate} at ${formattedTime}
                        </p>
                    </div>
                    <div style="text-align: right;">
                        <div style="background: linear-gradient(135deg, #3b82f6 0%, #10b981 100%); color: white; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 600;">
                            ⏱️ ${durationText}
                        </div>
                        <p style="margin: 8px 0 0 0; font-size: 12px; color: var(--text-secondary);">
                            Answerly Active
                        </p>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 16px;">
                    <div style="text-align: center; padding: 12px; background: #f8f9fa; border-radius: 8px;">
                        <div style="font-size: 24px; font-weight: bold; color: var(--primary-color);">${meeting.questionsAnswered || 0}</div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Questions Answered</div>
                    </div>
                    <div style="text-align: center; padding: 12px; background: #f8f9fa; border-radius: 8px;">
                        <div style="font-size: 24px; font-weight: bold; color: #10b981;">${meeting.documentsReferenced || 0}</div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Documents Referenced</div>
                    </div>
                    <div style="text-align: center; padding: 12px; background: #f8f9fa; border-radius: 8px;">
                        <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${meeting.unansweredQuestions ? meeting.unansweredQuestions.length : 0}</div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Unanswered</div>
                    </div>
                </div>

                ${unansweredSection}
            </div>
        `;
    }).join('');
}

// Answerly Popup Functions
function showAnswerlyModal() {
    // Show the popup in bottom right corner
    const popup = document.getElementById('answerly-listening-popup');
    popup.style.display = 'block';

    // Start the timer
    answerlyStartTime = Date.now();
    answerlyTimerInterval = setInterval(updateAnswerlyTimer, 1000);

    // Use the main Answerly function (no duplicate speech recognition)
    startAnswerly();
}

function closeAnswerlyPopup() {
    const popup = document.getElementById('answerly-listening-popup');
    popup.style.display = 'none';

    // Calculate meeting duration
    const duration = answerlyStartTime ? Math.floor((Date.now() - answerlyStartTime) / 1000) : 0;

    // Save meeting history if the agent was listening (duration > 0)
    if (duration > 0) {
        saveMeetingHistory(duration);
    }

    // Stop the timer
    if (answerlyTimerInterval) {
        clearInterval(answerlyTimerInterval);
        answerlyTimerInterval = null;
    }

    // Reset timer display
    document.getElementById('answerly-timer').textContent = '00:00';

    // Reset meeting data
    answerlyStartTime = null;
    meetingQuestions = [];

    // Stop listening
    stopAnswerlyListening();
}

function saveMeetingHistory(duration) {
    // Get existing meetings history
    const storedMeetings = localStorage.getItem('meetingsHistory');
    const meetings = storedMeetings ? JSON.parse(storedMeetings) : [];

    // Count answered and unanswered questions
    const answeredQuestions = meetingQuestions.filter(q => q.answered);
    const unansweredQuestions = meetingQuestions.filter(q => !q.answered).map(q => q.question);

    // Get documents referenced (from answered questions)
    const documentsReferenced = new Set();
    answeredQuestions.forEach(q => {
        const docMatch = q.answer.match(/Based on "([^"]+)"/);
        if (docMatch) {
            documentsReferenced.add(docMatch[1]);
        }
    });

    // Format date and time for title
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    // Create meeting record
    const meeting = {
        id: Date.now(),
        title: `Meeting Session - ${dateStr} at ${timeStr}`,
        date: now.toISOString(),
        duration: duration,
        questionsAnswered: answeredQuestions.length,
        totalQuestions: meetingQuestions.length,
        documentsReferenced: documentsReferenced.size,
        unansweredQuestions: unansweredQuestions
    };

    // Add to meetings history
    meetings.push(meeting);

    // Save to localStorage
    localStorage.setItem('meetingsHistory', JSON.stringify(meetings));

    console.log('Meeting history saved:', meeting);
}

function updateAnswerlyTimer() {
    if (!answerlyStartTime) return;

    const elapsed = Math.floor((Date.now() - answerlyStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;

    const timerDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.getElementById('answerly-timer').textContent = timerDisplay;

    // Check subscription time limits
    const user = currentUser || JSON.parse(localStorage.getItem('user'));
    if (user) {
        const limits = {
            'free': 15 * 60,      // 15 minutes
            'pro': 120 * 60,      // 2 hours
            'business': Infinity  // Unlimited
        };
        const timeLimit = limits[user.subscription || 'free'];

        if (elapsed >= timeLimit) {
            alert('Your time limit has been reached. Please upgrade your subscription to continue.');
            closeAnswerlyPopup();
        }
    }
}

function startAnswerlyListening() {
    // This function is now deprecated - use startAnswerly() instead
    // Keeping this for backward compatibility but it does nothing
    console.warn('startAnswerlyListening() is deprecated. Use startAnswerly() instead.');
}

function stopAnswerlyListening() {
    if (window.answerlyRecognition) {
        window.answerlyRecognition.stop();
        window.answerlyRecognition = null;
    }
}

// Track recently answered questions to avoid duplicates
let recentlyAnsweredQuestions = [];

async function searchAnswerlyDocuments(question) {
    console.log('Searching for answer to:', question);

    // Check if we already answered this question recently (within last 10 seconds)
    const questionLower = question.toLowerCase().trim();
    const now = Date.now();
    recentlyAnsweredQuestions = recentlyAnsweredQuestions.filter(q => now - q.timestamp < 10000);

    if (recentlyAnsweredQuestions.some(q => q.question === questionLower)) {
        console.log('Question already answered recently, skipping');
        return;
    }

    // Mark this question as being processed
    recentlyAnsweredQuestions.push({ question: questionLower, timestamp: now });

    // Show "searching" message first
    displayAnswerlyResponse(question, '💭 Searching documents...');

    // Get answer from knowledge base using the existing function
    try {
        const answer = await simulateAIAnswer(question);
        const answered = !answer.includes('couldn\'t find') && !answer.includes('error') && !answer.includes('I searched through');

        // Update with actual answer
        displayAnswerlyResponse(question, answer);

        // Track question for meeting history
        meetingQuestions.push({
            question,
            answered,
            answer
        });

        console.log('Answer found:', answered, answer.substring(0, 100));
    } catch (error) {
        console.error('Error searching documents:', error);
        displayAnswerlyResponse(question, 'Error searching documents. Please try again.');
    }
}

function displayAnswerlyResponse(question, answer) {
    const conversationDiv = document.getElementById('answerly-popup-conversation');
    const responseHtml = `
        <div style="margin-bottom: 16px; padding: 12px; background: #f0f9ff; border-left: 3px solid #3b82f6; border-radius: 4px;">
            <div style="font-weight: 600; color: #1e40af; margin-bottom: 4px;">Q: ${question}</div>
            <div style="color: #475569;">A: ${answer}</div>
        </div>
    `;
    conversationDiv.innerHTML = responseHtml + conversationDiv.innerHTML;
}

// Onboarding card toggle functions
let currentOnboardingPeriod = null;
let currentOnboardingItemIndex = null;

function toggleOnboardingCard(cardId) {
    const content = document.getElementById(`content-${cardId}`);
    const icon = document.getElementById(`icon-${cardId}`);

    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.classList.add('expanded');
    } else {
        content.style.display = 'none';
        icon.classList.remove('expanded');
    }
}

function addOnboardingItem(period) {
    currentOnboardingPeriod = period;
    currentOnboardingItemIndex = null;

    document.getElementById('onboarding-item-modal-title').textContent = 'Add Onboarding Item';
    document.getElementById('onboarding-item-text').value = '';
    document.getElementById('onboarding-item-url').value = '';
    document.getElementById('onboarding-item-link-text').value = '';

    document.getElementById('add-onboarding-item-modal').classList.add('active');
}

function editOnboardingItem(period, index) {
    currentOnboardingPeriod = period;
    currentOnboardingItemIndex = index;

    const items = getOnboardingItems();
    const item = items[period][index];

    document.getElementById('onboarding-item-modal-title').textContent = 'Edit Onboarding Item';
    document.getElementById('onboarding-item-text').value = item.text || '';
    document.getElementById('onboarding-item-url').value = item.url || '';
    document.getElementById('onboarding-item-link-text').value = item.linkText || '';

    document.getElementById('add-onboarding-item-modal').classList.add('active');
}

function closeOnboardingItemModal() {
    document.getElementById('add-onboarding-item-modal').classList.remove('active');
    currentOnboardingPeriod = null;
    currentOnboardingItemIndex = null;
}

function saveOnboardingItem() {
    const text = document.getElementById('onboarding-item-text').value.trim();
    const url = document.getElementById('onboarding-item-url').value.trim();
    const linkText = document.getElementById('onboarding-item-link-text').value.trim();

    if (!text) {
        alert('Please enter a task description');
        return;
    }

    const items = getOnboardingItems();
    if (!items[currentOnboardingPeriod]) {
        items[currentOnboardingPeriod] = [];
    }

    const newItem = {
        text,
        url: url || null,
        linkText: linkText || 'View Resource',
        completed: false
    };

    if (currentOnboardingItemIndex !== null) {
        // Edit existing item
        items[currentOnboardingPeriod][currentOnboardingItemIndex] = newItem;
    } else {
        // Add new item
        items[currentOnboardingPeriod].push(newItem);
    }

    localStorage.setItem('onboardingItemsNew', JSON.stringify(items));
    renderOnboardingList(currentOnboardingPeriod);
    updateOnboardingProgress();
    closeOnboardingItemModal();
}

function getOnboardingItems() {
    return JSON.parse(localStorage.getItem('onboardingItemsNew') || '{"1-30":[],"30-60":[],"60-90":[]}');
}

function renderOnboardingList(period) {
    const items = getOnboardingItems();
    const container = document.getElementById(`checklist-${period}`);

    if (!items[period] || items[period].length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No items yet. Click "+ Add Item" to get started.</p>';
        return;
    }

    container.innerHTML = items[period].map((item, index) => `
        <div class="onboarding-item">
            <input
                type="checkbox"
                ${item.completed ? 'checked' : ''}
                onchange="toggleOnboardingItemComplete('${period}', ${index})"
                style="width: 20px; height: 20px; cursor: pointer; flex-shrink: 0;"
            >
            <div class="onboarding-item-content">
                <div class="onboarding-item-text" style="${item.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${item.text}</div>
                ${item.url ? `<a href="${item.url}" target="_blank" class="onboarding-item-link">🔗 ${item.linkText}</a>` : ''}
            </div>
            <div class="onboarding-item-actions">
                <button onclick="editOnboardingItem('${period}', ${index})" title="Edit">✏️</button>
                <button onclick="deleteOnboardingItem('${period}', ${index})" title="Delete" style="color: #ef4444;">🗑️</button>
            </div>
        </div>
    `).join('');
}

function toggleOnboardingItemComplete(period, index) {
    const items = getOnboardingItems();
    items[period][index].completed = !items[period][index].completed;
    localStorage.setItem('onboardingItemsNew', JSON.stringify(items));
    renderOnboardingList(period);
    updateOnboardingProgress();
}

function deleteOnboardingItem(period, index) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    const items = getOnboardingItems();
    items[period].splice(index, 1);
    localStorage.setItem('onboardingItemsNew', JSON.stringify(items));
    renderOnboardingList(period);
    updateOnboardingProgress();
}

// Initialize onboarding lists on dashboard load
function initializeOnboarding() {
    ['1-30', '30-60', '60-90'].forEach(period => {
        renderOnboardingList(period);
    });
    updateOnboardingProgress();
}

// Update progress calculation
function updateOnboardingProgress() {
    const items = getOnboardingItems();

    ['1-30', '30-60', '60-90'].forEach(period => {
        const periodItems = items[period] || [];
        const completed = periodItems.filter(item => item.completed).length;
        const total = periodItems.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        const progressElement = document.getElementById(`days-${period}-progress`);
        if (progressElement) {
            progressElement.textContent = `${percentage}%`;
        }
    });
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