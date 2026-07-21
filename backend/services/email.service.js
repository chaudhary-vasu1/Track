const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

try {
  transporter = nodemailer.createTransport({
    host: env.email.host,
    port: env.email.port,
    secure: env.email.port === 465,
    auth: {
      user: env.email.user,
      pass: env.email.pass
    }
  });
} catch (error) {
  console.warn('Email transporter initialization failed:', error.message);
}

/**
 * Send an alert notification email to the parent.
 */
async function sendAlertEmail(parentEmail, alertData) {
  if (!transporter) {
    console.warn('Email transporter not configured. Skipping email notification.');
    return false;
  }

  if (env.email.user === 'placeholder@gmail.com') {
    console.log(`[EMAIL SKIP] SMTP not configured. Would send to ${parentEmail}: "${alertData.title}"`);
    return false;
  }

  const severityColors = {
    high: '#ff3838',
    medium: '#f39c12',
    low: '#00ff87'
  };

  const severityColor = severityColors[alertData.severity] || '#f39c12';

  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background-color:#0a051b; font-family:Arial, sans-serif;">
      <div style="max-width:600px; margin:0 auto; padding:40px 20px;">
        <div style="background:rgba(18,10,41,0.95); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:32px; color:#f3f0ff;">
          
          <div style="text-align:center; margin-bottom:24px;">
            <h1 style="font-size:24px; margin:0; background:linear-gradient(45deg,#00f2fe,#9b51e0); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">
              CropCure Alert
            </h1>
          </div>

          <div style="border-left:4px solid ${severityColor}; padding:16px; background:rgba(255,255,255,0.03); border-radius:0 8px 8px 0; margin-bottom:20px;">
            <span style="display:inline-block; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold; color:${severityColor}; background:rgba(255,255,255,0.05); text-transform:uppercase; margin-bottom:8px;">
              ${alertData.severity} severity
            </span>
            <h2 style="font-size:18px; margin:8px 0 4px; color:#fff;">${alertData.title}</h2>
            <p style="font-size:14px; color:#a39bb8; margin:0;">${alertData.message}</p>
          </div>

          <div style="font-size:13px; color:#a39bb8; margin-bottom:16px;">
            <p><strong>Device:</strong> ${alertData.kidDeviceId || 'Unknown'}</p>
            <p><strong>Time:</strong> ${new Date(alertData.createdAt || Date.now()).toLocaleString()}</p>
          </div>

          <div style="text-align:center; margin-top:24px;">
            <a href="${env.server.url || 'https://localhost:8443'}" 
               style="display:inline-block; padding:12px 24px; background:linear-gradient(135deg,#00f2fe,#9b51e0); color:#fff; text-decoration:none; border-radius:8px; font-weight:bold;">
              Open Dashboard
            </a>
          </div>

          <div style="text-align:center; margin-top:24px; font-size:11px; color:#6c6489;">
            This is an automated alert from CropCure Parental Monitoring System.
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"CropCure Alerts" <${env.email.user}>`,
      to: parentEmail,
      subject: `[CropCure] ${alertData.severity.toUpperCase()}: ${alertData.title}`,
      html: htmlBody
    });

    console.log(`[EMAIL] Alert email sent to ${parentEmail}: ${alertData.title}`);
    return true;
  } catch (error) {
    console.error('Failed to send alert email:', error.message);
    return false;
  }
}

module.exports = {
  sendAlertEmail
};
