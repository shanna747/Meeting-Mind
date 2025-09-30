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
    loadDashboardData();
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

function connectSlack() {
    openConnectionModal('slack-form');
}

function connectGoogleSheets() {
    openConnectionModal('sheets-form');
}

function connectNotion() {
    openConnectionModal('notion-form');
}

function connectConfluence() {
    openConnectionModal('confluence-form');
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

async function submitSlackConfig() {
    const workspace = document.getElementById('slack-workspace').value;
    const channels = document.getElementById('slack-channels').value;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/datasources/slack/configure', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ workspace, channels })
        });

        const data = await response.json();
        if (response.ok && data.authUrl) {
            window.location.href = data.authUrl;
        } else {
            alert(data.error || 'Failed to configure Slack');
        }
    } catch (error) {
        console.error('Slack configuration error:', error);
        alert('Failed to configure Slack');
    }
}

async function submitSheetsConfig() {
    const sheetUrl = document.getElementById('sheets-url').value;
    const refreshFrequency = document.getElementById('sheets-refresh').value;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/datasources/google-sheets/configure', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sheetUrl, refreshFrequency })
        });

        const data = await response.json();
        if (response.ok && data.authUrl) {
            window.location.href = data.authUrl;
        } else {
            alert(data.error || 'Failed to configure Google Sheets');
        }
    } catch (error) {
        console.error('Google Sheets configuration error:', error);
        alert('Failed to configure Google Sheets');
    }
}

async function submitNotionConfig() {
    const workspace = document.getElementById('notion-workspace').value;
    const syncFrequency = document.getElementById('notion-sync').value;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/datasources/notion/configure', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ workspace, syncFrequency })
        });

        const data = await response.json();
        if (response.ok && data.authUrl) {
            window.location.href = data.authUrl;
        } else {
            alert(data.error || 'Failed to configure Notion');
        }
    } catch (error) {
        console.error('Notion configuration error:', error);
        alert('Failed to configure Notion');
    }
}

async function submitConfluenceConfig() {
    const siteUrl = document.getElementById('confluence-url').value;
    const email = document.getElementById('confluence-email').value;
    const spaces = document.getElementById('confluence-spaces').value;

    if (!siteUrl) {
        alert('Please provide your Confluence site URL');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/datasources/confluence/configure', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ siteUrl, email, spaces })
        });

        const data = await response.json();
        if (response.ok && data.authUrl) {
            window.location.href = data.authUrl;
        } else {
            alert(data.error || 'Failed to configure Confluence');
        }
    } catch (error) {
        console.error('Confluence configuration error:', error);
        alert('Failed to configure Confluence');
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