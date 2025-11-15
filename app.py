from flask import Flask, render_template, request, redirect, session
import smtplib
from email.message import EmailMessage
import time

app = Flask(__name__)
app.secret_key = "supersecretkey"

# ---------- LOGIN (FIXED) ----------
@app.route("/", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        user = request.form["username"]
        pwd = request.form["password"]

        if user == "admin" and pwd == "admin123":
            session["user"] = user
            return redirect("/dashboard")
        else:
            return render_template("login.html", error="Invalid login")

    return render_template("login.html")

# ---------- DASHBOARD ----------
@app.route("/dashboard")
def dashboard():
    if "user" not in session:
        return redirect("/")
    return render_template("dashboard.html")

# ---------- SEND MAIL ----------
@app.route("/send_mail", methods=["POST"])
def send_mail():
    if "user" not in session:
        return {"status": "error"}

    subject = request.form["subject"]
    message = request.form["message"]
    emails_raw = request.form["emails"]

    email_list = [e.strip() for e in emails_raw.split("\n") if e.strip()]

    # ---------- SMTP LOGIN ----------
    smtp_user = "yourgmail@gmail.com"
    smtp_pass = "your_app_password"

    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(smtp_user, smtp_pass)

        for email in email_list:
            msg = EmailMessage()
            msg["Subject"] = subject
            msg["From"] = smtp_user
            msg["To"] = email
            msg.set_content(message)

            server.send_message(msg)
            time.sleep(0.1)  # FAST 10–15 sec for 25 mails

        server.quit()
        return {"status": "success"}

    except Exception as e:
        return {"status": "error", "msg": str(e)}

# ---------- LOGOUT ----------
@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")

app.run(host="0.0.0.0", port=10000)
