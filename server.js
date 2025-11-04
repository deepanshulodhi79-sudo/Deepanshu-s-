const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; // Render provides PORT

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

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Fast Mail Launcher is running',
        timestamp: new Date().toISOString()
    });
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
            },
            pool: true,
            maxConnections: 3,
            rateDelta: 1000,
            rateLimit: 5
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

        // Send emails in small batches for SPEED
        const batchSize = 3;
        const totalBatches = Math.ceil(recipients.length / batchSize);

        for (let batch = 0; batch < totalBatches; batch++) {
            const batchStart = batch * batchSize;
            const batchEnd = Math.min(batchStart + batchSize, recipients.length);
            const batchRecipients = recipients.slice(batchStart, batchEnd);

            // Send batch emails in parallel
            const batchPromises = batchRecipients.map((recipient, index) => {
                const globalIndex = batchStart + index;
                return sendSingleEmail(transporter, {
                    senderName,
                    gmailAccount,
                    subject,
                    messageBody,
                    recipient: recipient.trim()
                }, globalIndex);
            });

            // Wait for current batch
            const batchResults = await Promise.allSettled(batchPromises);
            
            batchResults.forEach((result, index) => {
                const recipient = batchRecipients[index];
                if (result.status === 'fulfilled' && result.value.success) {
                    successfulSends++;
                    results.push({ recipient, status: 'success', message: 'Email sent successfully' });
                } else {
                    failedSends++;
                    results.push({ 
                        recipient, 
                        status: 'error', 
                        message: result.status === 'rejected' ? result.reason : result.value.error 
                    });
                }
            });

            // VERY SHORT delay between batches (0.3-1 second)
            if (batch < totalBatches - 1) {
                const shortDelay = Math.floor(Math.random() * 700) + 300;
                await new Promise(resolve => setTimeout(resolve, shortDelay));
            }
        }

        res.json({
            success: true,
            message: `Emails sent to ${successfulSends} recipients`,
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

// Send single email
async function sendSingleEmail(transporter, emailData, index) {
    const { senderName, gmailAccount, subject, messageBody, recipient } = emailData;
    
    if (!recipient) {
        return { success: false, error: 'Invalid recipient' };
    }

    try {
        // Simple personalization
        const personalBody = personalizeContent(messageBody, recipient);

        const mailOptions = {
            from: `"${senderName}" <${gmailAccount}>`,
            to: recipient,
            subject: subject,
            text: personalBody,
            html: personalBody.replace(/\n/g, '<br>'),
            date: new Date()
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Email ${index + 1} sent to: ${recipient}`);
        return { success: true };
    } catch (error) {
        console.error(`❌ Failed to send to ${recipient}:`, error.message);
        return { success: false, error: error.message };
    }
}

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

// Fast Personalization
function personalizeContent(body, recipient) {
    const name = extractName(recipient);
    
    if (Math.random() < 0.5 && name) {
        return `Hi ${name},\n\n${body}`;
    }
    
    return body;
}

// Extract name from email
function extractName(email) {
    const username = email.split('@')[0];
    const name = username.replace(/[0-9._-]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
        .trim();
    
    return name || '';
}

// Logout endpoint
app.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Fast Mail Launcher server running on port ${PORT}`);
    console.log(`📍 Access the application at: http://localhost:${PORT}`);
    console.log(`🔐 Login: ${HARDCODED_CREDENTIALS.username} / ${HARDCODED_CREDENTIALS.password}`);
});
