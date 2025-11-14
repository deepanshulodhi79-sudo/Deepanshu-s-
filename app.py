from flask import Flask, render_template, request, redirect, session, jsonify
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formatdate, make_msgid
import os, time, random

app = Flask(__name__)
app.secret_key = "SUPERSECRET123"   # Change on Render ENV

ADMIN_USER = "admin"
ADMIN_PASS = "12345"

# -------------------------------------------
# SUBJECTS (2–3 words, inbox-safe, no spam triggers)
# -------------------------------------------

subjects = [
    "Quick Note",
    "Small Update",
    "Short Insight",
    "Tiny Suggestion",
    "Website Check",
    "Simple Review",
    "Small Observation",
    "Little Feedback"
]

# -------------------------------------------
# SAFE EMAIL ROTATIONS (SEO vibe but ZERO spam words)
# -------------------------------------------

openers = [
    "I visited your website recently",
    "I checked your online presence today",
    "I spent a moment reviewing your site",
    "I came across your website earlier",
    "I looked over your website briefly"
]

middle_lines = [
    "and noticed one small thing that might help its online visibility.",
    "and saw a tiny point that could make the site appear better online.",
    "and found a minor detail that may improve how it is seen on the web.",
    "and noticed something small that could refine its online appearance.",
    "and found a little area that might enhance how it shows up online."
]

closers = [
    "Would you like me to share a short overview?",
    "Should I send a quick outline?",
    "Want a brief version of what I found?",
    "Shall I share a small summary?",
    "Should I send the details in short?"
]

# -------------------------------------------

@app.route('/')
def home():
    if 'logged_in' in session:
        return redirect('/dashboard')
    return redirect('/login')

@app.route('/login', methods=['GET','POST'])
def login():
    if request.method == "POST":
        u = request.form['username']
        p = request.form['password']
        if u == ADMIN_USER and p == ADMIN_PASS:
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

@app.route('/send', methods=['POST'])
def send_email():
    sender_name  = request.form['sender_name']
    sender_email = request.form['sender_email']
    sender_pass  = request.form['sender_pass']
    recipients   = request.form['recipients']

    recipients_list = [i.strip() for i in recipients.split(",") if i.strip()]

    success = 0
    fail = 0

    for r in recipients_list:

        subject = random.choice(subjects)

        body = (
            random.choice(openers)
            + ", "
            + random.choice(middle_lines)
            + "\n\n"
            + random.choice(closers)
        )

        try:
            msg = MIMEMultipart()
            msg['From'] = f"{sender_name} <{sender_email}>"
            msg['To'] = r
            msg['Subject'] = subject
            msg['Message-ID'] = make_msgid()
            msg['Date'] = formatdate(localtime=True)

            msg.attach(MIMEText(body, "plain", "utf-8"))

            with smtplib.SMTP('smtp.gmail.com', 587) as s:
                s.starttls()
                s.login(sender_email, sender_pass)
                s.send_message(msg)

            success += 1
            time.sleep(1)  # safe natural delay

        except Exception as e:
            print("Error:", e)
            fail += 1

    return jsonify({
        "total": len(recipients_list),
        "success": success,
        "failed": fail
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
