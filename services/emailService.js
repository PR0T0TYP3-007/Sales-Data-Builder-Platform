import nodemailer from 'nodemailer';
import { createAuditLog } from '../models/AuditLog.js';
import { logTaskOutcome, OUTCOME_TYPES } from '../models/TaskOutcome.js';

// Email transporter configuration
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Email template rendering
const renderEmailTemplate = (template, variables) => {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`{${key}}`, 'g'), value || '');
  }
  return rendered;
};

// Send email directly (no queue)
const sendEmail = async (taskId, toEmail, subject, template, variables, userId) => {
  try {
    const transporter = createTransporter();
    const renderedBody = renderEmailTemplate(template, variables);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: subject,
      html: renderedBody,
    };

    const info = await transporter.sendMail(mailOptions);

    // Update task outcome
    await logTaskOutcome(taskId, OUTCOME_TYPES.POSITIVE_RESPONSE, {
      email_sent: true,
      message_id: info.messageId,
      recipient: toEmail
    });

    // Create audit log
    await createAuditLog(
      userId,
      'send_email',
      'task',
      taskId,
      { 
        recipient: toEmail, 
        message_id: info.messageId,
        status: 'sent' 
      }
    );

    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('Email sending failed:', error);
    
    // Update task outcome as failed
    await logTaskOutcome(taskId, OUTCOME_TYPES.NEGATIVE_RESPONSE, {
      email_sent: false,
      error: error.message
    });

    await createAuditLog(
      userId,
      'send_email_failed',
      'task',
      taskId,
      { error: error.message, recipient: toEmail }
    );

    throw error;
  }
};

export { sendEmail, renderEmailTemplate };