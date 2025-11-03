// Common utility functions
function showStatus(element, message, type) {
    element.textContent = message;
    element.className = 'status-message ' + type;
    element.style.display = 'block';
    
    if (type === 'success') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

function updateRecipientCount() {
    const recipientsTextarea = document.getElementById('recipients');
    const recipientCount = document.getElementById('recipientCount');
    const recipientWarning = document.getElementById('recipientWarning');
    const sendAllBtn = document.getElementById('sendAllBtn');
    
    if (!recipientsTextarea || !recipientCount) return;
    
    const text = recipientsTextarea.value;
    const emails = text.split(/[\n,]/).filter(email => email.trim() !== '');
    const count = emails.length;
    
    recipientCount.textContent = count;
    
    if (count > 30) {
        if (recipientWarning) recipientWarning.style.display = 'block';
        if (sendAllBtn) {
            sendAllBtn.disabled = true;
        }
    } else {
        if (recipientWarning) recipientWarning.style.display = 'none';
        if (sendAllBtn) {
            sendAllBtn.disabled = false;
        }
    }
}

// Login page functionality
if (document.getElementById('loginBtn')) {
    document.addEventListener('DOMContentLoaded', function() {
        const loginBtn = document.getElementById('loginBtn');
        const loginStatus = document.getElementById('loginStatus');
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        
        loginBtn.addEventListener('click', async function() {
            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();
            
            if (!username || !password) {
                showStatus(loginStatus, 'Please enter both username and password', 'error');
                return;
            }
            
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
            
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    sessionStorage.setItem('sessionToken', result.sessionToken);
                    sessionStorage.setItem('username', result.username);
                    
                    showStatus(loginStatus, '✓ Authentication successful', 'success');
                    
                    setTimeout(() => {
                        window.location.href = '/launcher';
                    }, 1000);
                } else {
                    showStatus(loginStatus, '✗ ' + result.message, 'error');
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = '<span class="btn-text">Access Dashboard</span><i class="fas fa-arrow-right"></i>';
                }
            } catch (error) {
                console.error('Login error:', error);
                showStatus(loginStatus, '✗ Connection failed', 'error');
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<span class="btn-text">Access Dashboard</span><i class="fas fa-arrow-right"></i>';
            }
        });
        
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                loginBtn.click();
            }
        });
    });
}

// Launcher page functionality
if (document.getElementById('sendAllBtn')) {
    document.addEventListener('DOMContentLoaded', function() {
        const sessionToken = sessionStorage.getItem('sessionToken');
        const username = sessionStorage.getItem('username');
        
        if (!sessionToken || !username) {
            window.location.href = '/';
            return;
        }
        
        document.getElementById('userEmail').textContent = username;
        document.getElementById('displayUsername').textContent = username;
        
        // Elements
        const recipientsTextarea = document.getElementById('recipients');
        const sendAllBtn = document.getElementById('sendAllBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const clearBtn = document.getElementById('clearBtn');
        const statusMessage = document.getElementById('statusMessage');
        const progressContainer = document.getElementById('progressContainer');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const resultsContainer = document.getElementById('resultsContainer');
        const resultsList = document.getElementById('resultsList');
        
        // Update recipient count
        recipientsTextarea.addEventListener('input', updateRecipientCount);
        updateRecipientCount();
        
        // Send All Emails
        sendAllBtn.addEventListener('click', async function() {
            const senderName = document.getElementById('senderName').value.trim();
            const gmailAccount = document.getElementById('gmailAccount').value.trim();
            const appPassword = document.getElementById('appPassword').value.trim();
            const subject = document.getElementById('subject').value.trim();
            const messageBody = document.getElementById('messageBody').value.trim();
            const recipientsText = recipientsTextarea.value;
            
            // Validation
            if (!senderName || !gmailAccount || !appPassword || !subject || !messageBody || !recipientsText) {
                showStatus(statusMessage, 'Please fill in all required fields', 'error');
                return;
            }
            
            const recipients = recipientsText.split(/[\n,]/)
                .map(email => email.trim())
                .filter(email => email !== '');
            
            if (recipients.length === 0) {
                showStatus(statusMessage, 'Please enter at least one recipient email', 'error');
                return;
            }
            
            if (recipients.length > 30) {
                showStatus(statusMessage, 'Maximum 30 recipients allowed', 'error');
                return;
            }
            
            // Show progress
            progressContainer.style.display = 'block';
            progressBar.style.width = '0%';
            progressText.textContent = '0%';
            sendAllBtn.disabled = true;
            clearBtn.disabled = true;
            resultsContainer.style.display = 'none';
            
            try {
                const response = await fetch('/send-emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': sessionToken
                    },
                    body: JSON.stringify({
                        senderName,
                        gmailAccount,
                        appPassword,
                        subject,
                        messageBody,
                        recipients
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showStatus(statusMessage, '✓ ' + result.message, 'success');
                    
                    // Show detailed results
                    if (result.results) {
                        resultsList.innerHTML = '';
                        result.results.forEach(item => {
                            const div = document.createElement('div');
                            div.className = `result-item ${item.status === 'success' ? 'result-success' : 'result-error'}`;
                            div.innerHTML = `
                                <span>${item.recipient}</span>
                                <span>${item.message}</span>
                            `;
                            resultsList.appendChild(div);
                        });
                        resultsContainer.style.display = 'block';
                    }
                } else {
                    showStatus(statusMessage, '✗ ' + result.message, 'error');
                }
                
            } catch (error) {
                console.error('Error sending emails:', error);
                showStatus(statusMessage, '✗ Failed to send emails: ' + error.message, 'error');
            } finally {
                sendAllBtn.disabled = false;
                clearBtn.disabled = false;
                progressContainer.style.display = 'none';
                progressBar.style.width = '0%';
                progressText.textContent = '0%';
            }
        });
        
        // Logout
        logoutBtn.addEventListener('click', async function() {
            try {
                await fetch('/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': sessionToken
                    }
                });
            } catch (error) {
                console.error('Logout error:', error);
            } finally {
                sessionStorage.clear();
                window.location.href = '/';
            }
        });
        
        // Clear All
        clearBtn.addEventListener('click', function() {
            document.getElementById('senderName').value = '';
            document.getElementById('gmailAccount').value = '';
            document.getElementById('appPassword').value = '';
            document.getElementById('subject').value = '';
            document.getElementById('messageBody').value = '';
            recipientsTextarea.value = '';
            updateRecipientCount();
            resultsContainer.style.display = 'none';
            showStatus(statusMessage, 'Form cleared successfully', 'success');
        });
        
        // Initialize
        updateRecipientCount();
    });
}
