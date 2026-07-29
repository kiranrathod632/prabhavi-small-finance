import nodemailer from 'nodemailer';

/**
 * Create email transporter
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Send email
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Finance Loan <noreply@financeloan.com>',
      to,
      subject,
      html,
      text: text || subject,
    };
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Email send error:', error.message);
    // Don't throw - email failure shouldn't break the app
    return null;
  }
};

/**
 * Send welcome email
 */
export const sendWelcomeEmail = async (user) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Welcome to Finance Loan Management!</h2>
      <p>Hi ${user.name},</p>
      <p>Your account has been created successfully. You can now apply for loans and manage your finances.</p>
      <p>Best regards,<br/>Finance Loan Team</p>
    </div>
  `;
  return sendEmail({ to: user.email, subject: 'Welcome to Finance Loan Management', html });
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Password Reset Request</h2>
      <p>Hi ${user.name},</p>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Reset Password</a>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    </div>
  `;
  return sendEmail({ to: user.email, subject: 'Password Reset - Finance Loan', html });
};

/**
 * Send loan status email
 */
export const sendLoanStatusEmail = async (user, loan, status) => {
  const statusMessages = {
    approved: 'Your loan application has been approved!',
    rejected: 'Your loan application has been rejected.',
    disbursed: 'Your loan amount has been disbursed to your account.',
    closed: 'Your loan has been closed successfully.',
  };
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Loan Update - ${loan.loanId}</h2>
      <p>Hi ${user.name},</p>
      <p>${statusMessages[status] || `Your loan status has been updated to: ${status}`}</p>
      <p>Loan Amount: ₹${loan.amount.toLocaleString('en-IN')}</p>
      <p>Best regards,<br/>Finance Loan Team</p>
    </div>
  `;
  return sendEmail({ to: user.email, subject: `Loan ${status} - ${loan.loanId}`, html });
};

/**
 * Send EMI reminder email
 */
export const sendEMIReminderEmail = async (user, emi, loan) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">EMI Payment Reminder</h2>
      <p>Hi ${user.name},</p>
      <p>Your EMI #${emi.emiNumber} of ₹${emi.amount.toLocaleString('en-IN')} for loan ${loan.loanId} is due on ${new Date(emi.dueDate).toLocaleDateString('en-IN')}.</p>
      <p>Please ensure timely payment to avoid penalties.</p>
      <p>Best regards,<br/>Finance Loan Team</p>
    </div>
  `;
  return sendEmail({ to: user.email, subject: `EMI Reminder - ${loan.loanId}`, html });
};

/**
 * Send EMI payment confirmation email
 */
export const sendEMIPaymentEmail = async (user, payment, emi, loan) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;">EMI Payment Successful</h2>
      <p>Hi ${user.name},</p>
      <p>Your EMI payment has been received successfully.</p>
      <p>Receipt: ${payment.receiptNumber}</p>
      <p>Amount: ₹${payment.amount.toLocaleString('en-IN')}</p>
      <p>Loan: ${loan.loanId} | EMI #${emi.emiNumber}</p>
      <p>Best regards,<br/>Finance Loan Team</p>
    </div>
  `;
  return sendEmail({ to: user.email, subject: `Payment Confirmation - ${payment.receiptNumber}`, html });
};
