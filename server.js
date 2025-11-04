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

// SEO-specific content optimization
const SEO_EMAIL_TEMPLATES = {
    subjects: {
        consultation: [
            "Website growth ideas",
            "Digital visibility discussion", 
            "Online presence optimization",
            "Web traffic strategies",
            "Digital marketing chat"
        ],
        followup: [
            "Following up on our conversation",
            "Quick check-in",
            "Continuing our discussion",
            "Further thoughts",
            "Additional ideas"
        ]
    },
    
    greetings: [
        "Hope you're doing well",
        "Great connecting with you",
        "Thanks for your time",
        "Appreciate our conversation",
        "Following up on our chat"
    ],

    closings: [
        "Look forward to connecting",
        "Best regards",
        "Thanks again",
        "Talk soon",
        "All the best"
    ]
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'SEO Mail Launcher is running'
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

        if (recipients.length > 5) {
            return res.status(400).json({ 
                success: false, 
                message: 'Maximum 5 recipients for SEO emails' 
            });
        }

        // SEO-specific spam check
        const seoSpamCheck = checkSEOSpam(subject, messageBody);
        if (seoSpamCheck.isSpam) {
            return res.status(400).json({
                success: false,
                message: `SEO content flagged: ${seoSpamCheck.suggestion}`
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

        // Send SEO-optimized emails
        for (let i = 0; i < recipients.length; i++) {
            const recipient = recipients[i].trim();
            
            if (!recipient) continue;

            try {
                // Transform SEO content to inbox-friendly
                const seoOptimizedEmail = optimizeSEOEmail(
                    subject, 
                    messageBody, 
                    recipient, 
                    senderName
                );

                const mailOptions = {
                    from: `"${senderName}" <${gmailAccount}>`,
                    to: recipient,
                    subject: seoOptimizedEmail.subject,
                    text: seoOptimizedEmail.text,
                    html: seoOptimizedEmail.html,
                    date: new Date()
                };

                await transporter.sendMail(mailOptions);
                successfulSends++;
                results.push({ 
                    recipient, 
                    status: 'success', 
                    message: 'SEO email delivered'
                });
                console.log(`✅ SEO email sent to: ${recipient}`);

                // Short delay for multiple recipients
                if (recipients.length > 1 && i < recipients.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
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
            message: `SEO emails sent to ${successfulSends} clients`,
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

// SEO-specific spam detection
function checkSEOSpam(subject, body) {
    const highRiskSEOWords = [
        'SEO', 'search engine', 'google ranking', 'page rank', 'backlink',
        'keyword', 'ranking', 'top position', 'first page', 'organic traffic',
        'guaranteed', 'results', 'increase traffic', 'boost ranking',
        'algorithm', 'SERP', 'link building', 'domain authority'
    ];

    const aggressiveWords = [
        'guaranteed', '100%', 'immediately', 'overnight', 'instant',
        'cheap', 'affordable', 'discount', 'offer', 'limited time',
        'act now', 'click here', 'buy now', 'sign up today'
    ];

    const content = (subject + ' ' + body).toLowerCase();
    
    // Check for high-risk SEO words
    const foundSEOWords = highRiskSEOWords.filter(word => content.includes(word.toLowerCase()));
    const foundAggressiveWords = aggressiveWords.filter(word => content.includes(word.toLowerCase()));
    
    if (foundSEOWords.length > 2) {
        return { 
            isSpam: true,
            suggestion: `Avoid technical terms like: ${foundSEOWords.slice(0, 2).join(', ')}. Use conversational language.`
        };
    }

    if (foundAggressiveWords.length > 0) {
        return {
            isSpam: true,
            suggestion: `Remove aggressive marketing words like: ${foundAggressiveWords[0]}. Be more conversational.`
        };
    }

    return { isSpam: false };
}

// Optimize SEO email for inbox delivery
function optimizeSEOEmail(subject, body, recipient, senderName) {
    const recipientName = extractName(recipient);
    
    // Transform subject from SEO to conversational
    let naturalSubject = transformSEOSubject(subject);
    
    // Transform body from SEO pitch to professional discussion
    let naturalBody = transformSEOBody(body, recipientName, senderName);

    return {
        subject: naturalSubject,
        text: naturalBody,
        html: generateProfessionalHTML(naturalBody, senderName)
    };
}

// Transform SEO subject to natural
function transformSEOSubject(originalSubject) {
    const subject = originalSubject.toLowerCase();
    
    // Replace common SEO subjects with natural ones
    if (subject.includes('seo') || subject.includes('search engine')) {
        return SEO_EMAIL_TEMPLATES.subjects.consultation[
            Math.floor(Math.random() * SEO_EMAIL_TEMPLATES.subjects.consultation.length)
        ];
    }
    
    if (subject.includes('ranking') || subject.includes('google')) {
        return "Website visibility discussion";
    }
    
    if (subject.includes('backlink') || subject.includes('link building')) {
        return "Content collaboration ideas";
    }
    
    // Keep original if no SEO keywords
    return originalSubject;
}

// Transform SEO body to natural conversation
function transformSEOBody(originalBody, recipientName, senderName) {
    let transformedBody = originalBody;
    
    // Replace SEO jargon with natural language
    transformedBody = transformedBody.replace(/SEO/gi, 'online visibility');
    transformedBody = transformedBody.replace(/search engine optimization/gi, 'digital presence');
    transformedBody = transformedBody.replace(/google ranking/gi, 'search visibility');
    transformedBody = transformedBody.replace(/backlink/gi, 'content reference');
    transformedBody = transformedBody.replace(/keyword/gi, 'search term');
    transformedBody = transformedBody.replace(/SERP/gi, 'search results');
    transformedBody = transformedBody.replace(/organic traffic/gi, 'website visitors');
    
    // Build natural email structure
    let naturalEmail = '';
    
    // Personal greeting
    naturalEmail += `Hi${recipientName ? ' ' + recipientName : ''},\n\n`;
    
    // Professional opening
    naturalEmail += `${SEO_EMAIL_TEMPLATES.greetings[Math.floor(Math.random() * SEO_EMAIL_TEMPLATES.greetings.length)]}.\n\n`;
    
    // Transformed content
    naturalEmail += `${transformedBody}\n\n`;
    
    // Professional closing
    naturalEmail += `${SEO_EMAIL_TEMPLATES.closings[Math.floor(Math.random() * SEO_EMAIL_TEMPLATES.closings.length)]},\n${senderName}`;

    return naturalEmail;
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

// Generate professional HTML
function generateProfessionalHTML(text, senderName) {
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
            color: #666666;
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
    console.log(`🚀 SEO Mail Launcher running on port ${PORT}`);
    console.log(`🎯 SEO OPTIMIZED - Spam Proof`);
    console.log(`📧 Professional Templates | Natural Language`);
});

process.on('SIGTERM', () => {
    server.close(() => {
        console.log('Process terminated');
    });
});
