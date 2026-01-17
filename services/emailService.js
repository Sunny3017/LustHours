const sendEmail = require('../utils/sendEmail');

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.BASE_URL || 'http://localhost:5173';

const buildOtpHtml = (title, introText, otp) => {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${title}</h2>
          <p>${introText}</p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; padding: 12px 24px; border-radius: 6px; background-color: #111827; color: #ffffff; font-size: 24px; letter-spacing: 6px;">
              ${otp}
            </div>
          </div>
          <p style="color: #555;">This code will expire in 5 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you did not request this, you can safely ignore this email.</p>
        </div>
      `;
};

const sendSignupOtpEmail = async ({ email, otp }) => {
    const message = `Your verification code for LustHours is: ${otp}\n\nThis code expires in 5 minutes.`;
    const html = buildOtpHtml(
        'Verify your email',
        'Use the following one-time code to complete your signup:',
        otp
    );

    return sendEmail({
        email,
        subject: 'LustHours - Email Verification Code',
        message,
        html
    });
};

const sendPasswordResetOtpEmail = async ({ email, otp }) => {
    const message = `You requested a password reset.\n\nYour password reset OTP is: ${otp}\n\nThis code is valid for 5 minutes.`;
    const html = buildOtpHtml(
        'Reset your password',
        'Use the following one-time code to reset your password:',
        otp
    );

    return sendEmail({
        email,
        subject: 'Password Reset OTP',
        message,
        html
    });
};

const sendVerificationEmail = async ({ email, verificationToken }) => {
    const verificationUrl = `${FRONTEND_URL.replace(/\/+$/, '')}/verify-email/${verificationToken}`;

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Welcome to LustHours</h2>
      <p>Please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Verify Email Address
        </a>
      </div>
      <p>If you didn't create an account, you can safely ignore this email.</p>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">This link will expire in 24 hours.</p>
    </div>
  `;

    return sendEmail({
        email,
        subject: 'Verify Your Email Address',
        message: `Verify your email address by visiting: ${verificationUrl}`,
        html
    });
};

const sendPasswordResetLinkEmail = async ({ email, resetToken }) => {
    const resetUrl = `${FRONTEND_URL.replace(/\/+$/, '')}/reset-password/${resetToken}`;

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>You requested to reset your password. Click the button below to proceed:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p>If you didn't request this, please ignore this email.</p>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">This link will expire in 1 hour.</p>
    </div>
  `;

    return sendEmail({
        email,
        subject: 'Password Reset Request',
        message: `You requested a password reset. Open this link to continue: ${resetUrl}`,
        html
    });
};

module.exports = {
    sendSignupOtpEmail,
    sendPasswordResetOtpEmail,
    sendVerificationEmail,
    sendPasswordResetLinkEmail
};

