const nodemailer = require("nodemailer");

// Set these in your .env AND in Render's environment variables:
//   GMAIL_USER=youraddress@gmail.com
//   GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx   (16-char App Password, no spaces)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function sendOtpEmail(toEmail, otp, purpose = "register") {
  const isReset = purpose === "reset";
  const subject = isReset
    ? "Reset your CodeSense AI password"
    : "Verify your CodeSense AI account";
  const heading = isReset ? "Reset your password" : "Verify your email";
  const bodyText = isReset
    ? "Use this code to reset your password. It expires in 10 minutes."
    : "Use this code to finish creating your account. It expires in 10 minutes.";

  await transporter.sendMail({
    from: `"CodeSense AI" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 420px; margin: auto;">
        <h2 style="color:#1f2937;">${heading}</h2>
        <p style="color:#374151;">${bodyText}</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; background:#f3f4f6; padding: 16px; text-align:center; border-radius: 8px; color:#111827;">
          ${otp}
        </div>
        <p style="color:#9ca3af; font-size: 12px; margin-top: 16px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

module.exports = { sendOtpEmail };