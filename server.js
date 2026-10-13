require("dotenv").config();
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { transporter, sendMail, sendOtpEmail } = require("./mailer");

const app = express();
app.use(cors());
app.use(express.json());

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// POST /api/send-email
// Body: { to, subject, text?, html?, cc?, bcc? }
app.post("/api/send-email", async (req, res) => {
  const { to, subject, text, html, cc, bcc } = req.body || {};

  if (!to || !subject || (!text && !html)) {
    return res
      .status(400)
      .json({ success: false, message: "to, subject and text or html are required" });
  }
  const recipients = [].concat(to);
  if (!recipients.every((a) => EMAIL_RE.test(a))) {
    return res.status(400).json({ success: false, message: "Invalid recipient email" });
  }

  try {
    const info = await sendMail({ to, subject, text, html, cc, bcc });
    res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error("Send failed:", err.message);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

// In-memory OTP store: email -> { otp, expiresAt }
const otpStore = new Map();
const OTP_TTL_MS = 5 * 60 * 1000;

// POST /api/send-otp  Body: { email }
app.post("/api/send-otp", async (req, res) => {
  const { email } = req.body || {};
  if (!email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ success: false, message: "Valid email is required" });
  }

  const otp = String(crypto.randomInt(100000, 1000000));
  try {
    await sendOtpEmail(email, otp);
    otpStore.set(email, { otp, expiresAt: Date.now() + OTP_TTL_MS });
    res.json({ success: true, message: "OTP sent" });
  } catch (err) {
    console.error("OTP send failed:", err.message);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
});

// POST /api/verify-otp  Body: { email, otp }
app.post("/api/verify-otp", (req, res) => {
  const { email, otp } = req.body || {};
  const entry = otpStore.get(email);
  if (!entry || entry.expiresAt < Date.now() || entry.otp !== String(otp)) {
    return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
  }
  otpStore.delete(email);
  res.json({ success: true, message: "OTP verified" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  try {
    await transporter.verify();
    console.log("SMTP transporter ready");
  } catch (err) {
    console.warn("SMTP not ready (check .env):", err.message);
  }
});
