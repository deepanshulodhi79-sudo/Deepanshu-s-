from flask import Flask, render_template, request, redirect, session, jsonify
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formatdate, make_msgid
import time

app = Flask(__name__)
app.secret_key = "SUPERSECRET123"

ADMIN_USER = "admin"
ADMIN_PASS = "12345"


@app.route('/')
def home():
    if 'logged_in' in session:
        return redirect('/dashboard')
    return redirect('/login')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == "POST":
        if request.form['username'] == ADMIN_USER and request.form['password'] == ADMIN_PASS:
            session['logged_in'] = True
            return redirect('/dashboard')
        return render_template("login.html", message="Invalid credentials")
    return render_template("login.html")


@app.route('/logout')
def logout():
    session.clear()
    return redirect('/login')


@app.route('/dashboard')
def dashboard():
    if 'logged_in' not in session:
        return redirect('/login')
    return render_template("dashboard.html")


# ------------------------------
# MAIL SENDER (CUSTOM SUBJECT + MESSAGE)
# ------------------------------

@app.route('/send-mails', methods=['POST'])
def send_mails():
    data = request.get_json()

    sender_name  = "Sender"
    sender_email = data.get("email")
    sender_pass  = data.get("password")

    subject = data.get("subject")
    message = data.get("message")

    raw = data.get("emails", "")
    recipients = [i.strip() for i in raw.split("\n") if i.strip()]

    success = 0
    failed = 0

    for r in recipients:
        try:
            msg = MIMEMultipart()
            msg['From'] = f"{sender_name} <{sender_email}>"
            msg['To'] = r
            msg['Subject'] = subject
            msg['Message-ID'] = make_msgid()
            msg['Date'] = formatdate(localtime=True)
            msg.attach(MIMEText(message, "plain", "utf-8"))

            with smtplib.SMTP('smtp.gmail.com', 587) as s:
                s.starttls()
                s.login(sender_email, sender_pass)
                s.send_message(msg)

            success += 1
            time.sleep(0.2)

        except:
            failed += 1

    return jsonify({
        "total": len(recipients),
        "success": success,
        "failed": failed
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
