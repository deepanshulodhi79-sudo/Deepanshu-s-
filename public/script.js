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
                    sessionStorage.setItem('sessionToken', result.sessionToken);
                    sessionStorage.setItem('username', result.username);
                    window.location.href = '/launcher';
                } else {
                    showStatus(loginStatus, result.message, 'error');
                }
            } catch (error) {
                showStatus(loginStatus, 'Login failed', 'error');
            } finally {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Login';
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
        const errorPopup = document.getElementById('errorPopup');
        const loadingPopup = document.getElementById('loadingPopup');
        const popupMessage = document.getElementById('popupMessage');
        const errorPopupMessage = document.getElementById('errorPopupMessage');
        const sentCount = document.getElementById('sentCount');
        const failedCount = document.getElementById('failedCount');
        const timeTaken = document.getElementById('timeTaken');
        const sendingProgress = document.getElementById('sendingProgress');
        const progressText = document.getElementById('progressText');
        const currentEmail = document.getElementById('currentEmail');
        
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
            
            // Show loading popup
            showPopup(loadingPopup);
            sendAllBtn.disabled = true;
            const startTime = Date.now();
            
            // Update progress
            updateProgress(0, recipients.length, 'Starting...');
            
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
                const endTime = Date.now();
                const totalTime = ((endTime - startTime) / 1000).toFixed(1);
                
                // Hide loading popup
                hidePopup(loadingPopup);
                
                if (result.success) {
                    showStatus(statusMessage, result.message, 'success');
                    
                    // Show success popup with stats
                    const successful = result.results.filter(r => r.status === 'success').length;
                    const failed = result.results.filter(r => r.status === 'error').length;
                    
                    sentCount.textContent = successful;
                    failedCount.textContent = failed;
                    timeTaken.textContent = `${totalTime}s`;
                    
                    popupMessage.textContent = result.message;
                    showPopup(successPopup);
                    
                    // Clear form after successful send
                    setTimeout(() => {
                        document.getElementById('subject').value = '';
                        document.getElementById('messageBody').value = '';
                        document.getElementById('recipients').value = '';
                        updateRecipientCount();
                    }, 2000);
                    
                } else {
                    showStatus(statusMessage, result.message, 'error');
                    errorPopupMessage.textContent = result.message;
                    showPopup(errorPopup);
                }
            } catch (error) {
                hidePopup(loadingPopup);
                showStatus(statusMessage, 'Failed to send emails', 'error');
                errorPopupMessage.textContent = 'Failed to send emails. Please check your connection.';
                showPopup(errorPopup);
            } finally {
                sendAllBtn.disabled = false;
            }
        });
        
        // Update progress function
        function updateProgress(current, total, email) {
            const progress = Math.round((current / total) * 100);
            sendingProgress.style.width = `${progress}%`;
            progressText.textContent = `${progress}%`;
            currentEmail.textContent = email || `Sending ${current} of ${total}`;
        }
        
        // Logout
        logoutBtn.addEventListener('click', function() {
            sessionStorage.clear();
            window.location.href = '/';
        });
        
        // Close popups
        document.getElementById('closePopup').addEventListener('click', function() {
            hidePopup(successPopup);
        });
        
        document.getElementById('closeErrorPopup').addEventListener('click', function() {
            hidePopup(errorPopup);
        });
        
        document.getElementById('viewDetails').addEventListener('click', function() {
            hidePopup(successPopup);
            // You can add detailed results view here
            alert('Detailed results feature coming soon!');
        });
        
        // Close popup when clicking outside
        successPopup.addEventListener('click', function(e) {
            if (e.target === successPopup) hidePopup(successPopup);
        });
        
        errorPopup.addEventListener('click', function(e) {
            if (e.target === errorPopup) hidePopup(errorPopup);
        });
        
        loadingPopup.addEventListener('click', function(e) {
            if (e.target === loadingPopup) hidePopup(loadingPopup);
        });
        
        // Close popup with Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                hidePopup(successPopup);
                hidePopup(errorPopup);
                hidePopup(loadingPopup);
            }
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
    document.body.style.overflow = 'hidden';
}

function hidePopup(popup) {
    popup.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function updateRecipientCount() {
    const recipientsTextarea = document.getElementById('recipients');
    const recipientCount = document.getElementById('recipientCount');
    const sendAllBtn = document.getElementById('sendAllBtn');
    
    if (recipientsTextarea && recipientCount) {
        const emails = recipientsTextarea.value.split(/[\n,]/).filter(email => email.trim() !== '');
        const count = emails.length;
        recipientCount.textContent = count;
        if (sendAllBtn) {
            sendAllBtn.disabled = count > 30 || count === 0;
        }
    }
}
