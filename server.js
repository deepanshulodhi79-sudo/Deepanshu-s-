const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Hardcoded login
const HARD_USERNAME = "Yatendra Rajput";
const HARD_PASSWORD = "Yattu@882";

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server running' });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/launcher', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'launcher.html'));
});

// Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === HARD_USERNAME && password === HARD_PASSWORD) {
        res.json({ success: true, message: 'Login successful' });
    } else {
        res.json({ success: false, message: 'Invalid credentials' });
    }
});

// 🎯 SPAM-PROOF EMAIL SENDING
app.post('/send-emails', async (req, res) => {
    try {
        const { senderName, gmailAccount, appPassword, subject, messageBody, recipients } = req.body;

        // Validation
        if (!senderName || !gmailAccount || !appPassword || !subject || !messageBody || !recipients) {
            return res.json({ success: false, message: "All fields required" });
        }

        // 🛡️ STRICT SPAM CHECK
        const spamResult = checkForSpam(subject, messageBody);
        if (spamResult.isSpam) {
            return res.json({ 
                success: false, 
                message: `SPAM DETECTED: ${spamResult.reason}` 
            });
        }

        // Create transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: gmailAccount, pass: appPassword }
        });

        // Verify connection
        await transporter.verify();

        const recipientList = recipients.split(/[\n,]/).map(r => r.trim()).filter(r => r);
        const results = [];
        let successCount = 0;

        // Send emails with INBOX OPTIMIZATION
        for (let i = 0; i < recipientList.length; i++) {
            const recipient = recipientList[i];
            
            try {
                // 🎯 INBOX OPTIMIZED CONTENT
                const optimizedContent = createInboxOptimizedEmail(subject, messageBody, recipient, senderName);
                
                const mailOptions = {
                    from: `"${senderName}" <${gmailAccount}>`,
                    to: recipient,
                    subject: optimizedContent.subject,
                    text: optimizedContent.text,
                    html: optimizedContent.html,
                    headers: {
                        'X-Priority': '3',
                        'Importance': 'Normal',
                        'X-Mailer': 'Microsoft Outlook 16.0'
                    }
                };

                await transporter.sendMail(mailOptions);
                successCount++;
                results.push({ recipient, status: 'success' });
                console.log(`✅ INBOX: ${recipient}`);

                // Human-like delay
                if (i < recipientList.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }

            } catch (error) {
                results.push({ recipient, status: 'error', error: error.message });
                console.log(`❌ FAILED: ${recipient}`);
            }
        }

        res.json({ 
            success: true, 
            message: `✅ ${successCount} emails delivered to INBOX`,
            results 
        });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// 🛡️ STRICT SPAM DETECTION
function checkForSpam(subject, body) {
    const spamWords = [
        'free', 'winner', 'prize', 'cash', 'money', 'urgent', 'important',
        'act now', 'limited time', 'buy now', 'click here', 'discount',
        'offer', 'deal', 'win', 'won', 'congratulations', 'guaranteed',
        'risk free', 'special promotion', '!!!', '$$$', '100% free',
        'million', 'billion', 'viagra', 'casino', 'lottery', 'loan',
        'credit', 'debt', 'insurance', 'investment', 'profit', 'rich',
        'work from home', 'make money', 'earn money', 'extra income',
        'apply now', 'call now', 'click below', 'email us', 'subscribe',
        'unsubscribe', 'order now', 'shop now', 'buy today', 'limited offer',
        'SEO', 'search engine', 'google ranking', 'backlink', 'keyword'
    ];

    const content = (subject + ' ' + body).toLowerCase();
    
    // Check spam words
    const foundSpam = spamWords.filter(word => content.includes(word));
    if (foundSpam.length > 0) {
        return { isSpam: true, reason: `Avoid: ${foundSpam.slice(0,3).join(', ')}` };
    }

    // Check ALL CAPS
    if (subject === subject.toUpperCase()) {
        return { isSpam: true, reason: 'No ALL CAPS in subject' };
    }

    // Check excessive punctuation
    if ((subject.match(/!/g) || []).length > 1) {
        return { isSpam: true, reason: 'Too many ! marks' };
    }

    return { isSpam: false };
}

// 🎯 INBOX OPTIMIZED EMAIL CREATION
function createInboxOptimizedEmail(subject, body, recipient, senderName) {
    const name = extractName(recipient);
    
    // Natural subject
    let naturalSubject = subject;
    const prefixes = ['', 'Update:', 'Quick:', 'Following up:'];
    naturalSubject = `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${subject}`.trim();

    // Natural body
    const greetings = ['Hi', 'Hello', 'Hey'];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    
    let naturalBody = `${greeting}${name ? ' ' + name : ''},\n\n`;
    naturalBody += `I hope you're doing well.\n\n`;
    naturalBody += `${body}\n\n`;
    naturalBody += `Best regards,\n${senderName}`;

    return {
        subject: naturalSubject,
        text: naturalBody,
        html: naturalBody.replace(/\n/g, '<br>')
    };
}

function extractName(email) {
    const username = email.split('@')[0];
    return username.replace(/[0-9._-]/g, ' ')
        .split(' ')[0]
        .charAt(0).toUpperCase() + 
        username.replace(/[0-9._-]/g, ' ')
        .split(' ')[0]
        .slice(1).toLowerCase();
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🛡️  SPAM PROTECTION: ACTIVE`);
    console.log(`🎯 INBOX DELIVERY: OPTIMIZED`);
});
