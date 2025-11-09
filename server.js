require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// 🔑 Hardcoded login
const HARD_USERNAME = "Yatendra Rajput";
const HARD_PASSWORD = "Yattu@882";

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'bulk-mailer-secret',
  resave: false,
  saveUninitialized: true
}));

// 🔒 Auth middleware
function requireAuth(req, res, next) {
  if (req.session.user) return next();
  return res.redirect('/');
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === HARD_USERNAME && password === HARD_PASSWORD) {
    req.session.user = username;
    return res.json({ success: true });
  }
  return res.json({ success: false, message: "❌ Invalid credentials" });
});

app.get('/launcher', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'launcher.html'));
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    return res.json({ success: true });
  });
});

// Helper function for delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ✅ Content optimization to avoid spam
function optimizeContent(subject, message, recipient) {
  // Extract name from email for personalization
  const name = recipient.split('@')[0].replace(/[0-9._-]/g, ' ').split(' ')[0];
  const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
  
  // Transform subject to look natural
  let optimizedSubject = subject;
  if (!subject.toLowerCase().includes('re:') && !subject.toLowerCase().includes('fwd:')) {
    const naturalPrefixes = ['', 'Update:', 'Quick:', 'Following up:', ''];
    optimizedSubject = `${naturalPrefixes[Math.floor(Math.random() * naturalPrefixes.length)]} ${subject}`.trim();
  }
  
  // Transform message to look personal
  const greetings = ['Hi', 'Hello', 'Hey', 'Dear'];
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  
  const optimizedMessage = `${greeting}${capitalizedName ? ' ' + capitalizedName : ''},\n\n${message}\n\nBest regards,\n${capitalizedName ? capitalizedName : 'Team'}`;
  
  return {
    subject: optimizedSubject,
    message: optimizedMessage
  };
}

// ✅ Spam detection and prevention
function checkForSpamContent(subject, message) {
  const spamTriggers = [
    'free', 'winner', 'prize', 'cash', 'money', 'urgent', 'important',
    'act now', 'limited time', 'buy now', 'click here', 'discount',
    'offer', 'deal', 'win', 'won', 'congratulations', 'guaranteed',
    'risk free', 'special promotion', '!!!', '$$$', '100% free',
    'million', 'billion', 'viagra', 'casino', 'lottery', 'loan'
  ];
  
  const content = (subject + ' ' + message).toLowerCase();
  
  const foundTriggers = spamTriggers.filter(trigger => content.includes(trigger));
  if (foundTriggers.length > 0) {
    return {
      isSpam: true,
      triggers: foundTriggers.slice(0, 3)
    };
  }
  
  // Check for excessive capitalization
  const capitalRatio = (subject.match(/[A-Z]/g) || []).length / subject.length;
  if (capitalRatio > 0.6) {
    return { isSpam: true, reason: 'Too many capital letters' };
  }
  
  return { isSpam: false };
}

// ✅ Improved email sending with spam protection
app.post('/send', requireAuth, async (req, res) => {
  try {
    const { senderName, email, password, recipients, subject, message } = req.body;
    
    if (!email || !password || !recipients) {
      return res.json({ success: false, message: "Email, password and recipients required" });
    }

    const recipientList = recipients
      .split(/[\n,]+/)
      .map(r => r.trim())
      .filter(r => r);

    if (recipientList.length === 0) {
      return res.json({ success: false, message: "No valid recipients" });
    }

    // ✅ Check for spam content
    const spamCheck = checkForSpamContent(subject, message);
    if (spamCheck.isSpam) {
      return res.json({ 
        success: false, 
        message: `Content looks like spam. Avoid: ${spamCheck.triggers ? spamCheck.triggers.join(', ') : spamCheck.reason}` 
      });
    }

    // ✅ Improved transporter configuration
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { 
        user: email, 
        pass: password 
      },
      // Better settings for deliverability
      pool: true,
      maxConnections: 3,
      rateDelta: 2000,
      rateLimit: 3
    });

    // Verify SMTP connection
    try {
      await transporter.verify();
      console.log('✅ SMTP connection verified');
    } catch (error) {
      console.error('❌ SMTP verification failed:', error);
      return res.json({ 
        success: false, 
        message: 'SMTP authentication failed. Please check your email and app password.' 
      });
    }

    const results = [];
    let successfulSends = 0;
    let failedSends = 0;

    // ✅ Send emails with better pacing and personalization
    for (let i = 0; i < recipientList.length; i++) {
      const recipient = recipientList[i];
      
      try {
        // Optimize content for each recipient
        const optimizedContent = optimizeContent(subject, message, recipient);
        
        const mailOptions = {
          from: `"${senderName || 'Team'}" <${email}>`,
          to: recipient,
          subject: optimizedContent.subject,
          text: optimizedContent.message,
          html: optimizedContent.message.replace(/\n/g, '<br>'),
          // Important headers for deliverability
          headers: {
            'X-Priority': '3',
            'X-MSMail-Priority': 'Normal',
            'Importance': 'Normal'
          }
        };

        await transporter.sendMail(mailOptions);
        successfulSends++;
        results.push({ recipient, status: 'success' });
        console.log(`✅ Email sent to: ${recipient}`);

        // ✅ Better pacing - 2-4 seconds between emails
        if (i < recipientList.length - 1) {
          const delayTime = Math.floor(Math.random() * 2000) + 2000; // 2-4 seconds
          await delay(delayTime);
        }

      } catch (error) {
        failedSends++;
        results.push({ recipient, status: 'error', error: error.message });
        console.error(`❌ Failed to send to ${recipient}:`, error.message);
        
        // Longer delay on error
        await delay(5000);
      }
    }

    return res.json({ 
      success: true, 
      message: `✅ ${successfulSends} emails sent successfully, ${failedSends} failed`,
      results: results
    });

  } catch (err) {
    console.error("Send error:", err);
    return res.json({ 
      success: false, 
      message: `Server error: ${err.message}` 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Bulk Mailer is running',
    features: 'Spam protection enabled'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Bulk Mailer running on port ${PORT}`);
  console.log(`🎯 Spam protection: ACTIVE`);
  console.log(`📧 Content optimization: ENABLED`);
});
