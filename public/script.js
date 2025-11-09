// Login functionality
if (document.getElementById('loginBtn')) {
    document.addEventListener('DOMContentLoaded', function() {
        const loginBtn = document.getElementById('loginBtn');
        const loginStatus = document.getElementById('loginStatus');
        
        loginBtn.addEventListener('click', async function() {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            if (!username || !password) {
                showStatus(loginStatus, 'Please enter username and password', 'error');
                return;
            }
            
            loginBtn.disabled = true;
            loginBtn.textContent = 'Logging in...';
            
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // Redirect to launcher with token
                    window.location.href = `/launcher?token=${result.token}`;
                } else {
                    showStatus(loginStatus, result.message, 'error');
                }
            } catch (error) {
                showStatus(loginStatus, 'Login failed: ' + error.message, 'error');
            } finally {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Login';
            }
        });
        
        // Enter key support
        document.getElementById('password').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') loginBtn.click();
        });
    });
}

// Launcher functionality
if (document.getElementById('sendAllBtn')) {
    document.addEventListener('DOMContentLoaded', function() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (!token) {
            window.location.href = '/';
            return;
        }
        
        // Elements
        const recipientsTextarea = document.getElementById('recipients');
        const recipientCount = document.getElementById('recipientCount');
        const sendAllBtn = document.getElementById('sendAllBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const statusMessage = document.getElementById('statusMessage');
        
        // Update recipient count
        recipientsTextarea.addEventListener('input', function() {
            const emails = this.value.split(/[\n,]/).filter(email => email.trim() !== '');
            const count = emails.length;
            recipientCount.textContent = count;
            sendAllBtn.disabled = count === 0;
        });
        
        // Send emails
        sendAllBtn.addEventListener('click', async function() {
            const senderName = document.getElementById('senderName').value.trim();
            const gmailAccount = document.getElementById('gmailAccount').value.trim();
            const appPassword = document.getElementById('appPassword').value.trim();
            const subject = document.getElementById('subject').value.trim();
            const messageBody = document.getElementById('messageBody').value.trim();
            const recipientsText = recipientsTextarea.value;
            
            // Validation
            if (!senderName || !gmailAccount || !appPassword || !subject || !messageBody || !recipientsText) {
                showStatus(statusMessage, 'Please fill all fields', 'error');
                return;
            }
            
            sendAllBtn.disabled = true;
            sendAllBtn.textContent = 'Sending...';
            
            try {
                const response = await fetch('/send-emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        senderName,
                        gmailAccount,
                        appPassword,
                        subject,
                        messageBody,
                        recipients: recipientsText
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showStatus(statusMessage, result.message, 'success');
                } else {
                    showStatus(statusMessage, result.message, 'error');
                }
            } catch (error) {
                showStatus(statusMessage, 'Failed to send emails: ' + error.message, 'error');
            } finally {
                sendAllBtn.disabled = false;
                sendAllBtn.textContent = 'Send All';
            }
        });
        
        // Logout
        logoutBtn.addEventListener('click', async function() {
            try {
                await fetch('/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token })
                });
            } catch (error) {
                console.error('Logout error:', error);
            } finally {
                window.location.href = '/';
            }
        });
    });
}

// Utility function
function showStatus(element, message, type) {
    element.textContent = message;
    element.className = 'status ' + type;
    element.style.display = 'block';
    setTimeout(() => element.style.display = 'none', 5000);
}
