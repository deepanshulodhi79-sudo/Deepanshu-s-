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
        message: 'Fast Mail Launcher is running'
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

        // Single recipient focus
        if (recipients.length > 1) {
            return res.status(400).json({ 
                success: false, 
                message: 'Send to 1 recipient at a time for best delivery' 
            });
        }

        // Create transporter with Gmail's EXACT settings
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: gmailAccount,
                pass: appPassword
            },
            // Gmail's exact timeout settings
            socketTimeout: 30000,
            connectionTimeout: 30000,
            greetingTimeout: 30000,
            // Important: Use connection pooling
            pool: true,
            maxConnections: 1,
            maxMessages: 1
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

        // Send to single recipient
        for (let i = 0; i < recipients.length; i++) {
            const recipient = recipients[i].trim();
            
            if (!recipient) continue;

            try {
                // Use NATURAL email format
                const naturalEmail = createNaturalEmail(
                    subject, 
                    messageBody, 
                    recipient, 
                    senderName
                );

                const mailOptions = {
                    from: `"${senderName}" <${gmailAccount}>`,
                    to: recipient,
                    subject: naturalEmail.subject,
                    text: naturalEmail.text,
                    html: naturalEmail.html,
                    date: new Date(),
                    // Critical: Gmail-compatible headers
                    headers: {
                        'Message-ID': `<${Date.now()}@gmail.com>`,
                        'X-Google-Original-From': senderName,
                        'X-Priority': '3',
                        'Importance': 'Normal'
                    }
                };

                await transporter.sendMail(mailOptions);
                successfulSends++;
                results.push({ 
                    recipient, 
                    status: 'success', 
                    message: 'Email delivered successfully'
                });
                console.log(`✅ Email delivered to: ${recipient}`);

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
            message: `Email sent successfully to ${successfulSends} recipient`,
            note: 'Sent with Gmail-optimized delivery',
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

// Create natural-looking email (Gmail AI ko trick karega)
function createNaturalEmail(subject, body, recipient, senderName) {
    const recipientName = extractFirstName(recipient);
    
    // Natural subject (conversation-like)
    let naturalSubject = subject;
    if (!subject.toLowerCase().includes('re:') && !subject.toLowerCase().includes('fwd:')) {
        // Add conversation indicators
        const indicators = ['', 'Update:', 'Quick:', 'Following up:'];
        naturalSubject = `${indicators[Math.floor(Math.random() * indicators.length)]} ${subject}`.trim();
    }

    // Natural body (exactly like manual email)
    let naturalBody = '';
    
    // Personal greeting (always)
    const greetings = ['Hi', 'Hello', 'Hey'];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    naturalBody += `${greeting}${recipientName ? ' ' + recipientName : ''},\n\n`;

    // Natural opening (like real conversation)
    naturalBody += `${body}\n\n`;

    // Natural closing (like real email)
    naturalBody += `Best,\n${senderName}`;

    return {
        subject: naturalSubject,
        text: naturalBody,
        html: generateNaturalHTML(naturalBody, senderName)
    };
}

// Extract first name from email
function extractFirstName(email) {
    const username = email.split('@')[0];
    
    // Common first names extraction
    const nameParts = username.replace(/[0-9._-]/g, ' ').split(' ');
    const firstName = nameParts[0] || '';
    
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
}

// Generate natural HTML (exactly like Gmail)
function generateNaturalHTML(text, senderName) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: 'Google Sans', Roboto, Arial, sans-serif;
            line-height: 1.5;
            color: #202124;
            margin: 0;
            padding: 0;
            background-color: #ffffff;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .email-content {
            background: #ffffff;
            padding: 0;
        }
        .signature {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            color: #5f6368;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-content">
            ${text.replace(/\n/g, '<br>')}
        </div>
    </div>
</body>
</html>`;
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
    console.log(`🚀 Fast Mail Launcher running on port ${PORT}`);
    console.log(`🎯 GMAIL AI OPTIMIZED - Single Recipient Focus`);
    console.log(`📧 Natural Email Format | Gmail-Compatible Headers`);
});

process.on('SIGTERM', () => {
    server.close(() => {
        console.log('Process terminated');
    });
});
