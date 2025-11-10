from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
from datetime import datetime
import logging
from functools import wraps
import time
import re
import random

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-here-12345')

# Hardcoded Login Credentials
HARDCODED_CREDENTIALS = {
    'admin': 'admin123',
    'user': 'user123',
    'emailuser': 'password123'
}

# Advanced Spam Protection
SPAM_KEYWORDS = [
    'free', 'winner', 'prize', 'urgent', 'cash', 'money', 'lottery', 'click here',
    'congratulations', 'won', 'claim', 'limited time', 'act now', 'buy now',
    'discount', 'offer', 'deal', 'bonus', 'reward', 'guaranteed', 'risk free',
    'no cost', 'credit', 'loan', 'investment', 'profit', 'income', 'earn',
    'work from home', 'make money', 'get paid', 'extra income', 'million',
    'billion', 'dollars', 'rupees', '$$$', 'opportunity', 'special promotion',
    'exclusive', 'secret', 'miracle', 'magic', 'instant', 'overnight'
]

# Common professional subjects (for suggestions)
PROFESSIONAL_SUBJECTS = [
    "Meeting Agenda Discussion",
    "Project Update Report", 
    "Team Collaboration Session",
    "Weekly Progress Review",
    "Important Information Sharing",
    "Document Review Required",
    "Follow-up Discussion Points",
    "Planning Session Details"
]

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def home():
    if 'logged_in' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        if username in HARDCODED_CREDENTIALS and HARDCODED_CREDENTIALS[username] == password:
            session['logged_in'] = True
            session['username'] = username
            flash('Login successful!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid credentials!', 'error')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    flash('You have been logged out!', 'info')
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', username=session.get('username'))

def is_valid_email(email):
    """Email validation check"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def contains_spam_content(text):
    """Check if text contains spammy content"""
    if not text:
        return False
    
    text_lower = text.lower()
    
    # Check for spam keywords
    for keyword in SPAM_KEYWORDS:
        if keyword in text_lower:
            return True
    
    # Check for excessive capitalization
    if len(text) > 10:
        upper_count = sum(1 for c in text if c.isupper())
        if upper_count / len(text) > 0.5:  # More than 50% uppercase
            return True
    
    # Check for multiple exclamation marks
    if text.count('!') > 2:
        return True
    
    return False

def get_professional_subject():
    """Get a random professional subject"""
    return random.choice(PROFESSIONAL_SUBJECTS)

def send_single_email(sender_email, sender_name, app_password, receiver_email, subject, message):
    """Single email send karne ka function with advanced anti-spam"""
    try:
        # Gmail SMTP settings
        smtp_server = "smtp.gmail.com"
        port = 587
        
        # Create message with proper encoding
        msg = MIMEMultipart()
        msg['From'] = f'{sender_name} <{sender_email}>'
        msg['To'] = receiver_email
        msg['Subject'] = Header(subject, 'utf-8').encode()
        
        # Advanced Anti-Spam Headers
        msg['Reply-To'] = sender_email
        msg['X-Mailer'] = 'Microsoft Outlook 16.0'
        msg['X-Priority'] = '3'
        msg['X-MSMail-Priority'] = 'Normal'
        msg['Importance'] = 'Normal'
        msg['MIME-Version'] = '1.0'
        msg['Content-Type'] = 'text/plain; charset="utf-8"'
        msg['Content-Transfer-Encoding'] = 'quoted-printable'
        
        # Professional email structure
        professional_message = f"""Dear Recipient,

{message}

Thank you for your attention.

Best Regards,
{sender_name}
{sender_email}"""
        
        msg.attach(MIMEText(professional_message, 'plain', 'utf-8'))
        
        # SMTP connection with proper handshake
        server = smtplib.SMTP(smtp_server, port)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(sender_email, app_password)
        
        # Send email
        text = msg.as_string()
        server.sendmail(sender_email, receiver_email, text)
        server.quit()
        
        return True, "Email sent successfully"
        
    except smtplib.SMTPRecipientsRefused:
        return False, "Invalid recipient email"
    except smtplib.SMTPAuthenticationError:
        return False, "Authentication failed - check email and app password"
    except smtplib.SMTPSenderRefused:
        return False, "Sender email rejected"
    except Exception as e:
        return False, f"Error: {str(e)}"

@app.route('/send_email', methods=['POST'])
@login_required
def send_email():
    try:
        # Get form data
        sender_email = request.form['sender_email']
        sender_name = request.form['sender_name']
        app_password = request.form['app_password']
        receiver_emails = request.form['receiver_email']
        subject = request.form['subject']
        message = request.form['message']
        
        # Validate required fields
        if not all([sender_email, sender_name, app_password, receiver_emails, subject, message]):
            return jsonify({'success': False, 'message': 'All fields are required!'})
        
        # Advanced spam content checking
        spam_checks = [
            contains_spam_content(subject),
            contains_spam_content(message),
            len(subject.strip()) < 5,  # Too short subject
            len(message.strip()) < 20,  # Too short message
            len(subject) > 100,  # Too long subject
        ]
        
        if any(spam_checks):
            suggested_subject = get_professional_subject()
            return jsonify({
                'success': False, 
                'message': 'Content may be marked as spam! Please use professional language.',
                'suggestion': f'Try subject like: "{suggested_subject}"'
            })
        
        # Process multiple emails
        email_list = []
        for separator in [',', '\n', ';']:
            if separator in receiver_emails:
                email_list = [email.strip() for email in receiver_emails.split(separator) if email.strip()]
                break
        
        if not email_list:
            email_list = [receiver_emails.strip()]
        
        # Filter valid emails and limit to 20 for better deliverability
        valid_emails = [email for email in email_list if is_valid_email(email)]
        valid_emails = valid_emails[:20]  # Reduced limit for better delivery
        
        if len(valid_emails) == 0:
            return jsonify({'success': False, 'message': 'Please enter at least one valid email address!'})
        
        # Check if sender email is valid
        if not is_valid_email(sender_email):
            return jsonify({'success': False, 'message': 'Please enter a valid sender email address!'})
        
        results = []
        successful_count = 0
        
        # Send emails with random delays
        for i, receiver_email in enumerate(valid_emails):
            # Random delay between 5-10 seconds to avoid spam detection
            if i > 0:
                delay = random.randint(5, 10)
                time.sleep(delay)
            
            success, msg = send_single_email(
                sender_email, sender_name, app_password, 
                receiver_email, subject, message
            )
            
            if success:
                successful_count += 1
                results.append(f"✅ {receiver_email}: Sent successfully")
            else:
                results.append(f"❌ {receiver_email}: {msg}")
        
        # Log the activity
        app.logger.info(f"Bulk email sent from {sender_name} - {successful_count}/{len(valid_emails)} successful")
        
        return jsonify({
            'success': True, 
            'message': f'✅ {successful_count}/{len(valid_emails)} emails delivered successfully!',
            'details': results,
            'total_sent': successful_count,
            'total_attempted': len(valid_emails)
        })
        
    except Exception as e:
        app.logger.error(f"Email sending error: {str(e)}")
        return jsonify({
            'success': False, 
            'message': f'❌ System Error: {str(e)}'
        })

@app.route('/api/suggest_subject')
@login_required
def suggest_subject():
    """API to get professional subject suggestions"""
    return jsonify({'subject': get_professional_subject()})

@app.route('/api/health')
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
