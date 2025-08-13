import sgMail from '@sendgrid/mail'

// SendGrid configuration
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

export interface EmailTemplate {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export async function sendEmail({
  to,
  subject,
  html,
  text
}: EmailTemplate) {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SendGrid API key not configured')
      return { success: false, error: 'Email service not configured' }
    }

    const msg = {
      to: Array.isArray(to) ? to : [to],
      from: {
        name: 'LifeLines at Saint Helen',
        email: process.env.FROM_EMAIL || 'noreply@sainthelen.org'
      },
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    }

    await sgMail.send(msg)
    console.log('Email sent successfully via SendGrid')
    return { success: true, messageId: 'sendgrid-success' }
  } catch (error) {
    console.error('Email sending failed:', error)
    throw error
  }
}

// Welcome email template for new LifeLine leaders
export async function sendWelcomeEmail(
  email: string,
  name: string,
  tempPassword: string,
  lifeLineTitle: string
) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Welcome to LifeLines</title>
        <style>
            body { font-family: 'Libre Franklin', Arial, sans-serif; line-height: 1.6; color: #374151; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1f346d; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
            .button { display: inline-block; background: #019e7c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .credentials { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to LifeLines!</h1>
                <p>Your formation request has been approved</p>
            </div>
            
            <div class="content">
                <h2>Hello ${name},</h2>
                
                <p>Congratulations! Your LifeLine formation request for "<strong>${lifeLineTitle}</strong>" has been approved by our formation team.</p>
                
                <p>Your LifeLine leader account has been created. Here are your login credentials:</p>
                
                <div class="credentials">
                    <strong>Login Details:</strong><br>
                    <strong>Email:</strong> ${email}<br>
                    <strong>Temporary Password:</strong> ${tempPassword}
                </div>
                
                <p><strong>Important:</strong> Please log in and change your password immediately for security.</p>
                
                <a href="${process.env.APP_URL}/login" class="button">Access Your Dashboard</a>
                
                <h3>Next Steps:</h3>
                <ul>
                    <li>Log in to your leader dashboard</li>
                    <li>Complete your LifeLine profile</li>
                    <li>Add a description and meeting details</li>
                    <li>Publish your group when ready</li>
                </ul>
                
                <p>If you have any questions or need assistance, please contact our support team.</p>
                
                <p>Blessings,<br>
                The LifeLines Team<br>
                Saint Helen Church</p>
            </div>
            
            <div class="footer">
                <p>© 2024 A ministry of Saint Helen Church, Westfield, New Jersey</p>
                <p>If you have questions, contact us at <a href="mailto:support@sainthelen.org">support@sainthelen.org</a></p>
            </div>
        </div>
    </body>
    </html>
  `

  return await sendEmail({
    to: email,
    subject: `Welcome to LifeLines - Your "${lifeLineTitle}" group is approved!`,
    html
  })
}

// Formation request notification
export async function sendFormationRequestNotification(
  formationRequest: {
    title: string
    groupLeader: string
    leaderEmail: string
    description?: string
  }
) {
  const supportEmail = process.env.ADMIN_EMAIL || 'support@sainthelen.org'
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>New Formation Request</title>
        <style>
            body { font-family: 'Libre Franklin', Arial, sans-serif; line-height: 1.6; color: #374151; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1f346d; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .button { display: inline-block; background: #019e7c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>New Formation Request</h1>
            </div>
            
            <div class="content">
                <h2>Formation Request Details:</h2>
                
                <p><strong>LifeLine Title:</strong> ${formationRequest.title}</p>
                <p><strong>Proposed Leader:</strong> ${formationRequest.groupLeader}</p>
                <p><strong>Email:</strong> ${formationRequest.leaderEmail}</p>
                
                ${formationRequest.description ? `<p><strong>Description:</strong> ${formationRequest.description}</p>` : ''}
                
                <p>Please review this request in the Formation Dashboard:</p>
                
                <a href="${process.env.APP_URL}/dashboard/formation-support" class="button">Review Request</a>
            </div>
        </div>
    </body>
    </html>
  `

  return await sendEmail({
    to: supportEmail,
    subject: `New Formation Request: ${formationRequest.title}`,
    html
  })
}

// Inquiry notification to LifeLine leader
export async function sendInquiryNotification(
  leaderEmail: string,
  leaderName: string,
  lifeLineTitle: string,
  inquiry: {
    personName: string
    personEmail?: string
    message?: string
  }
) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>New LifeLine Inquiry</title>
        <style>
            body { font-family: 'Libre Franklin', Arial, sans-serif; line-height: 1.6; color: #374151; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1f346d; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .button { display: inline-block; background: #019e7c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .inquiry-details { background: white; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>New Member Inquiry</h1>
                <p>Someone is interested in your LifeLine</p>
            </div>
            
            <div class="content">
                <h2>Hello ${leaderName},</h2>
                
                <p>Good news! Someone has expressed interest in joining your LifeLine "<strong>${lifeLineTitle}</strong>".</p>
                
                <div class="inquiry-details">
                    <h3>Inquiry Details:</h3>
                    <p><strong>Name:</strong> ${inquiry.personName}</p>
                    ${inquiry.personEmail ? `<p><strong>Email:</strong> ${inquiry.personEmail}</p>` : ''}
                    ${inquiry.message ? `<p><strong>Message:</strong><br>${inquiry.message}</p>` : ''}
                </div>
                
                <p>You can respond to this inquiry through your leader dashboard:</p>
                
                <a href="${process.env.APP_URL}/dashboard/leader" class="button">View Inquiry</a>
                
                <p>We encourage you to reach out to ${inquiry.personName} soon to welcome them and provide more information about your group.</p>
                
                <p>Blessings,<br>
                The LifeLines Team</p>
            </div>
        </div>
    </body>
    </html>
  `

  return await sendEmail({
    to: leaderEmail,
    subject: `New inquiry for your LifeLine: ${lifeLineTitle}`,
    html
  })
}

// Password reset email
export async function sendPasswordResetEmail(
  email: string,
  displayName: string,
  resetToken: string
) {
  const resetUrl = `${process.env.APP_URL}/auth/reset-password?token=${resetToken}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Password Reset Request</title>
        <style>
            body { font-family: 'Libre Franklin', Arial, sans-serif; line-height: 1.6; color: #374151; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1f346d; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .button { display: inline-block; background: #019e7c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .warning { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 15px 0; color: #991b1b; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Reset Request</h1>
            </div>
            
            <div class="content">
                <h2>Hello ${displayName},</h2>
                
                <p>You requested to reset your password for your LifeLines account. Click the button below to set a new password:</p>
                
                <a href="${resetUrl}" class="button">Reset Password</a>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px;">${resetUrl}</p>
                
                <div class="warning">
                    <p><strong>Security Notice:</strong></p>
                    <ul>
                        <li>This link will expire in 1 hour</li>
                        <li>If you didn't request this reset, please ignore this email</li>
                        <li>Never share this link with anyone</li>
                    </ul>
                </div>
                
                <p>If you have any questions or concerns, please contact our support team.</p>
                
                <p>Blessings,<br>
                The LifeLines Team</p>
            </div>
        </div>
    </body>
    </html>
  `

  return await sendEmail({
    to: email,
    subject: 'Password Reset Request - LifeLines',
    html
  })
}