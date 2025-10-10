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
    // Load projects from localStorage
    const storedProjects = localStorage.getItem('projects');
    const allProjects = storedProjects ? JSON.parse(storedProjects) : [];

    // Filter active projects
    const activeProjects = allProjects.filter(p => !p.archived);

    // Count active projects
    document.getElementById('active-projects-count').textContent = activeProjects.length;

    // Count open tasks across all projects
    let openTasksCount = 0;
    let totalDocumentsCount = 0;
    let teamMembersSet = new Set();
    let recentActivities = [];

    activeProjects.forEach(project => {
        const projectData = JSON.parse(localStorage.getItem(`project_${project.id}`) || '{}');

        // Count open tasks
        if (projectData.timeline) {
            const openTasks = projectData.timeline.filter(t => !t.completed);
            openTasksCount += openTasks.length;

            // Collect recent task activity
            projectData.timeline.forEach(task => {
                recentActivities.push({
                    type: 'task',
                    projectName: project.clientName,
                    title: task.title || task.name,
                    timestamp: new Date(task.createdAt),
                    completed: task.completed
                });
            });
        }

        // Count documents
        if (projectData.documents) {
            totalDocumentsCount += projectData.documents.length;
        }

        // Count unique team members
        if (project.teamMembers) {
            project.teamMembers.forEach(member => {
                teamMembersSet.add(member.email);
            });
        }

        // Collect chat activity
        if (projectData.chat) {
            projectData.chat.forEach(chat => {
                recentActivities.push({
                    type: 'chat',
                    projectName: project.clientName,
                    title: chat.text.substring(0, 50) + (chat.text.length > 50 ? '...' : ''),
                    timestamp: new Date(chat.createdAt),
                    author: chat.author
                });
            });
        }
    });

    document.getElementById('open-tasks-count').textContent = openTasksCount;
    document.getElementById('total-documents-count').textContent = totalDocumentsCount;
    document.getElementById('total-team-count').textContent = teamMembersSet.size;

    // Calculate total project value
    let totalProjectValue = 0;
    activeProjects.forEach(project => {
        const value = parseFloat(project.contractValue) || 0;
        totalProjectValue += value;
    });
    document.getElementById('total-project-value').textContent = `$${totalProjectValue.toLocaleString()}`;

    // Display recent activity (last 5 items)
    recentActivities.sort((a, b) => b.timestamp - a.timestamp);
    const recentFive = recentActivities.slice(0, 5);

    const activityContainer = document.getElementById('recent-activity');
    if (recentFive.length === 0) {
        activityContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 40px 0;">No recent activity</p>';
    } else {
        activityContainer.innerHTML = recentFive.map(activity => {
            let icon = '';
            let actionText = '';

            if (activity.type === 'task') {
                icon = activity.completed ? '✅' : '📋';
                actionText = activity.completed ? 'Completed task' : 'Created task';
            } else if (activity.type === 'chat') {
                icon = '💬';
                actionText = 'Posted message';
            }

            return `
                <div style="display: flex; gap: 16px; padding: 16px; border-bottom: 1px solid var(--border-color); align-items: start;">
                    <div style="font-size: 24px;">${icon}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; margin-bottom: 4px;">${actionText} in ${activity.projectName}</div>
                        <div style="color: var(--text-secondary); font-size: 14px; margin-bottom: 4px;">${activity.title}</div>
                        <div style="color: var(--text-secondary); font-size: 12px;">${activity.timestamp.toLocaleString()}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

function showProjects() {
    document.querySelectorAll('.dashboard-view').forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById('projects-view').classList.add('active');

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector('.nav-link[onclick="showProjects()"]').classList.add('active');

    loadProjects();
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

    loadMeetingDocuments();
}

function showOnboarding() {
    document.querySelectorAll('.dashboard-view').forEach(view => {
        view.classList.remove('active');
    });
    // Show onboarding view
    const onboardingView = document.getElementById('onboarding-view');
    if (onboardingView) {
        onboardingView.classList.add('active');
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector('.nav-link[onclick="showOnboarding()"]').classList.add('active');

    // Load onboarding checklists
    loadOnboardingChecklists();
}

// Onboarding Checklist Data
const onboardingData = {
    '1-30': [
        'Complete HR paperwork and benefits enrollment',
        'Set up email, Slack, and necessary software accounts',
        'Meet with your manager to review role expectations',
        'Schedule 1-on-1s with key team members',
        'Review company organizational chart and reporting structure',
        'Learn about company culture, values, and mission',
        'Understand current projects and priorities',
        'Set up your workspace and equipment',
        'Review project management tools and processes',
        'Shadow team meetings and standups',
        'Complete required training and certifications',
        'Review project documentation and standards'
    ],
    '30-60': [
        'Take ownership of your first project or workstream',
        'Establish regular check-ins with direct reports',
        'Build relationships with cross-functional partners',
        'Identify process improvements and share feedback',
        'Lead your first team meeting or presentation',
        'Create 30-60-90 day plan with your manager',
        'Begin contributing to strategic planning discussions',
        'Mentor or onboard a new team member',
        'Review and optimize team workflows',
        'Establish key performance metrics for your projects'
    ],
    '60-90': [
        'Own end-to-end delivery of a major project',
        'Present strategic recommendations to leadership',
        'Implement a process improvement initiative',
        'Build and maintain stakeholder relationships',
        'Contribute to team hiring or resource planning',
        'Lead cross-functional collaboration efforts',
        'Establish yourself as a subject matter expert',
        'Create documentation or training materials',
        'Set goals for your next 6 months',
        'Provide feedback on onboarding experience'
    ]
};

function loadOnboardingChecklists() {
    // Load saved progress from localStorage
    const savedProgress = JSON.parse(localStorage.getItem('onboardingProgress') || '{}');
    const savedItems = JSON.parse(localStorage.getItem('onboardingItems') || '{}');

    // Initialize if not exists
    if (!savedProgress['1-30']) savedProgress['1-30'] = [];
    if (!savedProgress['30-60']) savedProgress['30-60'] = [];
    if (!savedProgress['60-90']) savedProgress['60-90'] = [];

    // Merge saved items with default items
    ['1-30', '30-60', '60-90'].forEach(period => {
        if (savedItems[period]) {
            Object.keys(savedItems[period]).forEach(index => {
                const idx = parseInt(index);
                if (onboardingData[period][idx] !== undefined) {
                    onboardingData[period][idx] = savedItems[period][index];
                }
            });
        }
    });

    // Render each checklist
    renderChecklist('1-30', onboardingData['1-30'], savedProgress['1-30']);
    renderChecklist('30-60', onboardingData['30-60'], savedProgress['30-60']);
    renderChecklist('60-90', onboardingData['60-90'], savedProgress['60-90']);

    // Update progress percentages
    updateOnboardingProgress();
}

function renderChecklist(period, items, completedItems) {
    const container = document.getElementById(`checklist-${period}`);

    container.innerHTML = items.map((item, index) => {
        const isCompleted = completedItems.includes(index);
        return `
            <div style="padding: 16px; background: ${isCompleted ? 'var(--success-light)' : 'var(--background-alt)'}; border-radius: 8px; margin-bottom: 12px; transition: all 0.3s ease;">
                <div style="display: flex; align-items: flex-start; gap: 16px; margin-bottom: 8px;">
                    <input
                        type="checkbox"
                        ${isCompleted ? 'checked' : ''}
                        onchange="toggleOnboardingItem('${period}', ${index})"
                        style="width: 24px; height: 24px; cursor: pointer; flex-shrink: 0; margin-top: 4px;"
                    >
                    <div
                        id="checklist-item-${period}-${index}"
                        contenteditable="true"
                        onblur="saveChecklistItem('${period}', ${index})"
                        style="flex: 1; font-size: 15px; ${isCompleted ? 'text-decoration: line-through; color: var(--text-secondary);' : 'color: var(--text-color);'} outline: none; padding: 4px; border-radius: 4px; min-height: 24px;"
                    >${item}</div>
                    ${isCompleted ? '<span style="color: var(--success-color); font-size: 20px;">✓</span>' : ''}
                </div>
                <div style="display: flex; gap: 8px; margin-left: 40px; opacity: 0.7; transition: opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">
                    <button type="button" onclick="formatChecklistText('${period}', ${index}, 'bold')" style="padding: 4px 10px; border: 1px solid var(--border-color); border-radius: 4px; background: white; cursor: pointer; font-weight: bold; font-size: 12px;">B</button>
                    <button type="button" onclick="formatChecklistText('${period}', ${index}, 'italic')" style="padding: 4px 10px; border: 1px solid var(--border-color); border-radius: 4px; background: white; cursor: pointer; font-style: italic; font-size: 12px;">I</button>
                    <button type="button" onclick="formatChecklistText('${period}', ${index}, 'underline')" style="padding: 4px 10px; border: 1px solid var(--border-color); border-radius: 4px; background: white; cursor: pointer; text-decoration: underline; font-size: 12px;">U</button>
                    <button type="button" onclick="formatChecklistText('${period}', ${index}, 'insertUnorderedList')" style="padding: 4px 10px; border: 1px solid var(--border-color); border-radius: 4px; background: white; cursor: pointer; font-size: 12px;">• List</button>
                    <button type="button" onclick="deleteChecklistItem('${period}', ${index})" style="padding: 4px 10px; border: 1px solid #ef4444; border-radius: 4px; background: white; cursor: pointer; color: #ef4444; font-size: 12px;">Delete</button>
                </div>
            </div>
        `;
    }).join('');

    // Add new item button
    container.innerHTML += `
        <button type="button" onclick="addChecklistItem('${period}')" class="btn-secondary" style="width: 100%; padding: 12px; margin-top: 8px;">
            + Add Item
        </button>
    `;
}

function toggleOnboardingItem(period, itemIndex) {
    const savedProgress = JSON.parse(localStorage.getItem('onboardingProgress') || '{}');

    if (!savedProgress[period]) savedProgress[period] = [];

    const index = savedProgress[period].indexOf(itemIndex);
    if (index > -1) {
        // Remove from completed
        savedProgress[period].splice(index, 1);
    } else {
        // Add to completed
        savedProgress[period].push(itemIndex);
    }

    // Save to localStorage
    localStorage.setItem('onboardingProgress', JSON.stringify(savedProgress));

    // Re-render the specific checklist
    renderChecklist(period, onboardingData[period], savedProgress[period]);

    // Update progress
    updateOnboardingProgress();
}

function updateOnboardingProgress() {
    const savedProgress = JSON.parse(localStorage.getItem('onboardingProgress') || '{}');

    // Calculate and update each period's progress
    ['1-30', '30-60', '60-90'].forEach(period => {
        const total = onboardingData[period].length;
        const completed = (savedProgress[period] || []).length;
        const percentage = Math.round((completed / total) * 100);

        const displayPeriod = period === '1-30' ? 'days-1-30-progress' :
                             period === '30-60' ? 'days-30-60-progress' :
                             'days-60-90-progress';

        document.getElementById(displayPeriod).textContent = `${percentage}%`;
    });
}

function formatChecklistText(period, index, command) {
    const element = document.getElementById(`checklist-item-${period}-${index}`);
    if (element) {
        element.focus();
        document.execCommand(command, false, null);
    }
}

function saveChecklistItem(period, index) {
    const element = document.getElementById(`checklist-item-${period}-${index}`);
    if (element) {
        const newText = element.innerHTML;
        onboardingData[period][index] = newText;

        // Save to localStorage
        const savedItems = JSON.parse(localStorage.getItem('onboardingItems') || '{}');
        if (!savedItems[period]) savedItems[period] = {};
        savedItems[period][index] = newText;
        localStorage.setItem('onboardingItems', JSON.stringify(savedItems));
    }
}

function addChecklistItem(period) {
    const newItem = 'New checklist item';
    onboardingData[period].push(newItem);

    // Save to localStorage
    const savedItems = JSON.parse(localStorage.getItem('onboardingItems') || '{}');
    if (!savedItems[period]) savedItems[period] = {};
    savedItems[period][onboardingData[period].length - 1] = newItem;
    localStorage.setItem('onboardingItems', JSON.stringify(savedItems));

    // Re-render
    const savedProgress = JSON.parse(localStorage.getItem('onboardingProgress') || '{}');
    renderChecklist(period, onboardingData[period], savedProgress[period] || []);
    updateOnboardingProgress();
}

function deleteChecklistItem(period, index) {
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }

    // Remove from data
    onboardingData[period].splice(index, 1);

    // Update localStorage items
    const savedItems = JSON.parse(localStorage.getItem('onboardingItems') || '{}');
    if (savedItems[period]) {
        delete savedItems[period][index];
        // Re-index remaining items
        const newItems = {};
        Object.keys(savedItems[period]).forEach(key => {
            const keyIndex = parseInt(key);
            if (keyIndex > index) {
                newItems[keyIndex - 1] = savedItems[period][key];
            } else if (keyIndex < index) {
                newItems[keyIndex] = savedItems[period][key];
            }
        });
        savedItems[period] = newItems;
        localStorage.setItem('onboardingItems', JSON.stringify(savedItems));
    }

    // Update completed items indices
    const savedProgress = JSON.parse(localStorage.getItem('onboardingProgress') || '{}');
    if (savedProgress[period]) {
        savedProgress[period] = savedProgress[period]
            .filter(i => i !== index)
            .map(i => i > index ? i - 1 : i);
        localStorage.setItem('onboardingProgress', JSON.stringify(savedProgress));
    }

    // Re-render
    renderChecklist(period, onboardingData[period], savedProgress[period] || []);
    updateOnboardingProgress();
}

function openCreateProjectModal() {
    document.getElementById('create-project-modal').style.display = 'block';
    teamMembers = [];
    document.getElementById('team-members-list').innerHTML = '';
}

function closeCreateProjectModal() {
    document.getElementById('create-project-modal').style.display = 'none';
    document.getElementById('project-client-name').value = '';
    document.getElementById('project-description').innerHTML = '';
    document.getElementById('project-logo').value = '';
    document.getElementById('project-documents').value = '';
    document.getElementById('project-contract-value').value = '';
    document.getElementById('project-start-date').value = '';
    document.getElementById('project-end-date').value = '';
    document.getElementById('project-manager').value = '';
    teamMembers = [];
    document.getElementById('team-members-list').innerHTML = '';
}

function formatText(command) {
    document.execCommand(command, false, null);
    document.getElementById('project-description').focus();
}

function addTeamMember() {
    const firstName = document.getElementById('team-member-firstname').value.trim();
    const lastName = document.getElementById('team-member-lastname').value.trim();
    const email = document.getElementById('team-member-email').value.trim();

    if (!firstName || !lastName || !email) {
        alert('Please fill in all team member fields');
        return;
    }

    if (!email.includes('@')) {
        alert('Please enter a valid email address');
        return;
    }

    teamMembers.push({ firstName, lastName, email });

    const membersList = document.getElementById('team-members-list');
    const memberDiv = document.createElement('div');
    memberDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--background-alt); border-radius: 6px; margin-bottom: 8px;';
    memberDiv.innerHTML = `
        <span>${firstName} ${lastName} (${email})</span>
        <button onclick="removeTeamMember(${teamMembers.length - 1})" style="background: #ef4444; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer;">Remove</button>
    `;
    membersList.appendChild(memberDiv);

    document.getElementById('team-member-firstname').value = '';
    document.getElementById('team-member-lastname').value = '';
    document.getElementById('team-member-email').value = '';
}

function removeTeamMember(index) {
    teamMembers.splice(index, 1);
    updateTeamMembersList();
}

function updateTeamMembersList() {
    const membersList = document.getElementById('team-members-list');
    membersList.innerHTML = '';
    teamMembers.forEach((member, index) => {
        const memberDiv = document.createElement('div');
        memberDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--background-alt); border-radius: 6px; margin-bottom: 8px;';
        memberDiv.innerHTML = `
            <span>${member.firstName} ${member.lastName} (${member.email})</span>
            <button onclick="removeTeamMember(${index})" style="background: #ef4444; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer;">Remove</button>
        `;
        membersList.appendChild(memberDiv);
    });
}

async function createProject() {
    const clientName = document.getElementById('project-client-name').value.trim();
    const description = document.getElementById('project-description').innerHTML.trim();
    const contractValue = document.getElementById('project-contract-value').value;
    const startDate = document.getElementById('project-start-date').value;
    const endDate = document.getElementById('project-end-date').value;
    const projectManager = document.getElementById('project-manager').value.trim();

    if (!clientName || !description || !startDate || !endDate || !projectManager) {
        alert('Please fill in all required fields (marked with *)');
        return;
    }

    const logoFile = document.getElementById('project-logo').files[0];
    let logoUrl = '';

    // Convert logo to base64 for local storage
    if (logoFile) {
        logoUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(logoFile);
        });
    }

    // Create project object
    const project = {
        id: Date.now().toString(),
        clientName,
        description,
        contractValue: contractValue || 0,
        startDate,
        endDate,
        projectManager,
        teamMembers: [...teamMembers],
        logo: logoUrl,
        createdAt: new Date().toISOString()
    };

    // Store in local projects array
    projects.push(project);

    // Save to localStorage for persistence
    localStorage.setItem('projects', JSON.stringify(projects));

    alert('Project created successfully!');
    closeCreateProjectModal();
    loadProjects();
}

function editProject(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    // Open the create project modal in edit mode
    const modal = document.getElementById('create-project-modal');
    modal.style.display = 'block';
    modal.setAttribute('data-edit-mode', 'true');
    modal.setAttribute('data-edit-id', projectId);

    // Pre-populate form fields
    document.getElementById('project-client-name').value = project.clientName;
    document.getElementById('project-description').innerHTML = project.description;
    document.getElementById('project-contract-value').value = project.contractValue;
    document.getElementById('project-start-date').value = project.startDate;
    document.getElementById('project-end-date').value = project.endDate;
    document.getElementById('project-manager').value = project.projectManager;

    // Load team members
    teamMembers = [...project.teamMembers];
    updateTeamMembersList();

    // Change modal title and button text
    const modalTitle = modal.querySelector('h2');
    if (modalTitle) modalTitle.textContent = 'Edit Project';

    const submitBtn = modal.querySelector('button[onclick="createProject()"]');
    if (submitBtn) {
        submitBtn.textContent = 'Update Project';
        submitBtn.setAttribute('onclick', 'updateProject()');
    }
}

async function updateProject() {
    const modal = document.getElementById('create-project-modal');
    const projectId = modal.getAttribute('data-edit-id');
    const projectIndex = projects.findIndex(p => p.id === projectId);

    if (projectIndex === -1) return;

    const clientName = document.getElementById('project-client-name').value.trim();
    const description = document.getElementById('project-description').innerHTML.trim();
    const contractValue = document.getElementById('project-contract-value').value;
    const startDate = document.getElementById('project-start-date').value;
    const endDate = document.getElementById('project-end-date').value;
    const projectManager = document.getElementById('project-manager').value.trim();

    if (!clientName || !description || !startDate || !endDate || !projectManager) {
        alert('Please fill in all required fields (marked with *)');
        return;
    }

    const logoFile = document.getElementById('project-logo').files[0];
    let logoUrl = projects[projectIndex].logo; // Keep existing logo if no new one

    // Convert new logo to base64 if uploaded
    if (logoFile) {
        logoUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(logoFile);
        });
    }

    // Update project object
    projects[projectIndex] = {
        ...projects[projectIndex],
        clientName,
        description,
        contractValue: contractValue || 0,
        startDate,
        endDate,
        projectManager,
        teamMembers: [...teamMembers],
        logo: logoUrl,
        updatedAt: new Date().toISOString()
    };

    // Save to localStorage
    localStorage.setItem('projects', JSON.stringify(projects));

    alert('Project updated successfully!');

    // Reset modal to create mode
    modal.removeAttribute('data-edit-mode');
    modal.removeAttribute('data-edit-id');
    const modalTitle = modal.querySelector('h2');
    if (modalTitle) modalTitle.textContent = 'Create New Project';
    const submitBtn = modal.querySelector('button[onclick="updateProject()"]');
    if (submitBtn) {
        submitBtn.textContent = 'Create Project';
        submitBtn.setAttribute('onclick', 'createProject()');
    }

    closeCreateProjectModal();
    loadProjects();
}

function loadProjects() {
    // Load projects from localStorage
    const storedProjects = localStorage.getItem('projects');
    if (storedProjects) {
        projects = JSON.parse(storedProjects);
    }

    const projectsGrid = document.getElementById('projects-grid');
    const emptyState = document.getElementById('projects-empty-state');
    const createBtn = document.getElementById('create-project-btn');

    // Filter active (non-archived) projects
    const activeProjects = projects.filter(p => !p.archived);

    // Show/hide elements based on active project count
    if (activeProjects.length === 0) {
        emptyState.style.display = 'block';
        projectsGrid.style.display = 'none';
        createBtn.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        projectsGrid.style.display = 'grid';
        createBtn.style.display = 'block';

        // Display project cards (only active projects)
        projectsGrid.innerHTML = activeProjects.map(project => `
            <div class="project-card" style="
                background: white;
                border-radius: 12px;
                padding: 16px;
                cursor: pointer;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                transition: all 0.2s ease;
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                aspect-ratio: 1;
                justify-content: center;
                position: relative;
                max-width: 200px;
            " onmouseover="this.style.boxShadow='0 8px 24px rgba(0,0,0,0.15)'; this.style.transform='translateY(-4px)';" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'; this.style.transform='translateY(0)';">
                <!-- Action Icons -->
                <div style="position: absolute; top: 12px; right: 12px; display: flex; gap: 8px; z-index: 10;">
                    <button onclick="event.stopPropagation(); editProject('${project.id}')" title="Settings" style="background: transparent; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                    <button onclick="event.stopPropagation(); archiveProject('${project.id}')" title="Archive" style="background: transparent; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="21 8 21 21 3 21 3 8"></polyline>
                            <rect x="1" y="3" width="22" height="5"></rect>
                            <line x1="10" y1="12" x2="14" y2="12"></line>
                        </svg>
                    </button>
                </div>

                <!-- Card Content (clickable to open project board) -->
                <div onclick="viewProject('${project.id}')" style="display: flex; flex-direction: column; align-items: center; width: 100%;">
                    ${project.logo ?
                        `<img src="${project.logo}" alt="${project.clientName}" style="width: 60px; height: 60px; object-fit: contain; border-radius: 8px; margin-bottom: 12px;">`
                        :
                        `<div style="width: 60px; height: 60px; background: linear-gradient(135deg, #3b82f6 0%, #10b981 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; color: white; font-size: 28px; font-weight: bold;">${project.clientName.charAt(0)}</div>`
                    }
                    <h3 style="margin: 0; font-size: 14px; color: var(--text-color); font-weight: 600;">${project.clientName}</h3>
                </div>
            </div>
        `).join('');
    }
}

function viewProject(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    // Show project board modal
    showProjectBoard(project);
}

function showProjectBoard(project) {
    // Create fullscreen project board modal
    const modal = document.createElement('div');
    modal.id = 'project-board-modal';
    modal.className = 'modal';
    modal.style.cssText = 'display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5);';

    modal.innerHTML = `
        <div style="background: white; width: 100%; height: 100%; display: flex; flex-direction: column;">
            <!-- Project Header -->
            <div style="background: white; padding: 24px 40px; border-bottom: 2px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 20px;">
                    ${project.logo ?
                        `<img src="${project.logo}" alt="${project.clientName}" style="width: 60px; height: 60px; object-fit: contain; border-radius: 8px;">`
                        :
                        `<div style="width: 60px; height: 60px; background: linear-gradient(135deg, #3b82f6 0%, #10b981 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 28px; font-weight: bold;">${project.clientName.charAt(0)}</div>`
                    }
                    <div>
                        <h2 style="margin: 0 0 6px 0;">${project.clientName}</h2>
                        <p style="margin: 0; color: var(--text-secondary); font-size: 14px;">PM: ${project.projectManager} | Value: $${parseFloat(project.contractValue).toLocaleString()} | ${new Date(project.startDate).toLocaleDateString()} - ${new Date(project.endDate).toLocaleDateString()}</p>
                    </div>
                </div>
                <button onclick="closeProjectBoard()" style="background: transparent; border: none; font-size: 32px; cursor: pointer; color: var(--text-secondary);">&times;</button>
            </div>

            <!-- Navigation Tabs -->
            <div style="background: white; padding: 0 40px; border-bottom: 2px solid var(--border-color); display: flex; gap: 30px;">
                <button class="project-tab active" onclick="switchProjectTab('${project.id}', 'overview')" data-tab="overview" style="background: transparent; border: none; padding: 16px 0; font-size: 15px; font-weight: 600; color: var(--primary-color); cursor: pointer; border-bottom: 3px solid var(--primary-color); transition: all 0.2s;">Overview</button>
                <button class="project-tab" onclick="switchProjectTab('${project.id}', 'timeline')" data-tab="timeline" style="background: transparent; border: none; padding: 16px 0; font-size: 15px; font-weight: 600; color: var(--text-secondary); cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.2s;">Timeline</button>
                <button class="project-tab" onclick="switchProjectTab('${project.id}', 'team')" data-tab="team" style="background: transparent; border: none; padding: 16px 0; font-size: 15px; font-weight: 600; color: var(--text-secondary); cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.2s;">Team Members</button>
                <button class="project-tab" onclick="switchProjectTab('${project.id}', 'documents')" data-tab="documents" style="background: transparent; border: none; padding: 16px 0; font-size: 15px; font-weight: 600; color: var(--text-secondary); cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.2s;">Documents</button>
                <button class="project-tab" onclick="switchProjectTab('${project.id}', 'chat')" data-tab="chat" style="background: transparent; border: none; padding: 16px 0; font-size: 15px; font-weight: 600; color: var(--text-secondary); cursor: pointer; border-bottom: 3px solid transparent; transition: all 0.2s;">Chat</button>
            </div>

            <!-- Tab Content -->
            <div style="flex: 1; overflow-y: auto; padding: 40px;">
                <!-- Overview Tab -->
                <div id="tab-overview-${project.id}" class="project-tab-content" style="display: block;">
                    <div style="max-width: 1200px; margin: 0 auto;">
                        <h3 style="margin: 0 0 24px 0; font-size: 22px; color: var(--text-color);">Project Information</h3>

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-bottom: 30px;">
                            <!-- Client Info Card -->
                            <div style="background: white; border: 2px solid var(--border-color); border-radius: 12px; padding: 24px;">
                                <h4 style="margin: 0 0 16px 0; font-size: 16px; color: var(--text-secondary);">Client Details</h4>
                                <div style="margin-bottom: 12px;">
                                    <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">Client Name</div>
                                    <div style="font-size: 15px; font-weight: 600; color: var(--text-color);">${project.clientName}</div>
                                </div>
                                <div style="margin-bottom: 12px;">
                                    <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">Project Manager</div>
                                    <div style="font-size: 15px; font-weight: 600; color: var(--text-color);">${project.projectManager}</div>
                                </div>
                            </div>

                            <!-- Timeline Card -->
                            <div style="background: white; border: 2px solid var(--border-color); border-radius: 12px; padding: 24px;">
                                <h4 style="margin: 0 0 16px 0; font-size: 16px; color: var(--text-secondary);">Timeline</h4>
                                <div style="margin-bottom: 12px;">
                                    <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">Start Date</div>
                                    <div style="font-size: 15px; font-weight: 600; color: var(--text-color);">${new Date(project.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                                </div>
                                <div style="margin-bottom: 12px;">
                                    <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">End Date</div>
                                    <div style="font-size: 15px; font-weight: 600; color: var(--text-color);">${new Date(project.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                                </div>
                            </div>

                            <!-- Financial Card -->
                            <div style="background: white; border: 2px solid var(--border-color); border-radius: 12px; padding: 24px;">
                                <h4 style="margin: 0 0 16px 0; font-size: 16px; color: var(--text-secondary);">Financial</h4>
                                <div style="margin-bottom: 12px;">
                                    <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">Contract Value</div>
                                    <div style="font-size: 24px; font-weight: 700; color: var(--primary-color);">$${parseFloat(project.contractValue || 0).toLocaleString()}</div>
                                </div>
                            </div>
                        </div>

                        <!-- Project Description -->
                        <div style="background: white; border: 2px solid var(--border-color); border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                            <h4 style="margin: 0 0 16px 0; font-size: 16px; color: var(--text-secondary);">Project Description</h4>
                            <div style="color: var(--text-color); font-size: 15px; line-height: 1.6;">${project.description}</div>
                        </div>

                        <!-- Quick Stats -->
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 20px; color: white;">
                                <div style="font-size: 13px; opacity: 0.9; margin-bottom: 8px;">Team Members</div>
                                <div style="font-size: 28px; font-weight: bold;">${(project.teamMembers || []).length}</div>
                            </div>
                            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 12px; padding: 20px; color: white;">
                                <div style="font-size: 13px; opacity: 0.9; margin-bottom: 8px;">Total Tasks</div>
                                <div style="font-size: 28px; font-weight: bold;">${(project.tasks || []).length}</div>
                            </div>
                            <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); border-radius: 12px; padding: 20px; color: white;">
                                <div style="font-size: 13px; opacity: 0.9; margin-bottom: 8px;">Documents</div>
                                <div style="font-size: 28px; font-weight: bold;">${(project.documents || []).length}</div>
                            </div>
                            <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); border-radius: 12px; padding: 20px; color: white;">
                                <div style="font-size: 13px; opacity: 0.9; margin-bottom: 8px;">Project Status</div>
                                <div style="font-size: 18px; font-weight: bold;">${project.archived ? 'Archived' : 'Active'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Timeline Tab -->
                <div id="tab-timeline-${project.id}" class="project-tab-content" style="display: none;">
                    <div style="max-width: 1200px; margin: 0 auto;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                            <h3 style="margin: 0; font-size: 20px;">Project Tasks</h3>
                            <button class="btn-primary" onclick="openAddTaskModal('${project.id}')">+ Add Task</button>
                        </div>
                        <div id="project-timeline-${project.id}" style="background: white; border-radius: 8px;">
                            <div class="empty-state" style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                                <p>No tasks yet. Click "+ Add Task" to get started.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Team Members Tab -->
                <div id="tab-team-${project.id}" class="project-tab-content" style="display: none;">
                    <div style="max-width: 800px; margin: 0 auto;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                            <h3 style="margin: 0; font-size: 20px;">Team Members</h3>
                            <button class="btn-primary" onclick="openAddTeamMemberModal('${project.id}')">+ Add Team Member</button>
                        </div>

                        <div id="team-members-list-${project.id}" style="background: white; border-radius: 8px; padding: 24px;">
                            ${project.teamMembers && project.teamMembers.length > 0 ?
                                project.teamMembers.map((member, index) => `
                                    <div style="display: flex; align-items: center; gap: 16px; padding: 16px; border-bottom: 1px solid var(--border-color);">
                                        <div style="width: 50px; height: 50px; background: var(--primary-color); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">${member.firstName.charAt(0)}${member.lastName.charAt(0)}</div>
                                        <div style="flex: 1;">
                                            <div style="font-weight: 600; font-size: 16px;">${member.firstName} ${member.lastName}</div>
                                            <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">${member.title || 'Team Member'}</div>
                                            <div style="font-size: 14px; color: var(--text-secondary); margin-top: 4px;">${member.email}</div>
                                        </div>
                                        <button onclick="removeProjectTeamMember('${project.id}', ${index})" style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px;">Remove</button>
                                    </div>
                                `).join('')
                                :
                                `<p style="color: var(--text-secondary); text-align: center; padding: 40px;">No team members assigned.</p>`
                            }
                        </div>
                    </div>
                </div>

                <!-- Documents Tab -->
                <div id="tab-documents-${project.id}" class="project-tab-content" style="display: none;">
                    <div style="max-width: 1200px; margin: 0 auto;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                            <h3 style="margin: 0; font-size: 20px;">Project Documents</h3>
                            <button class="btn-primary" onclick="uploadProjectDocument('${project.id}')">+ Upload Document</button>
                        </div>
                        <div id="project-documents-${project.id}" style="background: white; border-radius: 8px; padding: 24px;">
                            <p style="color: var(--text-secondary); text-align: center; padding: 40px;">No documents uploaded.</p>
                        </div>
                    </div>
                </div>

                <!-- Chat Tab -->
                <div id="tab-chat-${project.id}" class="project-tab-content" style="display: none;">
                    <div style="max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; height: calc(100vh - 400px);">
                        <h3 style="margin: 0 0 24px 0; font-size: 20px;">Team Chat</h3>
                        <div id="project-chat-${project.id}" style="flex: 1; background: white; border-radius: 8px; padding: 24px; overflow-y: auto; margin-bottom: 16px;">
                            <p style="color: var(--text-secondary); font-style: italic; text-align: center;">No messages yet. Start the conversation!</p>
                        </div>
                        <div style="display: flex; gap: 12px;">
                            <input type="text" id="chat-input-${project.id}" placeholder="Type a message..." style="flex: 1; padding: 14px 16px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 14px;">
                            <button class="btn-primary" onclick="sendChatMessage('${project.id}')">Send</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Load project data if it exists
    loadProjectData(project.id);
}

function closeProjectBoard() {
    const modal = document.getElementById('project-board-modal');
    if (modal) {
        modal.remove();
    }
}

function switchProjectTab(projectId, tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.project-tab-content');
    tabContents.forEach(content => content.style.display = 'none');

    // Remove active class from all tabs
    const tabs = document.querySelectorAll('.project-tab');
    tabs.forEach(tab => {
        tab.style.color = 'var(--text-secondary)';
        tab.style.borderBottomColor = 'transparent';
        tab.classList.remove('active');
    });

    // Show selected tab content
    document.getElementById(`tab-${tabName}-${projectId}`).style.display = 'block';

    // Activate selected tab
    const activeTab = document.querySelector(`.project-tab[data-tab="${tabName}"]`);
    if (activeTab) {
        activeTab.style.color = 'var(--primary-color)';
        activeTab.style.borderBottomColor = 'var(--primary-color)';
        activeTab.classList.add('active');
    }
}

function loadProjectData(projectId) {
    // Load timeline items, chat, and documents from localStorage
    const projectData = JSON.parse(localStorage.getItem(`project_${projectId}`) || '{}');

    if (projectData.timeline && projectData.timeline.length > 0) {
        displayTimelineItems(projectId, projectData.timeline);
    }

    if (projectData.chat && projectData.chat.length > 0) {
        displayChatMessages(projectId, projectData.chat);
    }

    if (projectData.documents && projectData.documents.length > 0) {
        displayProjectDocuments(projectId, projectData.documents);
    }
}

let currentProjectId = null;

function openAddTaskModal(projectId) {
    currentProjectId = projectId;
    const modal = document.getElementById('add-task-modal');
    modal.style.display = 'block';

    // Load team members for assignment dropdown
    const project = projects.find(p => p.id === projectId);
    const assigneeSelect = document.getElementById('task-assignee');
    assigneeSelect.innerHTML = '<option value="">Select team member...</option>';

    if (project && project.teamMembers) {
        project.teamMembers.forEach(member => {
            const option = document.createElement('option');
            option.value = `${member.firstName} ${member.lastName}`;
            option.textContent = `${member.firstName} ${member.lastName}`;
            assigneeSelect.appendChild(option);
        });
    }

    // Clear previous values
    document.getElementById('task-title').value = '';
    document.getElementById('task-description').innerHTML = '';
    document.getElementById('task-assignee').value = '';
    document.getElementById('task-due-date').value = '';
    document.getElementById('task-files').value = '';
}

function closeAddTaskModal() {
    document.getElementById('add-task-modal').style.display = 'none';
    currentProjectId = null;
}

function formatTaskText(command) {
    document.execCommand(command, false, null);
    document.getElementById('task-description').focus();
}

async function createTask() {
    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').innerHTML.trim();
    const assignee = document.getElementById('task-assignee').value;
    const dueDate = document.getElementById('task-due-date').value;
    const filesInput = document.getElementById('task-files');

    if (!title) {
        alert('Please enter a task title');
        return;
    }

    const projectData = JSON.parse(localStorage.getItem(`project_${currentProjectId}`) || '{}');
    if (!projectData.timeline) projectData.timeline = [];

    // Handle file attachments
    const attachments = [];
    if (filesInput.files.length > 0) {
        for (let i = 0; i < filesInput.files.length; i++) {
            const file = filesInput.files[i];
            const fileData = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
            attachments.push({
                name: file.name,
                size: file.size,
                type: file.type,
                data: fileData
            });
        }
    }

    projectData.timeline.push({
        id: Date.now().toString(),
        title: title,
        description: description,
        assignee: assignee || 'Unassigned',
        dueDate: dueDate || null,
        attachments: attachments,
        comments: [],
        completed: false,
        createdAt: new Date().toISOString()
    });

    localStorage.setItem(`project_${currentProjectId}`, JSON.stringify(projectData));
    displayTimelineItems(currentProjectId, projectData.timeline);
    closeAddTaskModal();
}

function displayTimelineItems(projectId, items) {
    const container = document.getElementById(`project-timeline-${projectId}`);
    container.innerHTML = items.map(item => `
        <div style="padding: 20px; background: white; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 16px;">
            <div style="display: flex; align-items: start; gap: 16px;">
                <input type="checkbox" ${item.completed ? 'checked' : ''} onchange="toggleTimelineItem('${projectId}', '${item.id}')" style="width: 20px; height: 20px; cursor: pointer; margin-top: 4px; flex-shrink: 0;">
                <div style="flex: 1; cursor: pointer;" onclick="openTaskDetailsModal('${projectId}', '${item.id}')">
                    <h4 style="margin: 0 0 8px 0; font-size: 16px; ${item.completed ? 'text-decoration: line-through; color: var(--text-secondary);' : 'color: var(--text-color);'}">${item.title || item.name}</h4>
                    ${item.description ? `<div style="margin: 0 0 12px 0; color: var(--text-secondary); font-size: 14px;">${item.description}</div>` : ''}
                    <div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 13px; color: var(--text-secondary);">
                        ${item.assignee ? `<span><strong>Assigned:</strong> ${item.assignee}</span>` : ''}
                        ${item.dueDate ? `<span><strong>Due:</strong> ${new Date(item.dueDate).toLocaleDateString()}</span>` : ''}
                        ${item.attachments && item.attachments.length > 0 ? `<span>📎 ${item.attachments.length} file${item.attachments.length > 1 ? 's' : ''}</span>` : ''}
                        ${item.comments && item.comments.length > 0 ? `<span>💬 ${item.comments.length} comment${item.comments.length > 1 ? 's' : ''}</span>` : ''}
                    </div>
                </div>
                <div style="display: flex; gap: 8px; flex-shrink: 0;">
                    <button onclick="event.stopPropagation(); openTaskDetailsModal('${projectId}', '${item.id}')" style="background: var(--primary-color); color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px;">View Details</button>
                    <button onclick="event.stopPropagation(); deleteTimelineItem('${projectId}', '${item.id}')" style="background: #ef4444; color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px;">Delete</button>
                </div>
            </div>
        </div>
    `).join('');
}

function toggleTimelineItem(projectId, itemId) {
    const projectData = JSON.parse(localStorage.getItem(`project_${projectId}`) || '{}');
    const item = projectData.timeline.find(t => t.id === itemId);
    if (item) {
        item.completed = !item.completed;
        localStorage.setItem(`project_${projectId}`, JSON.stringify(projectData));
        displayTimelineItems(projectId, projectData.timeline);
    }
}

function deleteTimelineItem(projectId, itemId) {
    if (!confirm('Delete this task?')) return;
    const projectData = JSON.parse(localStorage.getItem(`project_${projectId}`) || '{}');
    projectData.timeline = projectData.timeline.filter(t => t.id !== itemId);
    localStorage.setItem(`project_${projectId}`, JSON.stringify(projectData));
    displayTimelineItems(projectId, projectData.timeline);
}

// Task Details Modal
let currentTaskProjectId = null;
let currentTaskId = null;

function openTaskDetailsModal(projectId, taskId) {
    currentTaskProjectId = projectId;
    currentTaskId = taskId;

    const projectData = JSON.parse(localStorage.getItem(`project_${projectId}`) || '{}');
    const task = projectData.timeline.find(t => t.id === taskId);

    if (!task) return;

    // Set the title in the header
    document.getElementById('task-details-title').textContent = task.title || task.name;

    const content = document.getElementById('task-details-content');

    content.innerHTML = `
        <div style="margin-bottom: 30px;">
            <h3 style="margin: 0 0 12px 0; font-size: 18px;">Description</h3>
            <div style="padding: 20px; background: var(--background-alt); border-radius: 8px; color: var(--text-color); min-height: 60px;">
                ${task.description || '<p style="color: var(--text-secondary); font-style: italic;">No description</p>'}
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-bottom: 40px;">
            <div style="padding: 20px; background: var(--background-alt); border-radius: 8px;">
                <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 6px;">Assigned to</div>
                <div style="font-weight: 600; font-size: 16px;">${task.assignee || 'Unassigned'}</div>
            </div>
            <div style="padding: 20px; background: var(--background-alt); border-radius: 8px;">
                <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 6px;">Due date</div>
                <div style="font-weight: 600; font-size: 16px;">${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}</div>
            </div>
            <div style="padding: 20px; background: var(--background-alt); border-radius: 8px;">
                <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 6px;">Status</div>
                <div style="font-weight: 600; font-size: 16px;">${task.completed ? '✅ Completed' : '⏳ In Progress'}</div>
            </div>
        </div>

        <!-- Attachments Section -->
        <div style="margin-bottom: 40px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="margin: 0; font-size: 18px;">Attachments (${task.attachments ? task.attachments.length : 0})</h3>
                <button class="btn-primary" onclick="uploadTaskFile('${projectId}', '${taskId}')">+ Upload File</button>
            </div>
            <div id="task-attachments-${taskId}" style="background: var(--background-alt); border-radius: 8px; padding: 20px; min-height: 100px;">
                ${displayTaskAttachments(task.attachments || [])}
            </div>
        </div>

        <!-- Comments Section -->
        <div>
            <h3 style="margin: 0 0 16px 0; font-size: 18px;">Comments (${task.comments ? task.comments.length : 0})</h3>
            <div id="task-comments-${taskId}" style="margin-bottom: 20px; max-height: 400px; overflow-y: auto; background: var(--background-alt); border-radius: 8px; padding: 20px; min-height: 150px;">
                ${displayTaskComments(task.comments || [])}
            </div>
            <div style="display: flex; gap: 12px;">
                <input type="text" id="task-comment-input-${taskId}" placeholder="Add a comment..." style="flex: 1; padding: 14px 16px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 15px;">
                <button class="btn-primary" onclick="addTaskComment('${projectId}', '${taskId}')" style="padding: 14px 24px;">Post Comment</button>
            </div>
        </div>
    `;

    document.getElementById('task-details-modal').style.display = 'block';
}

function closeTaskDetailsModal() {
    document.getElementById('task-details-modal').style.display = 'none';
    currentTaskProjectId = null;
    currentTaskId = null;
}

function displayTaskAttachments(attachments) {
    if (!attachments || attachments.length === 0) {
        return '<p style="color: var(--text-secondary); font-style: italic; padding: 20px; text-align: center;">No files attached</p>';
    }

    return attachments.map((file, index) => `
        <div style="padding: 16px; background: white; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">📎 ${file.name}</div>
                <div style="font-size: 13px; color: var(--text-secondary);">${(file.size / 1024).toFixed(2)} KB</div>
            </div>
            <button onclick="deleteTaskFile('${currentTaskProjectId}', '${currentTaskId}', ${index})" style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px;">Delete</button>
        </div>
    `).join('');
}

function displayTaskComments(comments) {
    if (!comments || comments.length === 0) {
        return '<p style="color: var(--text-secondary); font-style: italic; padding: 20px; text-align: center;">No comments yet. Be the first to comment!</p>';
    }

    return comments.map(comment => `
        <div style="padding: 20px; background: white; border-radius: 8px; margin-bottom: 12px; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 12px; align-items: center;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 40px; height: 40px; background: var(--primary-color); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;">${comment.author.charAt(0)}</div>
                    <strong style="color: var(--text-color); font-size: 15px;">${comment.author}</strong>
                </div>
                <span style="font-size: 12px; color: var(--text-secondary);">${new Date(comment.createdAt).toLocaleString()}</span>
            </div>
            <p style="margin: 0; color: var(--text-color); font-size: 14px; line-height: 1.6;">${comment.text}</p>
        </div>
    `).join('');
}

async function uploadTaskFile(projectId, taskId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;

    input.onchange = async (e) => {
        const files = e.target.files;
        if (files.length === 0) return;

        const projectData = JSON.parse(localStorage.getItem(`project_${projectId}`) || '{}');
        const task = projectData.timeline.find(t => t.id === taskId);

        if (!task) return;
        if (!task.attachments) task.attachments = [];

        for (let file of files) {
            const fileData = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });

            task.attachments.push({
                name: file.name,
                size: file.size,
                type: file.type,
                data: fileData
            });
        }

        localStorage.setItem(`project_${projectId}`, JSON.stringify(projectData));

        // Refresh the modal
        openTaskDetailsModal(projectId, taskId);
        alert(`${files.length} file(s) uploaded successfully!`);
    };

    input.click();
}

function deleteTaskFile(projectId, taskId, fileIndex) {
    if (!confirm('Delete this file?')) return;

    const projectData = JSON.parse(localStorage.getItem(`project_${projectId}`) || '{}');
    const task = projectData.timeline.find(t => t.id === taskId);

    if (!task) return;

    task.attachments.splice(fileIndex, 1);
    localStorage.setItem(`project_${projectId}`, JSON.stringify(projectData));

    // Refresh the modal and task list
    openTaskDetailsModal(projectId, taskId);
    displayTimelineItems(projectId, projectData.timeline);
}

function addTaskComment(projectId, taskId) {
    const input = document.getElementById(`task-comment-input-${taskId}`);
    const commentText = input.value.trim();

    if (!commentText) return;

    const projectData = JSON.parse(localStorage.getItem(`project_${projectId}`) || '{}');
    const task = projectData.timeline.find(t => t.id === taskId);

    if (!task) return;
    if (!task.comments) task.comments = [];

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    task.comments.push({
        id: Date.now().toString(),
        text: commentText,
        author: user.name || 'User',
        createdAt: new Date().toISOString()
    });

    localStorage.setItem(`project_${projectId}`, JSON.stringify(projectData));

    // Refresh comments display
    const commentsContainer = document.getElementById(`task-comments-${taskId}`);
    commentsContainer.innerHTML = displayTaskComments(task.comments);

    // Update comment count in header
    const modal = document.getElementById('task-details-modal');
    const h3 = modal.querySelector('h3:last-of-type');
    if (h3) h3.textContent = `Comments (${task.comments.length})`;

    // Clear input and update task list
    input.value = '';
    displayTimelineItems(projectId, projectData.timeline);
}

function sendChatMessage(projectId) {
    const input = document.getElementById(`chat-input-${projectId}`);
    const messageText = input.value.trim();
    if (!messageText) return;

    const projectData = JSON.parse(localStorage.getItem(`project_${projectId}`) || '{}');
    if (!projectData.chat) projectData.chat = [];

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    projectData.chat.push({
        id: Date.now().toString(),
        text: messageText,
        author: user.name || 'User',
        createdAt: new Date().toISOString()
    });

    localStorage.setItem(`project_${projectId}`, JSON.stringify(projectData));
    input.value = '';
    displayChatMessages(projectId, projectData.chat);
}

function displayChatMessages(projectId, messages) {
    const container = document.getElementById(`project-chat-${projectId}`);
    container.innerHTML = messages.map(message => `
        <div style="padding: 16px; background: var(--background-alt); border-radius: 8px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <strong style="color: var(--primary-color); font-size: 14px;">${message.author}</strong>
                <span style="font-size: 12px; color: var(--text-secondary);">${new Date(message.createdAt).toLocaleString()}</span>
            </div>
            <p style="margin: 0; color: var(--text-color); font-size: 14px;">${message.text}</p>
        </div>
    `).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

// Archive project function
function archiveProject(projectId) {
    if (!confirm('Archive this project?')) return;

    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) return;

    projects[projectIndex].archived = true;
    localStorage.setItem('projects', JSON.stringify(projects));

    alert('Project archived successfully!');
    loadProjects();
}

// Team Member Management in Project Board
let currentTeamProjectId = null;

function openAddTeamMemberModal(projectId) {
    currentTeamProjectId = projectId;
    document.getElementById('add-team-member-modal').style.display = 'block';

    // Clear form
    document.getElementById('new-member-firstname').value = '';
    document.getElementById('new-member-lastname').value = '';
    document.getElementById('new-member-title').value = '';
    document.getElementById('new-member-email').value = '';
}

function closeAddTeamMemberModal() {
    document.getElementById('add-team-member-modal').style.display = 'none';
    currentTeamProjectId = null;
}

function addProjectTeamMember() {
    const firstName = document.getElementById('new-member-firstname').value.trim();
    const lastName = document.getElementById('new-member-lastname').value.trim();
    const title = document.getElementById('new-member-title').value.trim();
    const email = document.getElementById('new-member-email').value.trim();

    if (!firstName || !lastName || !email) {
        alert('Please fill in all required fields (First Name, Last Name, Email)');
        return;
    }

    if (!email.includes('@')) {
        alert('Please enter a valid email address');
        return;
    }

    // Find the project
    const projectIndex = projects.findIndex(p => p.id === currentTeamProjectId);
    if (projectIndex === -1) return;

    // Add team member to project
    if (!projects[projectIndex].teamMembers) {
        projects[projectIndex].teamMembers = [];
    }

    projects[projectIndex].teamMembers.push({
        firstName,
        lastName,
        title: title || 'Team Member',
        email
    });

    // Save to localStorage
    localStorage.setItem('projects', JSON.stringify(projects));

    // Send email invite (simulated)
    alert(`Invitation email sent to ${email}!\n\n${firstName} ${lastName} has been added to the project.`);

    // Refresh the team members list in the modal
    refreshProjectTeamMembersList(currentTeamProjectId);

    closeAddTeamMemberModal();
}

function removeProjectTeamMember(projectId, memberIndex) {
    if (!confirm('Remove this team member from the project?')) return;

    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) return;

    const removedMember = projects[projectIndex].teamMembers[memberIndex];
    projects[projectIndex].teamMembers.splice(memberIndex, 1);

    localStorage.setItem('projects', JSON.stringify(projects));

    alert(`${removedMember.firstName} ${removedMember.lastName} has been removed from the project.`);

    // Refresh the team members list
    refreshProjectTeamMembersList(projectId);
}

function refreshProjectTeamMembersList(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const container = document.getElementById(`team-members-list-${projectId}`);
    if (!container) return;

    if (!project.teamMembers || project.teamMembers.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">No team members assigned.</p>';
    } else {
        container.innerHTML = project.teamMembers.map((member, index) => `
            <div style="display: flex; align-items: center; gap: 16px; padding: 16px; border-bottom: 1px solid var(--border-color);">
                <div style="width: 50px; height: 50px; background: var(--primary-color); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">${member.firstName.charAt(0)}${member.lastName.charAt(0)}</div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 16px;">${member.firstName} ${member.lastName}</div>
                    <div style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">${member.title || 'Team Member'}</div>
                    <div style="font-size: 14px; color: var(--text-secondary); margin-top: 4px;">${member.email}</div>
                </div>
                <button onclick="removeProjectTeamMember('${projectId}', ${index})" style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px;">Remove</button>
            </div>
        `).join('');
    }
}

function uploadProjectDocument(projectId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.docx,.doc,.txt,.xlsx,.xls';

    input.onchange = async (e) => {
        const files = e.target.files;
        if (files.length === 0) return;

        const projectData = JSON.parse(localStorage.getItem(`project_${projectId}`) || '{}');
        if (!projectData.documents) projectData.documents = [];

        for (let file of files) {
            projectData.documents.push({
                id: Date.now().toString(),
                name: file.name,
                size: file.size,
                uploadedAt: new Date().toISOString()
            });
        }

        localStorage.setItem(`project_${projectId}`, JSON.stringify(projectData));
        displayProjectDocuments(projectId, projectData.documents);
        alert(`${files.length} document(s) uploaded successfully!`);
    };

    input.click();
}

function displayProjectDocuments(projectId, documents) {
    const container = document.getElementById(`project-documents-${projectId}`);

    if (documents.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">No documents uploaded.</p>';
        return;
    }

    container.innerHTML = documents.map(doc => `
        <div style="padding: 16px; background: var(--background-alt); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div style="flex: 1;">
                <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">📄 ${doc.name}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">
                    ${(doc.size / 1024).toFixed(2)} KB • Uploaded ${new Date(doc.uploadedAt).toLocaleDateString()}
                </div>
            </div>
            <div style="display: flex; gap: 8px;">
                <button onclick="renameDocument('${projectId}', '${doc.id}')" style="background: var(--primary-color); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px;">Rename</button>
                <button onclick="deleteDocument('${projectId}', '${doc.id}')" style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px;">Delete</button>
            </div>
        </div>
    `).join('');
}

function renameDocument(projectId, docId) {
    const projectData = JSON.parse(localStorage.getItem(`project_${projectId}`) || '{}');
    const doc = projectData.documents.find(d => d.id === docId);

    if (!doc) return;

    const newName = prompt('Enter new document name:', doc.name);
    if (!newName || newName.trim() === '') return;

    doc.name = newName.trim();
    localStorage.setItem(`project_${projectId}`, JSON.stringify(projectData));
    displayProjectDocuments(projectId, projectData.documents);
}

function deleteDocument(projectId, docId) {
    if (!confirm('Are you sure you want to delete this document?')) return;

    const projectData = JSON.parse(localStorage.getItem(`project_${projectId}`) || '{}');
    projectData.documents = projectData.documents.filter(d => d.id !== docId);

    localStorage.setItem(`project_${projectId}`, JSON.stringify(projectData));
    displayProjectDocuments(projectId, projectData.documents);

    alert('Document deleted successfully!');
}

let meetingDocuments = [];

function openMeetingDocUploadModal() {
    document.getElementById('meeting-doc-upload-modal').style.display = 'block';
}

function closeMeetingDocUploadModal() {
    document.getElementById('meeting-doc-upload-modal').style.display = 'none';
    document.getElementById('meeting-doc-files').value = '';
    document.getElementById('meeting-doc-files-list').innerHTML = '';
}

async function uploadMeetingDocuments() {
    const filesInput = document.getElementById('meeting-doc-files');
    const files = filesInput.files;

    if (files.length === 0) {
        alert('Please select at least one document to upload');
        return;
    }

    // Convert files to base64 for local storage
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileData = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
        });

        meetingDocuments.push({
            id: Date.now().toString() + i,
            name: file.name,
            size: file.size,
            type: file.type,
            data: fileData,
            uploadedAt: new Date().toISOString()
        });
    }

    // Save to localStorage
    localStorage.setItem('meetingDocuments', JSON.stringify(meetingDocuments));

    alert(`${files.length} document(s) uploaded successfully!`);
    closeMeetingDocUploadModal();
    loadMeetingDocuments();
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

            return `
            <div style="background: white; border: 2px solid var(--border-color); border-radius: 12px; padding: 20px; transition: all 0.3s ease; cursor: pointer;" onmouseover="this.style.borderColor='var(--primary-color)'; this.style.transform='translateY(-2px)';" onmouseout="this.style.borderColor='var(--border-color)'; this.style.transform='translateY(0)';">
                <div style="display: flex; align-items: start; gap: 16px; margin-bottom: 16px;">
                    <div style="font-size: 40px;">${fileIcon}</div>
                    <div style="flex: 1; min-width: 0;">
                        <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${doc.name}</h4>
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

function deleteMeetingDocument(docId) {
    if (!confirm('Are you sure you want to remove this document?')) {
        return;
    }

    meetingDocuments = meetingDocuments.filter(doc => doc.id !== docId);
    localStorage.setItem('meetingDocuments', JSON.stringify(meetingDocuments));
    loadMeetingDocuments();
}

// Answerly Popup Functions
function showAnswerlyModal() {
    // Show the popup in bottom right corner
    const popup = document.getElementById('answerly-listening-popup');
    popup.style.display = 'block';

    // Start the timer
    answerlyStartTime = Date.now();
    answerlyTimerInterval = setInterval(updateAnswerlyTimer, 1000);

    // Start listening (if speech recognition is available)
    startAnswerlyListening();
}

function closeAnswerlyPopup() {
    const popup = document.getElementById('answerly-listening-popup');
    popup.style.display = 'none';

    // Stop the timer
    if (answerlyTimerInterval) {
        clearInterval(answerlyTimerInterval);
        answerlyTimerInterval = null;
    }

    // Reset timer display
    document.getElementById('answerly-timer').textContent = '00:00';

    // Stop listening
    stopAnswerlyListening();
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
    // Initialize speech recognition if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }

            // Update conversation display
            const conversationDiv = document.getElementById('answerly-popup-conversation');
            conversationDiv.innerHTML = `<p>${transcript}</p>`;

            // Detect questions and search for answers
            if (transcript.includes('?') || /\b(how|what|when|where|why|who)\b/i.test(transcript)) {
                searchAnswerlyDocuments(transcript);
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
        };

        recognition.start();
        window.answerlyRecognition = recognition;
    } else {
        console.warn('Speech recognition not supported in this browser');
        const conversationDiv = document.getElementById('answerly-popup-conversation');
        conversationDiv.innerHTML = `<p style="color: #ef4444;">Speech recognition is not supported in your browser. Please use Chrome or Edge.</p>`;
    }
}

function stopAnswerlyListening() {
    if (window.answerlyRecognition) {
        window.answerlyRecognition.stop();
        window.answerlyRecognition = null;
    }
}

function searchAnswerlyDocuments(question) {
    // Load meeting documents and search for relevant content
    const storedDocs = localStorage.getItem('meetingDocuments');
    if (!storedDocs) {
        displayAnswerlyResponse(question, 'No documents available to search.');
        return;
    }

    const docs = JSON.parse(storedDocs);
    // Simulate document search (in real implementation, this would search document content)
    const answer = `Searching ${docs.length} document(s) for: "${question}"`;
    displayAnswerlyResponse(question, answer);
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