from flask import Flask, render_template, request, redirect, session, jsonify
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formatdate
import time

app = Flask(__name__)
app.secret_key = "SUPERSECRET123"

ADMIN_USER = "admin"
ADMIN_PASS = "12345"


# --------------------------
# HOME → LOGIN REDIRECT
# --------------------------
@app.route('/')
def home():
    if 'logged_in' in session:
        return redirect('/dashboard')
    return redirect('/login')


# --------------------------
# LOGIN PAGE
# --------------------------
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        u = request.form['username']
        p = request.form['password']

        if u == ADMIN_USER and p == ADMIN_PASS:
            session['logged_in'] = True
            return redirect('/dashboard')

        return render_template("login.html", message="Invalid Credentials")

    return render_template("login.html")


# --------------------------
# LOGOUT
# --------------------------
@app.route('/logout')
def logout():
    session.clear()
    return redirect('/login')


# --------------------------
# DASHBOARD PAGE
# --------------------------
@app.route('/dashboard')
def dashboard():
    if 'logged_in' not in session:
        return redirect('/login')
    return render_template("dashboard.html")


# --------------------------
# SEND MAILS (NEW WORKING API)
# --------------------------
@app.route('/send-mails', methods=['POST'])
def send_mails():

    data = request.get_json()

    subject = data["subject"]
    message = data["message"]
    emails_raw = data["emails"]

    # break line by line
    recipients = [i.strip() for i in emails_raw.split("\n") if i.strip()]

    success = 0
    fail = 0

    for r in recipients:
        try:
            msg = MIMEMultipart()
            msg['From'] = "Your Name <your@gmail.com>"
            msg['To'] = r
            msg['Subject'] = subject
            msg['Date'] = formatdate(localtime=True)

            msg.attach(MIMEText(message, "plain"))

            with smtplib.SMTP("smtp.gmail.com", 587) as s:
                s.starttls()
                s.login("your@gmail.com", "your_app_password")
                s.send_message(msg)

            success += 1
            time.sleep(0.1)   # ultra fast

        except Exception as e:
            print("Error:", e)
            fail += 1

    return jsonify({
        "status": "success",
        "total": len(recipients),
        "success": success,
        "failed": fail
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
