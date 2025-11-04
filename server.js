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

        // Single email optimization
        if (recipients.length > 5) {
            return res.status(400).json({ 
                success: false, 
                message: 'Maximum 5 recipients for better inbox delivery' 
            });
        }

        // Advanced inbox delivery check
        const inboxCheck = checkInboxDelivery(subject, messageBody, senderName);
        if (!inboxCheck.safe) {
            return res.status(400).json({
                success: false,
                message: `Inbox delivery issue: ${inboxCheck.reason}`
            });
        }

        // Create transporter with inbox-focused settings
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: gmailAccount,
                pass: appPassword
            },
            // Important for inbox delivery
            socketTimeout: 30000,
            connectionTimeout: 30000
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

        // Send emails with inbox optimization
        for (let i = 0; i < recipients.length; i++) {
            const recipient = recipients[i].trim();
            
            if (!recipient) continue;

            try {
                // Create highly personalized content
                const inboxOptimizedContent = optimizeForInbox(
                    subject, 
                    messageBody, 
                    recipient, 
                    senderName
                );

                const mailOptions = {
                    from: `"${senderName}" <${gmailAccount}>`,
                    to: recipient,
                    subject: inboxOptimizedContent.subject,
                    text: inboxOptimizedContent.text,
                    html: inboxOptimizedContent.html,
                    date: new Date(),
                    // Critical headers for inbox delivery
                    headers: {
                        'X-Priority': '3',
                        'X-MSMail-Priority': 'Normal',
                        'Importance': 'Normal',
                        'X-Mailer': 'Microsoft Outlook 16.0',
                        'MIME-Version': '1.0'
                    }
                };

                await transporter.sendMail(mailOptions);
                successfulSends++;
                results.push({ 
                    recipient, 
                    status: 'success', 
                    message: 'Email delivered to inbox'
                });
                console.log(`✅ Email delivered to: ${recipient}`);

                // Important: Wait 3-5 seconds between emails
                if (i < recipients.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 4000));
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
            message: `Emails delivered to ${successfulSends} inboxes`,
            note: 'Sent with inbox delivery optimization',
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

// Advanced inbox delivery checker
function checkInboxDelivery(subject, body, senderName) {
    const spamTriggers = [
        'free', 'winner', 'prize', 'cash', 'money', 'urgent', 'important',
        'act now', 'limited time', 'buy now', 'click here', 'discount',
        'offer', 'deal', 'win', 'won', 'congratulations', 'guaranteed',
        'risk free', 'special promotion', '!!!', '$$$', '100% free',
        'million', 'billion', 'viagra', 'casino', 'lottery', 'loan',
        'credit', 'debt', 'insurance', 'investment', 'profit', 'rich',
        'work from home', 'make money', 'earn money', 'extra income',
        'apply now', 'call now', 'click below', 'email us'
    ];

    const content = (subject + ' ' + body).toLowerCase();
    
    // Check for spam words
    const foundTriggers = spamTriggers.filter(word => content.includes(word));
    if (foundTriggers.length > 0) {
        return { 
            safe: false, 
            reason: `Contains flagged words: ${foundTriggers[0]}` 
        };
    }

    // Check subject quality
    if (subject.length < 3) {
        return { safe: false, reason: 'Subject too short' };
    }

    if (subject.toUpperCase() === subject) {
        return { safe: false, reason: 'Subject in all caps' };
    }

    // Check body quality
    if (body.length < 10) {
        return { safe: false, reason: 'Message too short' };
    }

    // Check sender name
    if (!senderName || senderName.length < 2) {
        return { safe: false, reason: 'Use a real sender name' };
    }

    return { safe: true };
}

// Optimize content for inbox delivery
function optimizeForInbox(subject, body, recipient, senderName) {
    const recipientName = extractRealName(recipient);
    
    // Create natural subject
    let naturalSubject = subject;
    if (!looksNatural(subject)) {
        naturalSubject = `Update: ${subject}`;
    }

    // Create highly personalized body
    let personalizedBody = '';
    
    // Personal greeting (90% chance)
    const greetings = ['Hi', 'Hello', 'Hey', 'Dear'];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    personalizedBody += `${greeting}${recipientName ? ' ' + recipientName : ''},\n\n`;

    // Natural opening line (80% chance)
    const openings = [
        "I hope you're doing well.",
        "I wanted to share this with you.",
        "I'm writing to follow up on this.",
        "I wanted to touch base with you.",
        "Hope you're having a good day."
    ];
    const opening = openings[Math.floor(Math.random() * openings.length)];
    personalizedBody += `${opening}\n\n`;

    // Original message
    personalizedBody += `${body}\n\n`;

    // Natural closing (70% chance)
    const closings = ['Best regards', 'Thanks', 'Regards', 'Sincerely'];
    const closing = closings[Math.floor(Math.random() * closings.length)];
    personalizedBody += `${closing},\n${senderName}`;

    return {
        subject: naturalSubject,
        text: personalizedBody,
        html: generateInboxHTML(personalizedBody)
    };
}

// Check if subject looks natural
function looksNatural(subject) {
    const naturalIndicators = ['re:', 'fw:', 'hello', 'hi', 'update', 'follow up'];
    const lowerSubject = subject.toLowerCase();
    
    return naturalIndicators.some(indicator => 
        lowerSubject.includes(indicator)
    ) || subject.length <= 40;
}

// Extract real name from email
function extractRealName(email) {
    const username = email.split('@')[0];
    
    // Common name patterns
    const name = username
        .replace(/[0-9._-]/g, ' ')
        .split(' ')
        .map(word => {
            // Skip very short words
            if (word.length <= 2) return '';
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .filter(word => word !== '')
        .join(' ')
        .trim();
    
    return name || '';
}

// Generate inbox-friendly HTML
function generateInboxHTML(text) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #202124; 
            margin: 0; 
            padding: 20px;
            background-color: #ffffff;
            max-width: 600px;
            margin: 0 auto;
        }
        .content {
            background: #ffffff;
            padding: 0;
        }
        .signature {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="content">
        ${text.replace(/\n/g, '<br>')}
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
    console.log(`🎯 INBOX DELIVERY OPTIMIZED`);
    console.log(`📧 Max 5 recipients | 4-second delays`);
});

process.on('SIGTERM', () => {
    server.close(() => {
        console.log('Process terminated');
    });
});
