from flask import Flask, render_template, request, redirect, session, flash, jsonify
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
import os, time

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "default_secret")

@app.route('/')
def home():
    return redirect('/launcher')

@app.route('/launcher', methods=['GET'])
def launcher():
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
            msg = MIMEMultipart()
            msg['From'] = f"{sender_name} <{sender_email}>"
            msg['To'] = to_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))

            with smtplib.SMTP('smtp.gmail.com', 587) as server:
                server.starttls()
                server.login(sender_email, sender_pass)
                server.send_message(msg)
            
            success += 1
            time.sleep(1)  # slight delay to avoid spam filters
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
