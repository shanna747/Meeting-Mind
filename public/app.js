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

    // Check if user is new (no documents uploaded)
    checkIfNewUser();
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

        if (documents.length === 0) {
            // New user - show onboarding
            showOnboarding();
        } else {
            // Existing user - show Answerly dashboard
            showAnswerlyDashboard();
        }
    } catch (error) {
        console.error('Error checking user status:', error);
        // Default to showing Answerly dashboard
        showAnswerlyDashboard();
    }
}

function showOnboarding() {
    // Hide all dashboard views
    document.querySelectorAll('.dashboard-view').forEach(view => {
        view.classList.remove('active');
    });

    // Show onboarding view
    document.getElementById('onboarding-view').classList.add('active');

    // Setup file upload
    setupOnboardingFileUpload();
}

function showAnswerlyDashboard() {
    // Hide all dashboard views
    document.querySelectorAll('.dashboard-view').forEach(view => {
        view.classList.remove('active');
    });

    // Show Answerly dashboard view
    document.getElementById('answerly-dashboard-view').classList.add('active');

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector('.nav-link[onclick="showAnswerlyDashboard()"]').classList.add('active');

    // Load stats
    loadAnswerlyDashboardStats();
}

function setupOnboardingFileUpload() {
    const dropZone = document.getElementById('onboarding-drop-zone');
    const fileInput = document.getElementById('onboarding-files');
    const fileList = document.getElementById('onboarding-file-list');
    const submitBtn = document.getElementById('onboarding-submit-btn');

    // Click to upload
    dropZone.addEventListener('click', () => fileInput.click());

    // File selection
    fileInput.addEventListener('change', (e) => {
        handleOnboardingFiles(e.target.files);
        submitBtn.disabled = e.target.files.length === 0;
    });

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
        const files = e.dataTransfer.files;
        fileInput.files = files;
        handleOnboardingFiles(files);
        submitBtn.disabled = files.length === 0;
    });

    function handleOnboardingFiles(files) {
        fileList.innerHTML = '';
        Array.from(files).forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span class="file-item-name">${file.name} (${formatFileSize(file.size)})</span>
                <span class="file-item-remove" onclick="removeOnboardingFile(${index})">Remove</span>
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

function removeOnboardingFile(index) {
    const fileInput = document.getElementById('onboarding-files');
    const submitBtn = document.getElementById('onboarding-submit-btn');
    const dt = new DataTransfer();
    const files = Array.from(fileInput.files);

    files.forEach((file, i) => {
        if (i !== index) dt.items.add(file);
    });

    fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event('change'));
    submitBtn.disabled = dt.files.length === 0;
}

async function submitOnboardingDocuments() {
    const fileInput = document.getElementById('onboarding-files');
    const formData = new FormData();

    Array.from(fileInput.files).forEach(file => {
        formData.append('files', file);
    });

    formData.append('category', 'general');
    formData.append('tags', 'onboarding');

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
            // Transition to Answerly dashboard with slide animation
            transitionToAnswerlyDashboard();
        } else {
            alert(data.error || 'Failed to upload documents');
        }
    } catch (error) {
        console.error('Onboarding upload error:', error);
        alert('Failed to upload documents');
    }
}

function transitionToAnswerlyDashboard() {
    const onboardingView = document.getElementById('onboarding-view');
    const answerlyDashboard = document.getElementById('answerly-dashboard-view');

    // Slide out onboarding to the left
    onboardingView.classList.add('slide-out-left');

    // Prepare Answerly dashboard to slide in from right
    answerlyDashboard.classList.add('slide-in-right');
    answerlyDashboard.classList.add('active');

    // Trigger transition
    setTimeout(() => {
        answerlyDashboard.classList.remove('slide-in-right');
        answerlyDashboard.classList.add('slide-in-center');

        setTimeout(() => {
            onboardingView.classList.remove('active', 'slide-out-left');
        }, 500);
    }, 50);

    // Load stats
    loadAnswerlyDashboardStats();
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
    // Hide all dashboard views
    document.querySelectorAll('.dashboard-view').forEach(view => {
        view.classList.remove('active');
    });

    // Show user profile view
    document.getElementById('user-profile-view').classList.add('active');

    // Update nav links - deactivate all
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Load user profile data
    if (currentUser) {
        document.getElementById('profile-name').textContent = currentUser.name || currentUser.email;
        document.getElementById('profile-email').textContent = currentUser.email;

        // Display plan name
        const planName = currentUser.subscription || 'free';
        let planDisplay = 'Starter';
        if (planName === 'pro') {
            planDisplay = 'Pro';
        } else if (planName === 'business') {
            planDisplay = 'Business';
        }
        document.getElementById('profile-plan').textContent = planDisplay;

        // Set meeting limit based on plan
        let meetingLimit = '15 minutes';
        if (planName === 'pro') {
            meetingLimit = '2 hours';
        } else if (planName === 'business') {
            meetingLimit = 'Unlimited';
        }
        document.getElementById('profile-meeting-limit').textContent = meetingLimit;
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

            const actions = card.querySelector('.connection-actions');
            const button = actions?.querySelector('.btn-primary');
            if (button) button.textContent = 'Configure';
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
            meetingTranscript = '';
            meetingQuestions = [];
        }
    } catch (error) {
        console.error('Error starting meeting session:', error);
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
    // Simple question detection - trigger on specific keywords
    const questionWords = ['how', 'will', 'can', 'what', 'when', 'want', 'does', 'if'];
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
    const popupBody = document.getElementById('answerly-popup-body');

    // Clear initial text in popup
    if (popupBody.querySelector('.conversation-flow-text')) {
        popupBody.innerHTML = '';
    }

    // Clear "No questions" message if present in modal
    if (responsesDiv && responsesDiv.textContent.includes('No questions detected')) {
        responsesDiv.innerHTML = '';
    }

    // Add question to modal UI
    if (responsesDiv) {
        const qaBlock = document.createElement('div');
        qaBlock.style.cssText = 'margin-bottom: 16px; padding: 16px; background: var(--background-alt); border-radius: 8px; border-left: 4px solid var(--primary-color);';
        qaBlock.innerHTML = `
            <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">❓ ${question}</div>
            <div style="color: var(--text-secondary); font-size: 14px;">
                <span style="display: inline-block; animation: pulse 1s infinite;">💭 Generating answer...</span>
            </div>
        `;
        responsesDiv.insertBefore(qaBlock, responsesDiv.firstChild);
    }

    // Add question to popup
    const popupQA = document.createElement('div');
    popupQA.className = 'popup-qa-item';
    popupQA.innerHTML = `
        <div class="popup-question">❓ ${question}</div>
        <div class="popup-answer">💭 Searching...</div>
    `;
    popupBody.insertBefore(popupQA, popupBody.firstChild);

    // Generate answer from knowledge base
    try {
        const answer = await simulateAIAnswer(question);
        const answered = !answer.includes('couldn\'t find') && !answer.includes('error') && !answer.includes('I searched through');
        const sourceDoc = answer.match(/Based on "([^"]+)"/)?.[1] || '';

        // Update modal
        if (responsesDiv) {
            const qaBlock = responsesDiv.firstChild;
            qaBlock.innerHTML = `
                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">❓ ${question}</div>
                <div style="color: var(--text-secondary); font-size: 14px; line-height: 1.6;">
                    ${answered ? '✅' : ''} ${answer}
                </div>
            `;
        }

        // Update popup
        popupQA.innerHTML = `
            <div class="popup-question">${answered ? '✅' : ''} ${question}</div>
            <div class="popup-answer">${answer}</div>
        `;

        // Auto-scroll popup to top
        popupBody.scrollTop = 0;

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
        // Update modal
        if (responsesDiv) {
            const qaBlock = responsesDiv.firstChild;
            qaBlock.innerHTML = `
                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">❓ ${question}</div>
                <div style="color: var(--error-color); font-size: 14px;">
                    ❌ Error generating answer
                </div>
            `;
        }

        // Update popup
        popupQA.innerHTML = `
            <div class="popup-question">❓ ${question}</div>
            <div class="popup-answer" style="color: var(--error-color);">❌ Error generating answer</div>
        `;
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

function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes === 0) return `${secs}s`;
    return `${minutes}m ${secs}s`;
}

function handleMeetingAction(select, meetingId) {
    const action = select.value;
    if (!action) return;

    switch(action) {
        case 'view':
            viewMeetingDetails(meetingId);
            break;
        case 'delete':
            deleteMeeting(meetingId);
            break;
    }

    // Reset dropdown
    select.value = '';
}

async function viewMeetingDetails(meetingId) {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`/api/meeting-notes/${meetingId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load meeting details');
        }

        const data = await response.json();
        const meeting = data.meeting;

        let questionsHTML = '';
        if (meeting.questions && meeting.questions.length > 0) {
            questionsHTML = meeting.questions.map((q, index) => `
                <div style="margin-bottom: 16px; padding: 16px; background: white; border: 2px solid var(--border-color); border-left: 4px solid ${q.answered ? 'var(--primary-color)' : '#ef4444'}; border-radius: 8px;">
                    <div style="margin-bottom: 8px; font-size: 15px; color: #1f2937; line-height: 1.6;">
                        ${q.answered ? '✅ ' : ''}<strong>Question ${index + 1}:</strong> ${q.question}
                    </div>
                    ${q.answer ? `
                        <div style="margin-top: 12px; font-size: 15px; color: #4b5563; line-height: 1.6;">
                            <strong>Answer:</strong> ${q.answer}
                        </div>
                    ` : '<div style="margin-top: 8px; font-size: 14px; color: #6b7280; font-style: italic;">No answer provided</div>'}
                    <div style="margin-top: 8px; font-size: 12px; color: #9ca3af;">
                        ${new Date(q.timestamp).toLocaleString()}
                    </div>
                </div>
            `).join('');
        } else {
            questionsHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px 20px; background: var(--background-alt); border-radius: 8px;">No questions recorded for this meeting.</p>';
        }

        const detailsHTML = `
            <h2 style="margin-bottom: 8px;">${meeting.title}</h2>
            <p style="color: var(--text-secondary); margin-bottom: 24px; font-size: 14px;">
                📅 ${new Date(meeting.startTime).toLocaleString()} |
                ⏱️ ${formatDuration(meeting.duration || 0)} |
                💬 ${meeting.summary.totalQuestions || 0} Questions
            </p>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;">
                <div style="padding: 12px; background: var(--background-alt); border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: 600; color: var(--primary-color);">${meeting.summary.totalQuestions || 0}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">Total Questions</div>
                </div>
                <div style="padding: 12px; background: #ecfdf5; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: 600; color: #10b981;">${meeting.summary.answeredQuestions || 0}</div>
                    <div style="font-size: 12px; color: #065f46;">Answered</div>
                </div>
                <div style="padding: 12px; background: #fef3c7; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; font-weight: 600; color: #f59e0b;">${meeting.summary.needsDocumentation || 0}</div>
                    <div style="font-size: 12px; color: #92400e;">Needs Docs</div>
                </div>
            </div>

            <h3 style="margin-bottom: 16px; font-size: 18px;">Questions & Answers</h3>
            <div style="max-height: 500px; overflow-y: auto;">
                ${questionsHTML}
            </div>
        `;

        document.getElementById('meeting-details-content').innerHTML = detailsHTML;
        document.getElementById('meeting-details-modal').classList.add('active');
    } catch (error) {
        console.error('Error viewing meeting details:', error);
        alert('Failed to load meeting details');
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
        const token = localStorage.getItem('token');

        // First, try to get documents from the knowledge base
        const docsResponse = await fetch('/api/datasources/documents', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!docsResponse.ok) {
            throw new Error('Failed to fetch documents');
        }

        const docsData = await docsResponse.json();
        const documents = docsData.documents || [];

        if (documents.length === 0) {
            return "I couldn't find any documents in your knowledge base. Please upload some documents first.";
        }

        // Enhanced keyword-based search - search for ALL words in the question
        const questionLower = question.toLowerCase();
        // Remove common stop words but keep most words
        const stopWords = ['a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'but'];
        const keywords = questionLower
            .replace(/[^\w\s]/g, ' ') // Remove punctuation
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.includes(word));

        console.log('Searching for keywords:', keywords);

        let bestMatch = null;
        let bestScore = 0;
        let allMatches = [];

        for (const doc of documents) {
            if (doc.status !== 'active') continue;

            // Try to get document content
            try {
                const contentResponse = await fetch(`/api/datasources/documents/${doc.id}/content`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (contentResponse.ok) {
                    const contentData = await contentResponse.json();
                    const content = contentData.content || '';
                    const contentLower = content.toLowerCase();

                    // Enhanced scoring: each keyword gets points, partial matches count
                    let score = 0;
                    let matchedKeywords = [];

                    keywords.forEach(keyword => {
                        // Exact matches (word boundary)
                        const exactMatches = (contentLower.match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
                        // Partial matches (contains keyword)
                        const partialMatches = (contentLower.match(new RegExp(keyword, 'g')) || []).length;

                        if (exactMatches > 0) {
                            score += exactMatches * 3; // Exact matches worth more
                            matchedKeywords.push(keyword);
                        } else if (partialMatches > 0) {
                            score += partialMatches; // Partial matches worth less
                            matchedKeywords.push(keyword);
                        }
                    });

                    if (score > 0) {
                        allMatches.push({
                            doc,
                            content,
                            score,
                            matchedKeywords
                        });

                        if (score > bestScore) {
                            bestScore = score;
                            bestMatch = {
                                doc,
                                content,
                                score,
                                matchedKeywords
                            };
                        }
                    }
                }
            } catch (err) {
                console.error('Error reading document:', err);
            }
        }

        console.log('Found matches:', allMatches.length, 'Best score:', bestScore);

        if (bestMatch && bestMatch.score > 0) {
            // Extract relevant snippets containing the matched keywords
            const content = bestMatch.content;
            const contentLower = content.toLowerCase();

            let snippets = [];

            // Find snippets for each matched keyword
            bestMatch.matchedKeywords.slice(0, 3).forEach(keyword => {
                const index = contentLower.indexOf(keyword);
                if (index !== -1) {
                    const start = Math.max(0, index - 150);
                    const end = Math.min(content.length, index + 350);
                    let snippet = content.substring(start, end).trim();

                    // Clean up snippet
                    if (start > 0) snippet = '...' + snippet;
                    if (end < content.length) snippet = snippet + '...';

                    snippets.push(snippet);
                }
            });

            // Combine snippets or use first one
            const resultSnippet = snippets.length > 0 ? snippets[0] : content.substring(0, 500);

            return `Based on "${bestMatch.doc.originalName}" (matched: ${bestMatch.matchedKeywords.join(', ')}):\n\n${resultSnippet}`;
        } else {
            return `I searched through ${documents.length} document(s) but couldn't find relevant information. Keywords searched: ${keywords.join(', ')}. Try rephrasing your question or check if your documents contain this information.`;
        }

    } catch (error) {
        console.error('Error querying knowledge base:', error);
        return "Sorry, I encountered an error while searching your knowledge base. Please make sure you have uploaded documents to the Company Knowledge Base.";
    }
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