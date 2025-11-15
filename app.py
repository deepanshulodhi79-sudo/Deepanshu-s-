from flask import Flask, render_template, request, jsonify
import smtplib
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

app = Flask(__name__)

# ===============================
# 🔥 Gmail SMTP CONFIG
# ===============================
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
YOUR_EMAIL = "yourgmail@gmail.com"
YOUR_PASSWORD = "your_app_password"   # Gmail App Password

# ===============================
# 🔥 Home Page
# ===============================
@app.route('/')
def index():
    return render_template("dashboard.html")

# ===============================
# 🔥 SEND MAIL API
# ===============================
@app.route('/send-mails', methods=['POST'])
def send_mails():
    data = request.json
    
    subject = data.get("subject")
    message = data.get("message")
    email_list_raw = data.get("emails")

    # Convert line-by-line emails into list
    email_list = [email.strip() for email in email_list_raw.split("\n") if email.strip()]

    sent_count = 0
    failed = []

    # Gmail SMTP Session
    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(YOUR_EMAIL, YOUR_PASSWORD)
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)})

    # ===============================
    # 🔥 Send Mails Loop
    # ===============================
    for email in email_list:
        try:
            msg = MIMEMultipart()
            msg["From"] = YOUR_EMAIL
            msg["To"] = email
            msg["Subject"] = subject

            msg.attach(MIMEText(message, "html"))

            server.sendmail(YOUR_EMAIL, email, msg.as_string())
            sent_count += 1

            time.sleep(0.1)  # SUPER FAST SENDING

        except Exception as e:
            failed.append(email)

    server.quit()

    # Return result
    return jsonify({
        "status": "success",
        "sent": sent_count,
        "failed": failed
    })


# ===============================
# Run App
# ===============================
if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)
