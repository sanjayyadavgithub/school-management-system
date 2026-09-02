const axios = require('axios');
const nodemailer = require('nodemailer');

// 1. Configure free-tier Email transporter using Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'placeholder-email@gmail.com',
    pass: process.env.SMTP_PASS || 'placeholder-password',
  },
});

// 2. Helper to send WhatsApp template message (Meta Cloud API Free Tier)
const sendWhatsAppMessage = async (phone, templateName, components) => {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.log(`[WhatsApp Sandbox Dev Mode] Simulated Message to ${phone} using Template: ${templateName}`);
    return { status: 'simulated', success: true };
  }

  try {
    const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;
    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en_US' },
          components
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return { status: 'sent', success: true, data: response.data };
  } catch (error) {
    console.error('WhatsApp Graph API Error:', error.response ? error.response.data : error.message);
    return { status: 'failed', success: false, error: error.message };
  }
};

// 3. Helper to send Telegram notification (100% Free and Unlimited fallback)
const sendTelegramMessage = async (chatId, text) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken || !chatId) {
    console.log(`[Telegram Sandbox Dev Mode] Simulated Message to Chat ID ${chatId}: ${text}`);
    return { status: 'simulated', success: true };
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await axios.post(url, {
      chat_id: chatId,
      text,
      parse_mode: 'HTML'
    });
    return { status: 'sent', success: true, data: response.data };
  } catch (error) {
    console.error('Telegram Bot API Error:', error.message);
    return { status: 'failed', success: false, error: error.message };
  }
};

// 4. Exposed transactional alert workflows
exports.sendAttendanceAlert = async (parentUser, studentName, date, status) => {
  const formattedDate = new Date(date).toLocaleDateString();
  const text = `<b>Attendance Alert:</b> Dear Parent, your child, <b>${studentName}</b>, was marked <b>${status}</b> on ${formattedDate}.`;

  // Try WhatsApp (Free tier 1k conversations limit)
  if (parentUser.phone) {
    await sendWhatsAppMessage(parentUser.phone, 'attendance_alert', [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: studentName },
          { type: 'text', text: status },
          { type: 'text', text: formattedDate }
        ]
      }
    ]);
  }

  // Try Telegram (if Chat ID is configured in parent user details)
  if (parentUser.telegramChatId) {
    await sendTelegramMessage(parentUser.telegramChatId, text);
  }

  // Send email alert (SMTP - Free)
  try {
    await transporter.sendMail({
      from: '"School Management" <no-reply@school.com>',
      to: parentUser.email,
      subject: `Attendance Notification - ${studentName}`,
      html: `<p>Dear Parent,</p><p>This is to inform you that your child, <strong>${studentName}</strong>, was marked <strong>${status}</strong> on ${formattedDate}.</p>`
    });
  } catch (e) {
    console.error('SMTP Mail failed to send:', e.message);
  }
};

exports.sendFeeReminder = async (parentUser, studentName, amountDue, dueDate) => {
  const formattedDueDate = new Date(dueDate).toLocaleDateString();
  const text = `<b>Fee Outstanding Reminder:</b> Dear Parent, a fee amount of <b>₹${amountDue}</b> is due for <b>${studentName}</b> by ${formattedDueDate}. Please clear outstanding payments online.`;

  // WhatsApp template
  if (parentUser.phone) {
    await sendWhatsAppMessage(parentUser.phone, 'fee_reminder', [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: parentUser.name },
          { type: 'text', text: studentName },
          { type: 'text', text: `₹${amountDue}` },
          { type: 'text', text: formattedDueDate }
        ]
      }
    ]);
  }

  // Telegram
  if (parentUser.telegramChatId) {
    await sendTelegramMessage(parentUser.telegramChatId, text);
  }

  // Email
  try {
    await transporter.sendMail({
      from: '"School Accounts" <billing@school.com>',
      to: parentUser.email,
      subject: `Fee Reminder Alert - ${studentName}`,
      html: `<p>Dear Parent,</p><p>This is a reminder that a pending outstanding fee of <strong>₹${amountDue}</strong> is due for <strong>${studentName}</strong>. Please complete payment by ${formattedDueDate}.</p>`
    });
  } catch (e) {
    console.error('SMTP Billing Mail failed:', e.message);
  }
};

exports.sendExamPublishAlert = async (parentUser, studentName, examName) => {
  const text = `<b>Results Released:</b> Dear Parent, academic performance grades for <b>${studentName}</b> in <b>${examName}</b> are now available on the portal.`;

  // WhatsApp template
  if (parentUser.phone) {
    await sendWhatsAppMessage(parentUser.phone, 'exam_publish', [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: studentName },
          { type: 'text', text: examName }
        ]
      }
    ]);
  }

  // Telegram
  if (parentUser.telegramChatId) {
    await sendTelegramMessage(parentUser.telegramChatId, text);
  }

  // Email
  try {
    await transporter.sendMail({
      from: '"School Registrar" <registrar@school.com>',
      to: parentUser.email,
      subject: `Exam Grades Released - ${studentName}`,
      html: `<p>Dear Parent,</p><p>Academic results for <strong>${studentName}</strong> in <strong>${examName}</strong> have been uploaded. Please log in to view report card grades.</p>`
    });
  } catch (e) {
    console.error('SMTP Registrar Mail failed:', e.message);
  }
};
