from flask import Flask, render_template, request, redirect, session, jsonify
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formatdate, make_msgid
import time

app = Flask(__name__)
app.secret_key = "SUPERSECRET123"

# -------------------------
# LOGIN DETAILS
# -------------------------
ADMIN_USER = "admin"
ADMIN_PASS = "12345"


# -------------------------
# HOME → LOGIN
# -------------------------
@app.route('/')
def home():
    return redirect('/login')


# -------------------------
# LOGIN PAGE
# -------------------------
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == "POST":
        if request.form.get("username") == ADMIN_USER and request.form.get("password") == ADMIN_PASS:
            session['logged_in'] = True
            return redirect('/dashboard')
        else:
            return render_template("login.html", message="Invalid Login")

    return render_template("login.html")


# -------------------------
# LOGOUT
# -------------------------
@app.route('/logout')
def logout():
    session.clear()
    return redirect('/login')


# -------------------------
# DASHBOARD (Old Design)
# -------------------------
@app.route('/dashboard')
def dashboard():
    if "logged_in" not in session:
        return redirect('/login')
    return render_template("dashboard.html")


# -------------------------
# SEND EMAILS
# -------------------------
@app.route('/send', methods=['POST'])
def send_email():
    if "logged_in" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()

    sender_name = data.get("sender_name")
    sender_email = data.get("sender_email")
    sender_pass = data.get("sender_pass")
    subject = data.get("subject")
    message = data.get("message")
    recipients = data.get("recipients")

    # clean emails
    raw = recipients.replace("\r", "").replace("\n", ",")
    emails = [e.strip() for e in raw.split(",") if len(e.strip()) > 3]

    success = 0
    failed = 0

    for r in emails:
        try:
            msg = MIMEMultipart()
            msg['From'] = f"{sender_name} <{sender_email}>"
            msg['To'] = r
            msg['Subject'] = subject
            msg['Message-ID'] = make_msgid()
            msg['Date'] = formatdate(localtime=True)
            msg.attach(MIMEText(message, "plain", "utf-8"))

            with smtplib.SMTP("smtp.gmail.com", 587) as s:
                s.starttls()
                s.login(sender_email, sender_pass)
                s.send_message(msg)

            success += 1
            time.sleep(0.1)  # super fast 10 emails/sec

        except Exception as e:
            print("ERROR:", e)
            failed += 1

    return jsonify({
        "total": len(emails),
        "success": success,
        "failed": failed
    })


# -------------------------
# RUN SERVER
# -------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
