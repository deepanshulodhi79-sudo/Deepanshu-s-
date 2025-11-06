const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Hardcoded login credentials
const HARDCODED_CREDENTIALS = {
    username: 'Dipanshu Lodhi',
    password: 'Lodhi Ji 15'
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'Universal Mail Launcher is running'
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/launcher', (req, res) => {
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

    if (username.trim() === HARDCODED_CREDENTIALS.username && password.trim() === HARDCODED_CREDENTIALS.password) {
        const sessionToken = 'session_' + Date.now();
        
        res.json({
            success: true,
            message: 'Login successful',
            sessionToken: sessionToken,
            username: username
        });
    } else {
        res.status(401).json({
            success: false,
            message: 'Invalid username or password'
        });
    }
});

// Middleware to check authentication
const authenticate = (req, res, next) => {
    const sessionToken = req.headers.authorization;
    
    if (!sessionToken) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. Please login first.'
        });
    }
    
    if (sessionToken.startsWith('session_')) {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'Invalid session'
        });
    }
};

// Email sending endpoint - SIMPLE & CLEAN
app.post('/send-emails', authenticate, async (req, res) => {
    try {
        const { senderName, gmailAccount, appPassword, subject, messageBody, recipients } = req.body;

        // Basic validation
        if (!senderName || !gmailAccount || !appPassword || !subject || !messageBody || !recipients) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        // Create transporter - NO SPECIAL SETTINGS
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: gmailAccount,
                pass: appPassword
            }
            // No pool, no rate limits, no special headers
        });

        // Verify transporter
        try {
            await transporter.verify();
            console.log('Gmail authentication successful');
        } catch (error) {
            console.error('Gmail authentication failed:', error);
            return res.status(400).json({ 
                success: false, 
                message: 'Gmail authentication failed. Check your email and app password.' 
            });
        }

        const results = [];
        let successfulSends = 0;

        // Send emails - NO DELAYS, NO TRANSFORMATIONS
        for (let i = 0; i < recipients.length; i++) {
            const recipient = recipients[i].trim();
            
            if (!recipient) continue;

            try {
                const mailOptions = {
                    from: `"${senderName}" <${gmailAccount}>`,
                    to: recipient,
                    subject: subject, // ORIGINAL SUBJECT
                    text: messageBody, // ORIGINAL MESSAGE
                    html: generateCleanHTML(messageBody), // SIMPLE HTML
                    date: new Date()
                    // NO SPECIAL HEADERS
                };

                await transporter.sendMail(mailOptions);
                successfulSends++;
                results.push({ 
                    recipient, 
                    status: 'success', 
                    message: 'Email sent successfully'
                });
                console.log(`✅ Email sent to: ${recipient}`);

                // NO DELAYS - Instant sending

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

// Simple HTML - NO STYLING
function generateCleanHTML(text) {
    return `<div>${text.replace(/\n/g, '<br>')}</div>`;
}

// Logout endpoint
app.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Universal Mail Launcher running on port ${PORT}`);
    console.log(`🎯 SPAM-PROOF | FAST | UNIVERSAL`);
    console.log(`📧 Send any content | No delays | No transformations`);
});

process.on('SIGTERM', () => {
    server.close(() => {
        console.log('Process terminated');
    });
});
