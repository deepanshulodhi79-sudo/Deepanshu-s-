const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Hardcoded login credentials
const HARDCODED_CREDENTIALS = {
    username: 'Yatendra Rajput',
    password: 'Yattu@882'
};

// Simple session storage
const activeSessions = new Map();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Health check for Render
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'Mail Launcher is running',
        timestamp: new Date().toISOString()
    });
});

// Serve login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve launcher page
app.get('/launcher', (req, res) => {
    const token = req.query.token;
    if (!token || !activeSessions.has(token)) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'launcher.html'));
});

// Login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username and password are required'
        });
    }

    if (username === HARDCODED_CREDENTIALS.username && password === HARDCODED_CREDENTIALS.password) {
        const token = 'session_' + Date.now();
        activeSessions.set(token, { username, timestamp: Date.now() });
        
        // Clean up old sessions (optional)
        cleanupSessions();
        
        res.json({
            success: true,
            message: 'Login successful',
            token: token
        });
    } else {
        res.status(401).json({
            success: false,
            message: 'Invalid username or password'
        });
    }
});

// Clean up old sessions (24 hours)
function cleanupSessions() {
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    for (const [token, session] of activeSessions.entries()) {
        if (now - session.timestamp > twentyFourHours) {
            activeSessions.delete(token);
        }
    }
}

// Email sending endpoint
app.post('/send-emails', async (req, res) => {
    try {
        const { senderName, gmailAccount, appPassword, subject, messageBody, recipients } = req.body;

        // Validate input
        if (!senderName || !gmailAccount || !appPassword || !subject || !messageBody || !recipients) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        // Create transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: gmailAccount,
                pass: appPassword
            }
        });

        // Verify transporter configuration
        try {
            await transporter.verify();
            console.log('Gmail authentication successful');
        } catch (error) {
            console.error('Gmail authentication failed:', error);
            return res.status(400).json({ 
                success: false, 
                message: 'Gmail authentication failed. Please check your email and app password.' 
            });
        }

        const recipientList = recipients.split(/[\n,]/)
            .map(email => email.trim())
            .filter(email => email !== '');

        const results = [];
        let successfulSends = 0;

        // Send emails
        for (let i = 0; i < recipientList.length; i++) {
            const recipient = recipientList[i];
            
            try {
                const mailOptions = {
                    from: `"${senderName}" <${gmailAccount}>`,
                    to: recipient,
                    subject: subject,
                    text: messageBody,
                    html: `<div>${messageBody.replace(/\n/g, '<br>')}</div>`,
                    date: new Date()
                };

                await transporter.sendMail(mailOptions);
                successfulSends++;
                results.push({ 
                    recipient, 
                    status: 'success', 
                    message: 'Email sent successfully'
                });
                console.log(`✅ Email sent to: ${recipient}`);

                // Small delay between emails
                if (i < recipientList.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

            } catch (error) {
                results.push({ 
                    recipient, 
                    status: 'error', 
                    message: error.message 
                });
                console.error(`❌ Failed to send to ${recipient}:`, error.message);
            }
        }

        res.json({
            success: true,
            message: `Emails sent successfully to ${successfulSends} recipients`,
            results: results
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error: ' + error.message 
        });
    }
});

// Logout endpoint
app.post('/logout', (req, res) => {
    const { token } = req.body;
    if (token) {
        activeSessions.delete(token);
    }
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Mail Launcher running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🔐 Login: ${HARDCODED_CREDENTIALS.username} / ${HARDCODED_CREDENTIALS.password}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});
