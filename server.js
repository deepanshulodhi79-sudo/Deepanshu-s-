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

// Health check - MUST be first route for Render
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'Fast Mail Launcher is running',
        timestamp: new Date().toISOString()
    });
});

// Serve login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve launcher page
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

// Email sending endpoint
app.post('/send-emails', authenticate, async (req, res) => {
    try {
        const { senderName, gmailAccount, appPassword, subject, messageBody, recipients } = req.body;

        // Validate input
        if (!senderName || !gmailAccount || !appPassword || !subject || !messageBody || !recipients) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        if (recipients.length > 15) {
            return res.status(400).json({ 
                success: false, 
                message: 'Maximum 15 recipients allowed' 
            });
        }

        // Quick Spam Check
        const spamCheck = quickSpamCheck(subject, messageBody);
        if (spamCheck.isSpam) {
            return res.status(400).json({
                success: false,
                message: `Avoid spam words: ${spamCheck.reason}`
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

        const results = [];
        let successfulSends = 0;
        let failedSends = 0;

        // Send emails
        for (let i = 0; i < recipients.length; i++) {
            const recipient = recipients[i].trim();
            
            if (!recipient) continue;

            try {
                const mailOptions = {
                    from: `"${senderName}" <${gmailAccount}>`,
                    to: recipient,
                    subject: subject,
                    text: messageBody,
                    html: messageBody.replace(/\n/g, '<br>'),
                    date: new Date()
                };

                await transporter.sendMail(mailOptions);
                successfulSends++;
                results.push({ recipient, status: 'success', message: 'Email sent successfully' });
                console.log(`✅ Email sent to: ${recipient}`);

                // Short delay
                if (i < recipients.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

            } catch (error) {
                failedSends++;
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
            message: `Emails sent: ${successfulSends} successful, ${failedSends} failed`,
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

// Quick Spam Check
function quickSpamCheck(subject, body) {
    const highRiskWords = [
        'free', 'winner', 'prize', 'cash', 'money', 'urgent', 'important',
        'act now', 'limited time', 'buy now', 'click here', 'discount',
        'offer', 'deal', 'win', 'won', 'congratulations', 'guaranteed',
        'risk free', 'special promotion', '!!!', '$$$', '100% free'
    ];

    const content = (subject + ' ' + body).toLowerCase();
    
    const foundSpamWords = highRiskWords.filter(word => content.includes(word));
    if (foundSpamWords.length > 0) {
        return { 
            isSpam: true, 
            reason: foundSpamWords.slice(0, 2).join(', ') 
        };
    }

    return { isSpam: false };
}

// Logout endpoint
app.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Start server with Render-compatible binding
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Fast Mail Launcher server running on port ${PORT}`);
    console.log(`📍 Access the application`);
    console.log(`🔐 Login: ${HARDCODED_CREDENTIALS.username} / ${HARDCODED_CREDENTIALS.password}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});
