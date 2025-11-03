const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

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

// Serve login page as default
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

    if (username === HARDCODED_CREDENTIALS.username && password === HARDCODED_CREDENTIALS.password) {
        // Generate a simple session token
        const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
        
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
    
    // In a real app, you would validate the session token properly
    // For this demo, we'll accept any token that was generated
    next();
};

// Email sending endpoint (protected)
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

        if (recipients.length > 30) {
            return res.status(400).json({ 
                success: false, 
                message: 'Maximum 30 recipients allowed' 
            });
        }

        // Create transporter
        const transporter = nodemailer.createTransporter({
            service: 'gmail',
            auth: {
                user: gmailAccount,
                pass: appPassword
            }
        });

        // Verify transporter configuration
        try {
            await transporter.verify();
        } catch (error) {
            return res.status(400).json({ 
                success: false, 
                message: 'Gmail authentication failed. Please check your email and app password.' 
            });
        }

        const results = [];
        let successfulSends = 0;
        let failedSends = 0;

        // Send emails to each recipient
        for (let i = 0; i < recipients.length; i++) {
            const recipient = recipients[i].trim();
            
            if (!recipient) continue;

            const mailOptions = {
                from: `"${senderName}" <${gmailAccount}>`,
                to: recipient,
                subject: subject,
                text: messageBody,
                html: messageBody.replace(/\n/g, '<br>')
            };

            try {
                await transporter.sendMail(mailOptions);
                successfulSends++;
                results.push({ recipient, status: 'success', message: 'Email sent successfully' });
            } catch (error) {
                failedSends++;
                results.push({ recipient, status: 'error', message: error.message });
            }

            // Add small delay to avoid rate limiting
            if (i < recipients.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
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

// Logout endpoint
app.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Fast Mail Launcher is running' });
});

app.listen(PORT, () => {
    console.log(`Fast Mail Launcher server running on port ${PORT}`);
    console.log(`Access the application at: http://localhost:${PORT}`);
    console.log(`Hardcoded Credentials - Username: "${HARDCODED_CREDENTIALS.username}", Password: "${HARDCODED_CREDENTIALS.password}"`);
});
