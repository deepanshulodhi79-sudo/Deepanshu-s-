// Login functionality
if (document.getElementById('loginBtn')) {
    document.addEventListener('DOMContentLoaded', function() {
        const loginBtn = document.getElementById('loginBtn');
        const loginStatus = document.getElementById('loginStatus');
        
        loginBtn.addEventListener('click', async function() {
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();
            
            if (!username || !password) {
                showStatus(loginStatus, 'Please enter username and password', 'error');
                return;
            }
            
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
                    sessionStorage.setItem('sessionToken', result.sessionToken);
                    sessionStorage.setItem('username', result.username);
                    window.location.href = '/launcher';
                } else {
                    showStatus(loginStatus, result.message, 'error');
                }
            } catch (error) {
                showStatus(loginStatus, 'Login failed', 'error');
            }
        });
        
        document.getElementById('password').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') loginBtn.click();
        });
    });
}

// Launcher functionality
if (document.getElementById('sendAllBtn')) {
    document.addEventListener('DOMContentLoaded', function() {
        const sessionToken = sessionStorage.getItem('sessionToken');
        if (!sessionToken) {
            window.location.href = '/';
            return;
        }
        
        // Elements
        const recipientsTextarea = document.getElementById('recipients');
        const recipientCount = document.getElementById('recipientCount');
        const sendAllBtn = document.getElementById('sendAllBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const statusMessage = document.getElementById('statusMessage');
        
        // Popup Elements
        const successPopup = document.getElementById('successPopup');
        const popupMessage = document.getElementById('popupMessage');
        const closePopup = document.getElementById('closePopup');
        
        // Update recipient count
        recipientsTextarea.addEventListener('input', function() {
            const emails = this.value.split(/[\n,]/).filter(email => email.trim() !== '');
            const count = emails.length;
            recipientCount.textContent = count;
            sendAllBtn.disabled = count > 30 || count === 0;
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
            
            const recipients = recipientsText.split(/[\n,]/)
                .map(email => email.trim())
                .filter(email => email !== '');
            
            if (recipients.length > 30) {
                showStatus(statusMessage, 'Maximum 30 recipients allowed', 'error');
                return;
            }
            
            sendAllBtn.disabled = true;
            sendAllBtn.textContent = 'Sending...';
            
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
                    showStatus(statusMessage, result.message, 'success');
                    popupMessage.textContent = result.message;
                    showPopup(successPopup);
                    
                    // ❌ REMOVED AUTO-CLEAR CODE - Form ab clear nahi hoga
                    
                } else {
                    showStatus(statusMessage, result.message, 'error');
                }
            } catch (error) {
                showStatus(statusMessage, 'Failed to send emails', 'error');
            } finally {
                sendAllBtn.disabled = false;
                sendAllBtn.textContent = 'Send All';
            }
        });
        
        // Logout
        logoutBtn.addEventListener('click', function() {
            sessionStorage.clear();
            window.location.href = '/';
        });
        
        // Close popup
        closePopup.addEventListener('click', function() {
            hidePopup(successPopup);
        });
        
        // Close popup when clicking outside
        successPopup.addEventListener('click', function(e) {
            if (e.target === successPopup) hidePopup(successPopup);
        });
    });
}

// Utility functions
function showStatus(element, message, type) {
    element.textContent = message;
    element.className = 'status ' + type;
    element.style.display = 'block';
    setTimeout(() => element.style.display = 'none', 5000);
}

function showPopup(popup) {
    popup.style.display = 'flex';
}

function hidePopup(popup) {
    popup.style.display = 'none';
}
