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

        document.getElementById('current-plan').textContent = planNames[user.subscription] || 'Free';
        document.getElementById('meeting-limit').textContent = planLimits[user.subscription] || '15 minutes';

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

// Connection functions
async function connectDocumentation() {
    alert('Documentation upload coming soon! This will allow you to upload PDFs, markdown files, or link to your documentation.');
    // TODO: Implement file upload modal
}

async function connectSlack() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/datasources/slack/auth-url', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (data.authUrl) {
            window.location.href = data.authUrl;
        }
    } catch (error) {
        console.error('Slack connection error:', error);
        alert('Failed to connect to Slack');
    }
}

async function connectGoogleSheets() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/datasources/google-sheets/auth-url', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (data.authUrl) {
            window.location.href = data.authUrl;
        }
    } catch (error) {
        console.error('Google Sheets connection error:', error);
        alert('Failed to connect to Google Sheets');
    }
}

async function connectCRM() {
    const crmType = prompt('Which CRM? (salesforce/hubspot/pipedrive)');
    if (!crmType) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/datasources/crm/${crmType}/auth-url`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (data.authUrl) {
            window.location.href = data.authUrl;
        }
    } catch (error) {
        console.error('CRM connection error:', error);
        alert('Failed to connect to CRM');
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