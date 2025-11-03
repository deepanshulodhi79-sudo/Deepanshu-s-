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

        // Spam prevention check
        const spamCheck = checkForSpamContent(subject, messageBody);
        if (spamCheck.isSpam) {
            return res.status(400).json({
                success: false,
                message: `Spam detected: ${spamCheck.reason}`
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
            maxConnections: 5,
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

        // Send emails in small batches for speed
        const batchSize = 5;
        const totalBatches = Math.ceil(recipients.length / batchSize);

        for (let batch = 0; batch < totalBatches; batch++) {
            const batchStart = batch * batchSize;
            const batchEnd = Math.min(batchStart + batchSize, recipients.length);
            const batchRecipients = recipients.slice(batchStart, batchEnd);

            // Send batch emails in parallel
            const batchPromises = batchRecipients.map((recipient, index) => {
                return sendSingleEmail(transporter, {
                    senderName,
                    gmailAccount,
                    subject,
                    messageBody,
                    recipient: recipient.trim()
                }, batchStart + index);
            });

            // Wait for all emails in current batch to complete
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

            // Small delay between batches only
            if (batch < totalBatches - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        res.json({
            success: true,
            message: `Emails sent: ${successfulSends} successful, ${failedSends} failed`,
            totalTime: `Completed in ~${(recipients.length * 0.2).toFixed(1)} seconds`,
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

// Function to send single email
async function sendSingleEmail(transporter, emailData, index) {
    const { senderName, gmailAccount, subject, messageBody, recipient } = emailData;
    
    if (!recipient) {
        return { success: false, error: 'Invalid recipient' };
    }

    const mailOptions = {
        from: `"${senderName}" <${gmailAccount}>`,
        to: recipient,
        subject: subject,
        text: messageBody,
        html: generateCleanEmailHTML(messageBody), // No sender name in HTML
        headers: {
            'X-Priority': '3',
            'X-MSMail-Priority': 'Normal',
            'Importance': 'Normal'
        }
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email ${index + 1} sent to: ${recipient}`);
        return { success: true };
    } catch (error) {
        console.error(`❌ Failed to send to ${recipient}:`, error.message);
        return { success: false, error: error.message };
    }
}

// Spam content detection
function checkForSpamContent(subject, body) {
    const highRiskWords = [
        'free', 'winner', 'prize', 'cash', 'money', 'urgent', 'important',
        'act now', 'limited time', 'buy now', 'click here', 'discount',
        'offer', 'deal', 'win', 'won', 'congratulations', 'guaranteed',
        'risk free', 'special promotion', '!!!', '$$$', '100% free',
        'million', 'billion', 'viagra', 'casino', 'lottery', 'loan'
    ];

    const content = (subject + ' ' + body).toLowerCase();
    
    // Check for excessive capitalization
    const capitalRatio = (subject.match(/[A-Z]/g) || []).length / subject.length;
    if (capitalRatio > 0.7) {
        return { isSpam: true, reason: 'Too many capital letters in subject' };
    }

    // Check for spam words
    const foundSpamWords = highRiskWords.filter(word => content.includes(word));
    if (foundSpamWords.length > 2) {
        return { isSpam: true, reason: `Contains spam words: ${foundSpamWords.slice(0, 3).join(', ')}` };
    }

    // Check for excessive punctuation
    const exclamationCount = (subject.match(/!/g) || []).length;
    if (exclamationCount > 2) {
        return { isSpam: true, reason: 'Too many exclamation marks' };
    }

    return { isSpam: false };
}

// Clean email HTML template - NO EXTRA TEXT
function generateCleanEmailHTML(text) {
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
                color: #333333; 
                margin: 0; 
                padding: 20px;
                background-color: #ffffff;
            }
        </style>
    </head>
    <body>
        ${text.replace(/\n/g, '<br>')}
    </body>
    </html>
    `;
}

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
    console.log(`🚀 Fast Mail Launcher server running on port ${PORT}`);
    console.log(`📍 Access the application at: http://localhost:${PORT}`);
    console.log(`🔐 Hardcoded Credentials: ${HARDCODED_CREDENTIALS.username} / ${HARDCODED_CREDENTIALS.password}`);
    console.log(`⚡ Ultra Fast Mode: 5 emails parallel, 0.5s batch delays`);
    console.log(`📧 Clean Emails: No extra text, just your message`);
});
