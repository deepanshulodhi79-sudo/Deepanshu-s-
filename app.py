from flask import Flask, render_template, request, redirect, session, jsonify
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formatdate, make_msgid
import time, random

app = Flask(__name__)
app.secret_key = "SUPERSECRET123"

ADMIN_USER = "admin"
ADMIN_PASS = "12345"

# ---------------------------------------------------------
# 50+ SUPER SAFE SUBJECT LINES (2–4 words)
# ---------------------------------------------------------
subjects = [
    "Quick Website Note",
    "Short Review Update",
    "Small Visibility Check",
    "Brief Site Insight",
    "Tiny Google Check",
    "Website Visibility Tip",
    "Simple Site Update",
    "Short Observation",
    "Quick Visibility Look",
    "Small Review Note",
    "Brief Website Check",
    "Short Google Insight",
    "Simple Visibility Review",
    "Quick Online Update",
    "Small Online Check",
    "Short Improvement Note",
    "Light Website Review",
    "Simple Site Overview",
    "Quick Online Insight",
    "Website Review Point",
    "Short Visibility Point",
    "Small Optimization Hint",
    "Tiny Review Update",
    "Short Summary Note",
    "Simple Review Alert",
    "Small Website Look",
    "Short Online Point",
    "Quick Observation",
    "Simple Insight",
    "Short Site Thought",
    "Website Note",
    "Review Brief",
    "Small Feedback",
    "Tiny Suggestion",
    "Insight Update",
    "Brief Observation",
    "Online Check",
    "Site Review Note",
    "Visibility Check",
    "Short Reminder",
    "Simple Alert",
    "Quick Check",
    "Short Look",
    "Brief Note",
    "Small Review",
    "Tiny Insight",
    "Simple Update",
    "Short Hint",
    "Quick Point"
]

# ---------------------------------------------------------
# YOUR FULL SEO CONTENT (Converted into AI-Rotation Blocks)
# ---------------------------------------------------------

hi_lines = ["Hello", "Hi"]

middle_lines = [
    "Your website is impressive, though it lacks proper visibility in Google search.",
    "Your site looks great, but it’s not appearing clearly on Google.",
    "I reviewed your site—it’s well-designed, but visibility on Google is limited.",
    "Your website is solid, but it doesn’t show up on Google’s 1st page.",
    "Your site is professional, though it’s missing strong Google visibility.",
    "Your website looks good, but it’s not easily found on Google.",
    "I checked your site—it’s appealing, but lacks proper Google visibility.",
    "Your site design is strong, but it’s not visible enough in Google search.",
    "Your website is well-made, but it’s not showing prominently on Google.",
    "Your site looks sharp, but its Google visibility is low.",
    "I noticed your site looks great, but it lacks Google visibility.",
    "Your website is appealing, but it’s not visible on Google’s first page.",
    "Your site is strong, but it’s missing reach in Google search.",
    "I reviewed your site—it’s good, but not appearing on Google.",
    "Your website looks professional, but its Google visibility is limited.",
    "Your site design is clean, but it’s not visible enough online.",
    "I checked your site—it’s impressive, but not showing up on Google.",
    "Your website is solid, but it’s not visible in search results.",
    "Your site looks good, but it’s not easily discoverable on Google.",
    "Your website is appealing, but it’s not visible on Google’s top pages.",
    "Your site is professional, but it’s not appearing prominently on Google.",
    "Your website looks sharp, but its visibility on Google is low.",
    "Your site is well-made, but it’s not visible enough in Google search.",
    "I reviewed your site—it’s appealing, but not showing on Google’s 1st page.",
    "Your website is strong, but it’s not visible in common searches.",
    "Your site looks good, but it’s missing visibility on Google.",
    "Your website is impressive, but it’s not appearing clearly online.",
    "I checked your site—it’s solid, but lacks Google visibility.",
    "Your site is professional, but it’s not visible enough online.",
    "Your website is appealing, but it’s not showing up on Google.",
    "I checked your site—it’s impressive, but visibility is low.",
    "Your site is solid, but it’s not visible in Google search.",
    "Your website looks good, but it’s not appearing prominently.",
    "Your site is professional, but it’s missing visibility on Google.",
    "I noticed your site—it’s appealing, but not visible enough.",
    "Your website is strong, but it’s not showing on Google’s 1st page.",
    "Your site looks sharp, but its visibility is limited.",
    "Your website is appealing, but it’s not visible in search results.",
    "I reviewed your site—it’s good, but not appearing clearly on Google.",
    "Your site is professional, but it’s not visible enough in Google search.",
    "Your website looks impressive, but it’s not showing prominently.",
    "Your site is appealing, but its Google visibility is low."
]

closing_lines = [
    "Can I forward you a quote?",
    "Should I send you a price list?",
    "May I share a quick quote?",
    "Can I email you a price list?",
    "Would you like me to send a quote?",
    "Should I forward you a quick price list?",
    "May I share the details?",
    "Would you like a short overview?",
    "Should I send a small summary?",
    "Can I forward the details?"
]

# ---------------------------------------------------------
# ROUTES
# ---------------------------------------------------------

@app.route('/')
def home():
    if 'logged_in' in session:
        return redirect('/dashboard')
    return redirect('/login')

@app.route('/login', methods=['GET','POST'])
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

# ---------------------------------------------------------
# CORE SENDING ENGINE
# ---------------------------------------------------------

@app.route('/send', methods=['POST'])
def send_email():

    sender_name  = request.form['sender_name']
    sender_email = request.form['sender_email']
    sender_pass  = request.form['sender_pass']
    recipients   = request.form['recipients']

    raw = recipients.replace("\r", "").replace("\n", ",")
    emails = [i.strip() for i in raw.split(",") if i.strip()]

    success = 0
    failed = 0
    send_times = []

    for r in emails:
        start = time.time()

        subject = random.choice(subjects)
        body = f"{random.choice(hi_lines)},\n{random.choice(middle_lines)}\n\n{random.choice(closing_lines)}"

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
            time.sleep(0.3)  # speed optimized

        except:
            failed += 1

        finally:
            send_times.append(round(time.time() - start, 2))

    return jsonify({
        "total": len(emails),
        "success": success,
        "failed": failed,
        "times": send_times
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
