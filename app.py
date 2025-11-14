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

ADMIN_USER = "admin"
ADMIN_PASS = "12345"

@app.route('/')
def home():
    if 'logged_in' in session:
        return redirect('/launcher')
    return redirect('/login')

@app.route('/login', methods=['GET','POST'])
def login():
    if request.method == 'POST':
        if request.form['username'] == ADMIN_USER and request.form['password'] == ADMIN_PASS:
            session['logged_in'] = True
            return redirect('/launcher')
        return render_template('login.html', message="❌ Wrong Username or Password")
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/login')

@app.route('/launcher')
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

    recipients_list = [x.strip() for x in recipients.replace("\n", ",").split(",") if x.strip()]
    success, failed = 0, 0

    for to_email in recipients_list:
        try:
            msg = MIMEMultipart()
            msg['From'] = f"{sender_name} <{sender_email}>"
            msg['To'] = to_email
            msg['Subject'] = subject
            msg['Reply-To'] = sender_email
            msg['Message-ID'] = make_msgid()
            msg['Date'] = formatdate(localtime=True)
            msg.attach(MIMEText(body, 'plain', 'utf-8'))

            with smtplib.SMTP("smtp.gmail.com", 587) as server:
                server.starttls()
                server.login(sender_email, sender_pass)
                server.send_message(msg)

            success += 1
            time.sleep(1.5)

        except:
            failed += 1

    return jsonify({
        "total": len(recipients_list),
        "success": success,
        "failed": failed
    })

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=10000)
