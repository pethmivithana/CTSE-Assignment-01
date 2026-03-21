/**
 * Email service for OTP and verification emails
 * Uses nodemailer when SMTP is configured, otherwise logs to console (development)
 */

let transporter = null;

try {
  const nodemailer = require("nodemailer");
  const hasSmtp =
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS;

  if (hasSmtp) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
} catch (err) {
  console.warn("Nodemailer not installed. OTP will be logged to console.");
}

async function sendOTPEmail(email, name, otp) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Feedo - Email Verification</h2>
      <p>Hello ${name},</p>
      <p>Your verification OTP is:</p>
      <h1 style="letter-spacing: 8px; color: #2563eb;">${otp}</h1>
      <p>This OTP is valid for 10 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
      <hr>
      <p style="color: #666; font-size: 12px;">Feedo Food Delivery</p>
    </div>
  `;

  if (transporter) {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@feedo.com",
      to: email,
      subject: "Feedo - Your Verification OTP",
      html,
    });
  } else {
    console.log("\n========== OTP EMAIL (Development) ==========");
    console.log(`To: ${email}`);
    console.log(`OTP: ${otp}`);
    console.log("==============================================\n");
  }
}

async function sendVerificationEmail(email, name, token) {
  const verifyUrl = `${process.env.APP_URL || "http://localhost:3000"}/verify-email?token=${token}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Feedo - Verify Your Email</h2>
      <p>Hello ${name},</p>
      <p>Please click the link below to verify your email:</p>
      <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Verify Email</a>
      <p>Or copy this link: ${verifyUrl}</p>
      <p>This link expires in 24 hours.</p>
      <hr>
      <p style="color: #666; font-size: 12px;">Feedo Food Delivery</p>
    </div>
  `;

  if (transporter) {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@feedo.com",
      to: email,
      subject: "Feedo - Verify Your Email",
      html,
    });
  } else {
    console.log("\n========== VERIFICATION EMAIL (Development) ==========");
    console.log(`To: ${email}`);
    console.log(`Link: ${verifyUrl}`);
    console.log("======================================================\n");
  }
}

async function sendApprovalNotification(email, name, role) {
  const roleLabel = role === "restaurantManager" ? "Restaurant Manager" : "Delivery Person";
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 0;">
      <div style="background: linear-gradient(135deg, #E31837 0%, #c41430 100%); padding: 28px 32px; border-radius: 16px 16px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">Feedo Food Delivery</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Your account has been approved</p>
      </div>
      <div style="background: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Hello <strong>${name}</strong>,</p>
        <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
          Great news! Your <strong>${roleLabel}</strong> registration has been approved by our admin team.
        </p>
        <p style="color: #4b5563; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
          You can now sign in to your account and start using Feedo.
        </p>
        <a href="${appUrl}" style="display: inline-block; padding: 14px 28px; background: #E31837; color: white; text-decoration: none; font-weight: 600; font-size: 15px; border-radius: 10px; margin: 8px 0;">Sign In to Feedo</a>
        <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin: 28px 0 0;">If you have any questions, please contact our support team.</p>
      </div>
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 16px 0;">&copy; Feedo Food Delivery</p>
    </div>
  `;

  if (transporter) {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@feedo.com",
      to: email,
      subject: "Feedo - Your account has been approved",
      html,
    });
  } else {
    console.log("\n========== APPROVAL NOTIFICATION (Development) ==========");
    console.log(`To: ${email}`);
    console.log(`Subject: Your account has been approved`);
    console.log(`\nHello ${name}, Your ${roleLabel} registration has been approved. You can now sign in.`);
    console.log("========================================================================\n");
  }
}

async function sendPasswordResetOTP(email, name, otp) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Feedo - Password Reset</h2>
      <p>Hello ${name},</p>
      <p>You requested to reset your password. Use this OTP to verify:</p>
      <h1 style="letter-spacing: 8px; color: #E31837;">${otp}</h1>
      <p>This OTP is valid for 10 minutes.</p>
      <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
      <hr>
      <p style="color: #666; font-size: 12px;">Feedo Food Delivery</p>
    </div>
  `;

  if (transporter) {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@feedo.com",
      to: email,
      subject: "Feedo - Password Reset OTP",
      html,
    });
  } else {
    console.log("\n========== PASSWORD RESET OTP (Development) ==========");
    console.log(`To: ${email}`);
    console.log(`OTP: ${otp}`);
    console.log("========================================================\n");
  }
}

module.exports = {
  sendOTPEmail,
  sendVerificationEmail,
  sendPasswordResetOTP,
  sendApprovalNotification,
};
