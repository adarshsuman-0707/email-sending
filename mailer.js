const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendOtpEmail(email, otp) {
  return transporter.sendMail({
    from: `"DSVP" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Verify your DSVP account",
    text: `Your DSVP verification OTP is ${otp}.`,
  });
}

async function sendMail({ to, subject, text, html, cc, bcc }) {
  return transporter.sendMail({
    from: `"DSVP" <${process.env.SMTP_USER}>`,
    to,
    cc,
    bcc,
    subject,
    text,
    html,
  });
}

module.exports = { transporter, sendOtpEmail, sendMail };
