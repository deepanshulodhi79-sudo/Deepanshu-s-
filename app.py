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
        'subject': "Website Feedback",
        'greeting': "Hello,",
        'closing': "Best regards"
    },
    'technical': {
        'subject': "Technical Observation", 
        'greeting': "Hi there,",
        'closing': "Looking forward to your response"
    },
    'collaboration': {
        'subject': "Quick Question",
        'greeting': "Hi,",
        'closing': "Thanks"
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
    """Email validation check"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def create_natural_email(sender_name, message):
    """Create natural, conversational email content"""
    # Remove bullet points and make it conversational
    clean_message = message.replace('•', '').replace('  ', ' ').strip()
    
    email_content = f"""Hi,

{clean_message}

Would it be okay if I share a screenshot with you via email?

Thanks,
{sender_name}"""
    
    return email_content

def send_single_email(sender_email, sender_name, app_password, receiver_email, subject, message):
    """Single email send karne ka function with natural language"""
    try:
        smtp_server = "smtp.gmail.com"
        port = 587
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = f'"{sender_name}" <{sender_email}>'
        msg['To'] = receiver_email
        msg['Subject'] = Header(subject, 'utf-8').encode()
        
        # Natural headers
        msg['Reply-To'] = sender_email
        msg['X-Mailer'] = 'Microsoft Outlook'
        msg['MIME-Version'] = '1.0'
        msg['Content-Type'] = 'text/plain; charset="utf-8"'
        
        # Natural email body
        natural_body = create_natural_email(sender_name, message)
        msg.attach(MIMEText(natural_body, 'plain', 'utf-8'))
        
        # SMTP connection
        server = smtplib.SMTP(smtp_server, port, timeout=30)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(sender_email, app_password)
        
        # Send email
        server.sendmail(sender_email, [receiver_email], msg.as_string())
        server.quit()
        
        return True, "Email sent successfully"
        
    except smtplib.SMTPDataError as e:
        return False, "Daily limit exceeded. Try again tomorrow."
    except smtplib.SMTPRecipientsRefused:
        return False, "Invalid email address"
    except smtplib.SMTPAuthenticationError:
        return False, "Authentication failed - check app password"
    except Exception as e:
        return False, f"Failed to send: {str(e)}"

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
        
        # Validate sender email
        if not is_valid_email(sender_email):
            return jsonify({'success': False, 'message': 'Please use a valid sender email'})
        
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
        valid_emails = valid_emails[:5]  # Small batch for testing
        
        if len(valid_emails) == 0:
            return jsonify({'success': False, 'message': 'No valid email addresses found!'})
        
        results = []
        successful_count = 0
        
        # Send emails
        for i, receiver_email in enumerate(valid_emails):
            # Small delay between emails
            if i > 0:
                time.sleep(5)
            
            success, msg = send_single_email(
                sender_email, sender_name, app_password, 
                receiver_email, subject, message
            )
            
            if success:
                successful_count += 1
                results.append(f"✅ {receiver_email}: Sent")
            else:
                results.append(f"❌ {receiver_email}: {msg}")
        
        success_rate = (successful_count / len(valid_emails)) * 100 if valid_emails else 0
        
        return jsonify({
            'success': successful_count > 0, 
            'message': f'📨 {successful_count}/{len(valid_emails)} emails sent',
            'details': results,
            'total_sent': successful_count,
            'total_attempted': len(valid_emails),
            'success_rate': success_rate
        })
        
    except Exception as e:
        return jsonify({
            'success': False, 
            'message': f'Error: Please try again'
        })

@app.route('/api/templates')
@login_required
def get_templates():
    return jsonify({'templates': PROFESSIONAL_TEMPLATES})

@app.route('/api/health')
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
