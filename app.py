import os
from flask import Flask, render_template, request, flash, redirect, url_for, session
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Personalization, To
from dotenv import load_dotenv

load_dotenv()  # Load environment variables

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'your_secret_key_here')  # Set a strong secret
SENDGRID_API_KEY = os.getenv('SENDGRID_API_KEY')
VERIFIED_SENDER = os.getenv('VERIFIED_SENDER')  # Your verified SendGrid sender email

# Simple user credentials (replace with your own; for production, use a database)
USERS = {'admin': 'password123'}  # Username: password

@app.route('/', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        if username in USERS and USERS[username] == password:
            session['logged_in'] = True
            return redirect(url_for('launcher'))
        else:
            flash('Invalid credentials. Try again.')
    return render_template('login.html')

@app.route('/launcher', methods=['GET', 'POST'])
def launcher():
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    
    if request.method == 'POST':
        sender_name = request.form['sender_name']
        subject = request.form['subject']
        body = request.form['body']  # Supports HTML for better emails
        recipients_str = request.form['recipients']
        recipients = [r.strip() for r in recipients_str.replace('\n', ',').split(',') if r.strip()]
        
        if len(recipients) > 27:  # Your limit; adjust as needed
            flash('Limited to 27 recipients to avoid spam flags. Upgrade SendGrid plan for more.')
            return redirect(url_for('launcher'))
        
        try:
            sg = SendGridAPIClient(SENDGRID_API_KEY)
            message = Mail(
                from_email=VERIFIED_SENDER,
                subject=subject,
                html_content=body
            )
            for recipient in recipients:
                personalization = Personalization()
                personalization.add_to(To(recipient, name=sender_name))  # Personalize with name if needed
                message.add_personalization(personalization)
            
            # Anti-spam headers
            message.add_header('List-Unsubscribe', f'<mailto:unsubscribe@{VERIFIED_SENDER.split("@")[1]}>')
            message.asm = {'group_id': 1}  # Use SendGrid suppression group for unsubscribes
            
            response = sg.send(message)
            if response.status_code != 202:
                raise Exception('Send failed.')
            flash(f'{len(recipient)} emails sent successfully!')
        except Exception as e:
            flash(f'Error: {str(e)}')
        return redirect(url_for('launcher'))
    
    return render_template('launcher.html')

@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(debug=True)
