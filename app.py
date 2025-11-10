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

# Professional email templates
PROFESSIONAL_TEMPLATES = {
    'business': {
        'subject': "Business Update and Collaboration",
        'greeting': "Dear Team,",
        'closing': "Best Regards"
    },
    'meeting': {
        'subject': "Meeting Agenda and Discussion Points", 
        'greeting': "Hello Team,",
        'closing': "Looking forward to our discussion"
    },
    'update': {
        'subject': "Project Update and Progress Report",
        'greeting': "Dear Colleagues,",
        'closing': "Thank you for your cooperation"
    },
    'information': {
        'subject': "Important Information Sharing",
        'greeting': "Hello Everyone,",
        'closing': "Best Regards"
    }
}

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
    """Enhanced email validation without DNS"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        return False
    
    # Common disposable email domains (basic check)
    disposable_domains = [
        'tempmail.com', 'throwaway.com', 'fake.com', 'trashmail.com',
        'guerrillamail.com', 'mailinator.com', 'yopmail.com'
    ]
    
    domain = email.split('@')[1].lower()
    if domain in disposable_domains:
        return False
        
    return True

def create_professional_email(sender_name, sender_email, message, template_type='business'):
    """Create professional email content"""
    template = PROFESSIONAL_TEMPLATES[template_type]
    
    email_content = f"""{template['greeting']}

I hope this message finds you well.

{message}

Thank you for your time and consideration.

{template['closing']},
{sender_name}
{sender_email}"""
    
    return email_content

def send_single_email(sender_email, sender_name, app_password, receiver_email, subject, message, template_type='business'):
    """Single email send karne ka function with enterprise-level headers"""
    try:
        # Use different SMTP ports
        smtp_server = "smtp.gmail.com"
        port = 587
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = f'"{sender_name}" <{sender_email}>'
        msg['To'] = receiver_email
        msg['Subject'] = Header(subject, 'utf-8').encode()
        
        # ENTERPRISE LEVEL ANTI-SPAM HEADERS
        msg['Reply-To'] = sender_email
        msg['Return-Path'] = sender_email
        msg['X-Mailer'] = 'Microsoft Office Outlook 16.0'
        msg['X-Priority'] = '3'
        msg['X-MSMail-Priority'] = 'Normal'
        msg['Importance'] = 'Normal'
        msg['MIME-Version'] = '1.0'
        msg['Content-Type'] = 'text/plain; charset="utf-8"'
        msg['Content-Transfer-Encoding'] = '8bit'
        
        # Professional email body
        professional_body = create_professional_email(sender_name, sender_email, message, template_type)
        msg.attach(MIMEText(professional_body, 'plain', 'utf-8'))
        
        # SMTP connection with proper timeout
        server = smtplib.SMTP(smtp_server, port, timeout=30)
        server.set_debuglevel(0)  # No debug output
        
        # Extended EHLO
        server.ehlo()
        server.starttls()
        server.ehlo()
        
        # Login with retry
        server.login(sender_email, app_password)
        
        # Send with proper envelope
        server.sendmail(sender_email, [receiver_email], msg.as_string())
        server.quit()
        
        return True, "Email delivered successfully"
        
    except smtplib.SMTPDataError as e:
        if "Daily sending limit exceeded" in str(e):
            return False, "Daily sending limit exceeded. Try again tomorrow."
        return False, f"SMTP Error: {str(e)}"
    except smtplib.SMTPRecipientsRefused:
        return False, "Recipient email rejected"
    except smtplib.SMTPSenderRefused:
        return False, "Sender email not authorized"
    except smtplib.SMTPAuthenticationError:
        return False, "Authentication failed - check app password"
    except Exception as e:
        return False, f"Delivery failed: {str(e)}"

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
        template_type = request.form.get('template_type', 'business')
        
        # Validate required fields
        if not all([sender_email, sender_name, app_password, receiver_emails, subject, message]):
            return jsonify({'success': False, 'message': 'All fields are required!'})
        
        # Validate sender email format
        if not is_valid_email(sender_email):
            return jsonify({'success': False, 'message': 'Please use a valid sender email address'})
        
        # Process receiver emails
        email_list = []
        for separator in [',', '\n', ';']:
            if separator in receiver_emails:
                email_list = [email.strip() for email in receiver_emails.split(separator) if email.strip()]
                break
        
        if not email_list:
            email_list = [receiver_emails.strip()]
        
        # Validate and limit emails
        valid_emails = [email for email in email_list if is_valid_email(email)]
        valid_emails = valid_emails[:8]  # Reduced for safety
        
        if len(valid_emails) == 0:
            return jsonify({'success': False, 'message': 'No valid email addresses found!'})
        
        # Use professional template subject
        professional_subject = PROFESSIONAL_TEMPLATES[template_type]['subject']
        if subject != professional_subject:
            subject = f"{professional_subject}: {subject}"
        
        results = []
        successful_count = 0
        
        # Send emails with progressive delays
        for i, receiver_email in enumerate(valid_emails):
            # Progressive delay: 15-20 seconds between emails
            if i > 0:
                delay = random.randint(15, 20)
                time.sleep(delay)
            
            success, msg = send_single_email(
                sender_email, sender_name, app_password, 
                receiver_email, subject, message, template_type
            )
            
            if success:
                successful_count += 1
                results.append(f"✅ {receiver_email}: Delivered to inbox")
            else:
                results.append(f"❌ {receiver_email}: {msg}")
            
            # Break if too many failures
            if i >= 3 and successful_count == 0:
                results.append("⚠️ Stopping: Multiple consecutive failures detected")
                break
        
        # Calculate success rate
        success_rate = (successful_count / len(valid_emails)) * 100 if valid_emails else 0
        
        return jsonify({
            'success': True if successful_count > 0 else False, 
            'message': f'📨 {successful_count}/{len(valid_emails)} emails delivered ({success_rate:.1f}% success rate)',
            'details': results,
            'total_sent': successful_count,
            'total_attempted': len(valid_emails),
            'success_rate': success_rate
        })
        
    except Exception as e:
        app.logger.error(f"Email sending error: {str(e)}")
        return jsonify({
            'success': False, 
            'message': f'❌ System error: Please try again later'
        })

@app.route('/api/templates')
@login_required
def get_templates():
    """Get available email templates"""
    return jsonify({'templates': PROFESSIONAL_TEMPLATES})

@app.route('/api/health')
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
