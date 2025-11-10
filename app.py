from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import logging
from functools import wraps
import time

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-here-12345')

# Hardcoded Login Credentials
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

def send_single_email(sender_email, sender_name, app_password, receiver_email, subject, message):
    """Single email send karne ka function"""
    try:
        # Gmail SMTP settings
        smtp_server = "smtp.gmail.com"
        port = 587
        
        # Create message with sender name
        msg = MIMEMultipart()
        msg['From'] = f'{sender_name} <{sender_email}>'
        msg['To'] = receiver_email
        msg['Subject'] = subject
        
        # Add headers to avoid spam
        msg['Reply-To'] = sender_email
        
        # Clean message without any extra notes
        clean_message = f"""
{message}

---
Best Regards,
{sender_name}
"""
        
        msg.attach(MIMEText(clean_message, 'plain'))
        
        # Connect to SMTP server and send email
        server = smtplib.SMTP(smtp_server, port)
        server.starttls()
        server.login(sender_email, app_password)
        
        text = msg.as_string()
        server.sendmail(sender_email, receiver_email, text)
        server.quit()
        
        return True, "Email sent successfully"
        
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
        
        # Process multiple emails
        email_list = [email.strip() for email in receiver_emails.split(',') if email.strip()]
        email_list = email_list[:30]  # Maximum 30 emails
        
        if len(email_list) == 0:
            return jsonify({'success': False, 'message': 'Please enter at least one valid email address!'})
        
        results = []
        successful_count = 0
        
        for i, receiver_email in enumerate(email_list):
            # Add delay to avoid spam detection
            if i > 0:
                time.sleep(2)  # 2 second delay between emails
            
            success, msg = send_single_email(
                sender_email, sender_name, app_password, 
                receiver_email, subject, message
            )
            
            if success:
                successful_count += 1
                results.append(f"✅ {receiver_email}: Sent successfully")
            else:
                results.append(f"❌ {receiver_email}: Failed - {msg}")
        
        # Log the activity
        app.logger.info(f"Bulk email sent from {sender_name} - {successful_count}/{len(email_list)} successful")
        
        return jsonify({
            'success': True, 
            'message': f'✅ {successful_count}/{len(email_list)} emails sent successfully!',
            'details': results,
            'total_sent': successful_count,
            'total_attempted': len(email_list)
        })
        
    except Exception as e:
        app.logger.error(f"Email sending error: {str(e)}")
        return jsonify({
            'success': False, 
            'message': f'❌ Error: {str(e)}'
        })

@app.route('/api/health')
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
