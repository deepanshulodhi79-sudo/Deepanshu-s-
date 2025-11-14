from flask import Flask, render_template, request, redirect, session, jsonify
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formatdate, make_msgid
from dotenv import load_dotenv
import os, time

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "default_secret")

# 🔐 Hardcoded login credentials
ADMIN_USER = "admin"
ADMIN_PASS = "12345"  # change as needed

@app.route('/')
def home():
    if 'logged_in' in session:
        return redirect('/launcher')
    return redirect('/login')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        if username == ADMIN_USER and password == ADMIN_PASS:
            session['logged_in'] = True
            return redirect('/launcher')
        else:
            return render_template('login.html', message="Invalid username or password")
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    return redirect('/login')

@app.route('/launcher', methods=['GET'])
def launcher():
    if 'logged_in' not in session:
        return redirect('/login')
    return render_template('dashboard.html')

@app.route('/send', methods=['POST'])
def send_email():
    sender_name = request.form['sender_name']
    sender_email = request.form['sender_email']
    sender_pass = request.form['sender_pass']
    subject = request.form['subject']
    body = request.form['body']
    recipients = request.form['recipients']

    recipients_list = [r.strip() for r in recipients.replace("\n", ",").split(",") if r.strip()]
    success = 0
    failed = 0

    for to_email in recipients_list:
        try:
            # SPAM SAFE EMAIL FORMAT
            msg = MIMEMultipart()
            msg['From'] = f"{sender_name} <{sender_email}>"
            msg['To'] = to_email
            msg['Subject'] = subject.encode('utf-8').decode()
            msg['Reply-To'] = sender_email
            msg['Message-ID'] = make_msgid()
            msg['Date'] = formatdate(localtime=True)
            msg['Content-Language'] = 'en-US'

            # Plain text body
            msg.attach(MIMEText(body, 'plain', 'utf-8'))

            # Gmail SMTP (anti-spam optimized)
            with smtplib.SMTP('smtp.gmail.com', 587) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(sender_email, sender_pass)
                server.send_message(msg)

            success += 1

            # BEST anti-spam delay
            time.sleep(2)

        except Exception as e:
            print(f"Failed to send to {to_email}: {e}")
            failed += 1

    return jsonify({
        "success": success,
        "failed": failed,
        "total": len(recipients_list)
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000)
