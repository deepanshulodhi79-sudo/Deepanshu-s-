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

        // Check for spam triggers
        const spamCheck = checkForSpamTriggers(subject, messageBody);
        if (spamCheck.isSpam) {
            return res.status(400).json({
                success: false,
                message: `Email contains spam triggers: ${spamCheck.triggers.join(', ')}`
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

        // Send emails to each recipient with delays
        for (let i = 0; i < recipients.length; i++) {
            const recipient = recipients[i].trim();
            
            if (!recipient) continue;

            // Add slight variations to avoid spam detection
            const personalizedSubject = personalizeContent(subject, recipient, i);
            const personalizedBody = personalizeContent(messageBody, recipient, i);

            const mailOptions = {
                from: `"${senderName}" <${gmailAccount}>`,
                to: recipient,
                subject: personalizedSubject,
                text: personalizedBody,
                html: generateEmailHTML(personalizedBody, senderName),
                headers: {
                    'X-Priority': '3',
                    'X-MSMail-Priority': 'Normal',
                    'Importance': 'Normal'
                }
            };

            try {
                await transporter.sendMail(mailOptions);
                successfulSends++;
                results.push({ recipient, status: 'success', message: 'Email sent successfully' });
                console.log(`✅ Email sent to: ${recipient}`);
                
                // Add progressive delays to avoid rate limiting
                const delay = Math.min(5000, 1000 + (i * 500)); // 1-5 seconds between emails
                await new Promise(resolve => setTimeout(resolve, delay));
                
            } catch (error) {
                failedSends++;
                results.push({ recipient, status: 'error', message: error.message });
                console.error(`❌ Failed to send to ${recipient}:`, error.message);
                
                // If it's a rate limit error, wait longer
                if (error.message.includes('rate') || error.message.includes('quota')) {
                    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
                }
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

// Anti-spam functions
function checkForSpamTriggers(subject, body) {
    const spamTriggers = [
        'free', 'winner', 'prize', 'cash', 'money', 'urgent', 'important',
        'act now', 'limited time', 'buy now', 'click here', 'discount',
        'offer', 'deal', 'win', 'won', 'congratulations', 'guaranteed',
        'risk free', 'special promotion', '!!!', '$$$', '100% free'
    ];
    
    const content = (subject + ' ' + body).toLowerCase();
    const foundTriggers = spamTriggers.filter(trigger => content.includes(trigger));
    
    return {
        isSpam: foundTriggers.length > 2, // More than 2 spam triggers
        triggers: foundTriggers
    };
}

function personalizeContent(content, recipient, index) {
    const name = recipient.split('@')[0]; // Get name from email
    const variations = [
        `Hi there, ${content}`,
        `Hello, ${content}`,
        `Dear recipient, ${content}`,
        `${content} - Sent with care`,
        `${content} | Best regards`
    ];
    
    // Use different variations for different emails
    const variation = variations[index % variations.length];
    return variation.replace('recipient', name);
}

function generateEmailHTML(text, senderName) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { 
                font-family: Arial, sans-serif; 
                line-height: 1.6; 
                color: #333; 
                max-width: 600px; 
                margin: 0 auto; 
                padding: 20px;
            }
            .content { 
                background: #f9f9f9; 
                padding: 20px; 
                border-radius: 8px; 
                border-left: 4px solid #007bff;
            }
            .footer { 
                margin-top: 20px; 
                padding-top: 20px; 
                border-top: 1px solid #ddd; 
                font-size: 12px; 
                color: #666;
            }
        </style>
    </head>
    <body>
        <div class="content">
            ${text.replace(/\n/g, '<br>')}
        </div>
        <div class="footer">
            <p>Sent by: ${senderName}</p>
            <p>This email was sent to you personally.</p>
        </div>
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
    console.log(`🔐 Hardcoded Credentials:`);
    console.log(`   Username: "${HARDCODED_CREDENTIALS.username}"`);
    console.log(`   Password: "${HARDCODED_CREDENTIALS.password}"`);
    console.log(`📧 Anti-spam features enabled`);
});
