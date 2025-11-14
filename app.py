from flask import Flask, render_template, request, redirect, session, jsonify
if 'logged_in' not in session:
return jsonify({'error': 'not-authorized'}), 401


sender_name = request.form.get('sender_name','').strip()
sender_email = request.form.get('sender_email','').strip()
sender_pass = request.form.get('sender_pass','').strip()
subject_input = request.form.get('subject','').strip()
body_input = request.form.get('body','').strip()
recipients_raw = request.form.get('recipients','').strip()


if not sender_email or not sender_pass or not recipients_raw:
return jsonify({'error':'missing-fields'}), 400


recipients = [r.strip() for r in re.split('[,\n;]+', recipients_raw) if r.strip()]
recipients = [r for r in recipients if is_valid_email(r)]


total = len(recipients)
success = 0
failed = 0
details = []


# Compose rotated subject/body
for idx, to_email in enumerate(recipients, start=1):
subj, body = compose_rotated_message(subject_input, body_input)


try:
msg = MIMEMultipart()
msg['From'] = f"{sender_name} <{sender_email}>" if sender_name else sender_email
msg['To'] = to_email
msg['Subject'] = subj
msg['Reply-To'] = sender_email
msg['Message-ID'] = make_msgid()
msg['Date'] = formatdate(localtime=True)
msg['Content-Language'] = 'en-US'


msg.attach(MIMEText(body, 'plain', 'utf-8'))


# fast but safe random delay between 0.8 - 1.2 seconds
delay = random.uniform(0.8, 1.2)


with smtplib.SMTP('smtp.gmail.com', 587, timeout=30) as server:
server.ehlo()
server.starttls()
server.ehlo()
server.login(sender_email, sender_pass)
server.send_message(msg)


success += 1
details.append({'email': to_email, 'status': 'sent'})


time.sleep(delay)


except Exception as e:
failed += 1
details.append({'email': to_email, 'status': 'failed', 'error': str(e)})


return jsonify({'total': total, 'success': success, 'failed': failed, 'details': details})


if __name__ == '__main__':
port = int(os.environ.get('PORT', 10000))
app.run(host='0.0.0.0', port=port)
