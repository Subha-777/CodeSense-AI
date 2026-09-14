const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

async function sendOtpEmail(toEmail, otp, purpose = "register") {
  let subject, heading, bodyText;

  if (purpose === "reset") {
    subject = "Reset your CodeSense AI password";
    heading = "Reset your password";
    bodyText = "Use this code to reset your password. It expires in 10 minutes.";
  } else if (purpose === "change-password") {
    subject = "Confirm your CodeSense AI password change";
    heading = "Confirm password change";
    bodyText = "Use this code to confirm your password change. It expires in 10 minutes.";
  } else {
    subject = "Verify your CodeSense AI account";
    heading = "Verify your email";
    bodyText = "Use this code to finish creating your account. It expires in 10 minutes.";
  }

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "CodeSense AI", email: process.env.BREVO_SENDER_EMAIL },
      to: [{ email: toEmail }],
      subject,
      htmlContent: `
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
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brevo send failed: ${response.status} ${errorText}`);
  }
}

module.exports = { sendOtpEmail };