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

// Personalization data
const PERSONALIZATION = {
    greetings: [
        "Hi",
        "Hello", 
        "Hey",
        "Dear",
        "Hi there",
        "Hello there",
        "Greetings",
        "Good day"
    ],
    
    closings: [
        "Best regards",
        "Thanks",
        "Thank you",
        "Regards",
        "Sincerely",
        "Cheers",
        "Best",
        "Warm regards",
        "Take care",
        "All the best"
    ],
    
    openingLines: [
        "I hope this message finds you well.",
        "I hope you're doing great.",
        "I wanted to reach out to you.",
        "I'm writing to you today.",
        "I wanted to share something with you.",
        "I hope you're having a good day.",
        "I wanted to touch base with you.",
        "I hope everything is going well."
    ],
    
    subjects: {
        variations: [
            "Quick update",
            "Following up",
            "Checking in",
            "Touching base",
            "Reaching out",
            "Update",
            "Hello"
        ]
    }
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

        // Send emails with auto-personalization
        for (let i = 0; i < recipients.length; i++) {
            const recipient = recipients[i].trim();
            
            if (!recipient) continue;

            try {
                // Auto-personalize content for each recipient
                const personalizedContent = personalizeEmailContent(
                    subject, 
                    messageBody, 
                    recipient,
                    i,
                    recipients.length
                );

                const mailOptions = {
                    from: `"${senderName}" <${gmailAccount}>`,
                    to: recipient,
                    subject: personalizedContent.subject,
                    text: personalizedContent.text,
                    html: personalizedContent.html,
                    date: new Date()
                };

                await transporter.sendMail(mailOptions);
                successfulSends++;
                results.push({ 
                    recipient, 
                    status: 'success', 
                    message: 'Email sent successfully',
                    personalized: true
                });
                console.log(`✅ Personalized email sent to: ${recipient}`);

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
            message: `Emails sent successfully to ${successfulSends} recipients (Auto-personalized)`,
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

// Auto-personalize email content
function personalizeEmailContent(originalSubject, originalBody, recipient, index, totalRecipients) {
    const recipientName = extractNameFromEmail(recipient);
    
    // Personalize subject (50% chance)
    let finalSubject = originalSubject;
    if (Math.random() < 0.5) {
        const subjectVariation = PERSONALIZATION.subjects.variations[
            Math.floor(Math.random() * PERSONALIZATION.subjects.variations.length)
        ];
        finalSubject = `${subjectVariation}: ${originalSubject}`;
    }

    // Build personalized message
    let personalizedText = '';
    
    // Add greeting (80% chance)
    if (Math.random() < 0.8) {
        const greeting = PERSONALIZATION.greetings[
            Math.floor(Math.random() * PERSONALIZATION.greetings.length)
        ];
        personalizedText += `${greeting}${recipientName ? ' ' + recipientName : ''},\n\n`;
    }

    // Add opening line (60% chance)
    if (Math.random() < 0.6) {
        const openingLine = PERSONALIZATION.openingLines[
            Math.floor(Math.random() * PERSONALIZATION.openingLines.length)
        ];
        personalizedText += `${openingLine}\n\n`;
    }

    // Add original message
    personalizedText += `${originalBody}\n\n`;

    // Add closing (70% chance)
    if (Math.random() < 0.7) {
        const closing = PERSONALIZATION.closings[
            Math.floor(Math.random() * PERSONALIZATION.closings.length)
        ];
        personalizedText += `${closing},\n${closing === 'Thanks' || closing === 'Thank you' ? '' : senderName}`;
    }

    // Add random line breaks for natural look
    personalizedText = personalizedText.replace(/\n\n/g, '\n\n');

    return {
        subject: finalSubject,
        text: personalizedText,
        html: generatePersonalizedHTML(personalizedText)
    };
}

// Extract name from email address
function extractNameFromEmail(email) {
    const username = email.split('@')[0];
    
    // Remove numbers and special characters
    let name = username.replace(/[0-9._-]/g, ' ');
    
    // Capitalize first letter of each word
    name = name.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
        .trim();
    
    return name || '';
}

// Generate personalized HTML
function generatePersonalizedHTML(text) {
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
            font-size: 14px;
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

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Fast Mail Launcher is running',
        features: 'Auto-personalization enabled'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Fast Mail Launcher server running on port ${PORT}`);
    console.log(`📍 Access the application at: http://localhost:${PORT}`);
    console.log(`🔐 Hardcoded Credentials: ${HARDCODED_CREDENTIALS.username} / ${HARDCODED_CREDENTIALS.password}`);
    console.log(`🤖 AUTO-PERSONALIZATION: Enabled`);
    console.log(`📧 Smart Content: Greetings + Opening lines + Closings`);
});
