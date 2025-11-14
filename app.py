from flask import Flask, render_template, request, redirect, session, jsonify
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formatdate, make_msgid
import os, time, random

app = Flask(__name__)
app.secret_key = "SUPERSECRET123"

ADMIN_USER = "admin"
ADMIN_PASS = "12345"

# -------------------------------------------
# SUBJECTS (Inbox-safe)
# -------------------------------------------
subjects = [
    "Quick Note",
    "Small Update",
    "Short Insight",
    "Website Check",
    "Simple Review",
    "Little Feedback"
]

# -------------------------------------------
# SAFE ROTATION—SEO feel but spam-proof
# -------------------------------------------
openers = [
    "I checked your website today",
    "I had a look at your online presence",
    "I reviewed your website briefly",
    "I came across your site recently",
    "I visited your website earlier"
]

middle_lines = [
    "and noticed a small area that might help its online visibility.",
    "and found a tiny detail that may improve its appearance online.",
    "and noticed one minor thing that could refine the online look.",
    "and saw something small that may enhance how it is seen online."
]

closers = [
    "Would you like a short overview?",
    "Should I share a quick outline?",
    "Want a brief version of what I found?",
    "Shall I send a small summary?",
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

    # Convert comma list to array
    recipients_list = [i.strip() for i in recipients.split(",") if i.strip()]

    success = 0
    fail = 0

    # Gmail limit safe: 30 per batch
    MAX_BATCH = 30
    selected_recipients = recipients_list[:MAX_BATCH]

    for r in selected_recipients:

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

            # Natural delay — NOT random (best for inbox)
            time.sleep(0.8)

        except:
            fail += 1

    return jsonify({
        "total_requested": len(recipients_list),
        "sent_this_batch": len(selected_recipients),
        "success": success,
        "failed": fail,
        "status": "completed"
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
