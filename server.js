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

// 🎯 SEO & BUSINESS FRIENDLY EMAIL SENDING
app.post('/send-emails', async (req, res) => {
    try {
        const { senderName, gmailAccount, appPassword, subject, messageBody, recipients } = req.body;

        // Validation
        if (!senderName || !gmailAccount || !appPassword || !subject || !messageBody || !recipients) {
            return res.json({ success: false, message: "All fields required" });
        }

        // 🛡️ SMART SPAM CHECK (SEO & Business Friendly)
        const spamResult = checkForSpamSmart(subject, messageBody);
        if (spamResult.isSpam) {
            return res.json({ 
                success: false, 
                message: `Content issue: ${spamResult.reason}` 
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
        
        if (recipientList.length === 0) {
            return res.json({ success: false, message: "No valid recipients" });
        }

        const results = [];
        let successCount = 0;

        // Send emails
        for (let i = 0; i < recipientList.length; i++) {
            const recipient = recipientList[i];
            
            try {
                // 🎯 BUSINESS OPTIMIZED CONTENT
                const optimizedContent = createBusinessEmail(subject, messageBody, recipient, senderName);
                
                const mailOptions = {
                    from: `"${senderName}" <${gmailAccount}>`,
                    to: recipient,
                    subject: optimizedContent.subject,
                    text: optimizedContent.text,
                    html: optimizedContent.html,
                    headers: {
                        'X-Priority': '3',
                        'Importance': 'Normal'
                    }
                };

                await transporter.sendMail(mailOptions);
                successCount++;
                results.push({ recipient, status: 'success' });
                console.log(`✅ Sent to: ${recipient}`);

                // Professional delay
                if (i < recipientList.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

            } catch (error) {
                results.push({ recipient, status: 'error', error: error.message });
                console.log(`❌ Failed: ${recipient}`);
            }
        }

        res.json({ 
            success: true, 
            message: `✅ ${successCount} emails sent successfully`,
            results 
        });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// 🛡️ SMART SPAM DETECTION (SEO & Business Friendly)
function checkForSpamSmart(subject, body) {
    // HIGH-RISK SPAM WORDS (Block these)
    const highRiskWords = [
        'free', 'winner', 'prize', 'cash', 'money', 'urgent!!!', 'important!!!',
        'act now', 'limited time', 'buy now', 'click here', 'discount',
        'offer!!!', 'deal!!!', 'won!!!', 'congratulations!!!', 'guaranteed!!!',
        'risk free', 'special promotion', '$$$', '100% free', 'million', 'billion',
        'viagra', 'casino', 'lottery', 'loan', 'credit!!!', 'debt!!!', 'insurance!!!',
        'investment!!!', 'profit!!!', 'rich!!!', 'work from home', 'make money',
        'earn money', 'extra income', 'apply now', 'call now', 'click below',
        'subscribe!!!', 'unsubscribe', 'order now', 'shop now', 'buy today'
    ];

    // ALLOWED BUSINESS WORDS (Don't block these)
    const allowedBusinessWords = [
        'win', 'success', 'growth', 'ranking', 'seo', 'search engine',
        'google', 'website', 'traffic', 'visitors', 'clients', 'business',
        'service', 'solution', 'strategy', 'marketing', 'digital', 'online',
        'visibility', 'leads', 'conversion', 'optimization', 'performance',
        'results', 'analytics', 'roi', 'campaign', 'brand', 'engagement'
    ];

    const content = (subject + ' ' + body).toLowerCase();
    
    // Check only HIGH-RISK words
    const foundHighRisk = highRiskWords.filter(word => content.includes(word.toLowerCase()));
    if (foundHighRisk.length > 0) {
        return { isSpam: true, reason: `Avoid aggressive words like: ${foundHighRisk[0]}` };
    }

    // Check ALL CAPS
    if (subject === subject.toUpperCase() && subject.length > 5) {
        return { isSpam: true, reason: 'Avoid ALL CAPS in subject' };
    }

    // Check excessive punctuation
    if ((subject.match(/!/g) || []).length > 2) {
        return { isSpam: true, reason: 'Too many exclamation marks' };
    }

    return { isSpam: false };
}

// 🎯 BUSINESS & SEO FRIENDLY EMAIL CREATION
function createBusinessEmail(subject, body, recipient, senderName) {
    const name = extractName(recipient);
    
    // Professional subject
    let professionalSubject = subject;
    
    // Professional body
    const greetings = ['Hi', 'Hello', 'Dear'];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    
    let professionalBody = `${greeting}${name ? ' ' + name : ''},\n\n`;
    professionalBody += `I hope this message finds you well.\n\n`;
    professionalBody += `${body}\n\n`;
    professionalBody += `Best regards,\n${senderName}`;

    return {
        subject: professionalSubject,
        text: professionalBody,
        html: professionalBody.replace(/\n/g, '<br>')
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
    console.log(`🛡️  SMART SPAM FILTER: ACTIVE`);
    console.log(`📧 SEO & BUSINESS FRIENDLY`);
});
