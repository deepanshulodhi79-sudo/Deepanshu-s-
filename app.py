from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import logging
from functools import wraps

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-here-12345')

# Hardcoded Login Credentials (In production, use environment variables)
HARDCODED_CREDENTIALS = {
    'admin': 'admin123',
    'user': 'user123',
    'emailuser': 'password123'
}

# Login required decorator
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
        
        # Check hardcoded credentials
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

@app.route('/send_email', methods=['POST'])
@login_required
def send_email():
    try:
        # Get form data
        sender_email = request.form['sender_email']
        app_password = request.form['app_password']
        receiver_email = request.form['receiver_email']
        subject = request.form['subject']
        message = request.form['message']
        
        # Validate required fields
        if not all([sender_email, app_password, receiver_email, subject, message]):
            return jsonify({'success': False, 'message': 'All fields are required!'})
        
        # Gmail SMTP settings
        smtp_server = "smtp.gmail.com"
        port = 587
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = receiver_email
        msg['Subject'] = subject
        msg.attach(MIMEText(message, 'plain'))
        
        # Connect to SMTP server and send email
        server = smtplib.SMTP(smtp_server, port)
        server.starttls()
        server.login(sender_email, app_password)
        
        text = msg.as_string()
        server.sendmail(sender_email, receiver_email, text)
        server.quit()
        
        # Log the email sending activity
        app.logger.info(f"Email sent from {sender_email} to {receiver_email} by user {session['username']}")
        
        return jsonify({
            'success': True, 
            'message': 'Email successfully sent!'
        })
        
    except smtplib.SMTPAuthenticationError:
        return jsonify({
            'success': False, 
            'message': 'Authentication failed! Check your email and app password.'
        })
    except Exception as e:
        app.logger.error(f"Email sending error: {str(e)}")
        return jsonify({
            'success': False, 
            'message': f'Error: {str(e)}'
        })

@app.route('/api/health')
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
