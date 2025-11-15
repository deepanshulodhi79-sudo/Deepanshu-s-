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

# ---------------------------------------------------------
# ROUTES
# ---------------------------------------------------------

@app.route('/')
def home():
    if 'logged_in' in session:
        return redirect('/dashboard')
    return redirect('/login')


@app.route('/login', methods=['GET', 'POST'])
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


# ---------------------------------------------------------
# EMAIL SENDING ENGINE (Manual Subject + Manual Message)
# ---------------------------------------------------------

@app.route('/send', methods=['POST'])
def send_email():

    sender_name   = request.form['sender_name']
    sender_email  = request.form['sender_email']
    sender_pass   = request.form['sender_pass']
    subject       = request.form['subject']       # manual subject
    body_template = request.form['message_body']  # manual message
    recipients    = request.form['recipients']

    # line-by-line + comma support
    raw = recipients.replace("\r", "").replace("\n", ",")
    emails = [i.strip() for i in raw.split(",") if i.strip()]

    success = 0
    failed = 0
    send_times = []

    for r in emails:

        start_time = time.time()

        try:
            msg = MIMEMultipart()
            msg['From'] = f"{sender_name} <{sender_email}>"
            msg['To'] = r
            msg['Subject'] = subject
            msg['Date'] = formatdate(localtime=True)
            msg['Message-ID'] = make_msgid()

            # message as user typed
            msg.attach(MIMEText(body_template, "plain", "utf-8"))

            with smtplib.SMTP('smtp.gmail.com', 587) as s:
                s.starttls()
                s.login(sender_email, sender_pass)
                s.send_message(msg)

            success += 1

            # SUPER FAST (0.1 sec)
            time.sleep(0.1)

        except Exception as e:
            print("Error:", e)
            failed += 1

        finally:
            end_time = time.time()
            send_times.append(round(end_time - start_time, 2))

    return jsonify({
        "total": len(emails),
        "success": success,
        "failed": failed,
        "times": send_times
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
