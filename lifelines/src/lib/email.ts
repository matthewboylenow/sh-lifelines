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
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
            .button { display: inline-block; background: #019e7c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .request-details { background: white; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #019e7c; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📝 New Formation Request</h1>
                <p>A new LifeLine has been proposed</p>
            </div>
            
            <div class="content">
                <h2>Formation Request Details:</h2>
                
                <div class="request-details">
                    <p><strong>LifeLine Title:</strong> ${formationRequest.title}</p>
                    <p><strong>Proposed Leader:</strong> ${formationRequest.groupLeader}</p>
                    <p><strong>Email:</strong> ${formationRequest.leaderEmail}</p>
                    ${formationRequest.description ? `<p><strong>Description:</strong><br>${formationRequest.description}</p>` : ''}
                </div>
                
                <p><strong>Next Steps:</strong></p>
                <ul>
                    <li>Review the complete formation request</li>
                    <li>Vote on approval/rejection in the dashboard</li>
                    <li>Discuss with formation team if needed</li>
                    <li>Request will auto-approve with 2+ approvals after 24 hours</li>
                </ul>
                
                <p>Please review and vote on this request in the Formation Dashboard:</p>
                
                <a href="${process.env.APP_URL}/dashboard/formation-support/formation-requests" class="button">Review & Vote</a>
                
                <p><strong>Important:</strong> Formation requests require team review and voting before approval.</p>
            </div>
            
            <div class="footer">
                <p>© 2024 A ministry of Saint Helen Church, Westfield, New Jersey</p>
                <p>Formation Team Dashboard: <a href="${process.env.APP_URL}/dashboard/formation-support">Review Requests</a></p>
            </div>
        </div>
    </body>
    </html>
  `

  return await sendEmail({
    to: supportEmail,
    subject: `📝 New Formation Request: ${formationRequest.title}`,
    html
  })
}

// Welcome confirmation email for new user registrations
export async function sendUserRegistrationConfirmationEmail(
  user: {
    email: string
    displayName: string
    role: string
  }
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
            .welcome-box { background: #ecfdf5; border: 1px solid #10b981; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to LifeLines! 🎉</h1>
                <p>Your account has been created</p>
            </div>
            
            <div class="content">
                <h2>Hello ${user.displayName},</h2>
                
                <div class="welcome-box">
                    <p><strong>Welcome!</strong> Your LifeLines account has been successfully created.</p>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Role:</strong> ${user.role.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</p>
                </div>
                
                <p>You can now access the LifeLines system with your account credentials.</p>
                
                <h3>What you can do:</h3>
                <ul>
                    <li>Browse available LifeLines</li>
                    <li>Express interest in joining groups</li>
                    <li>Access your role-specific dashboard</li>
                    <li>Manage your profile and preferences</li>
                </ul>
                
                <a href="${process.env.APP_URL}/login" class="button">Access LifeLines</a>
                
                <p>If you have any questions or need assistance getting started, please don't hesitate to contact our support team.</p>
                
                <p>Blessings,<br>
                The LifeLines Team<br>
                Saint Helen Church</p>
            </div>
            
            <div class="footer">
                <p>© 2024 A ministry of Saint Helen Church, Westfield, New Jersey</p>
                <p>Need help? Contact us at <a href="mailto:support@sainthelen.org">support@sainthelen.org</a></p>
            </div>
        </div>
    </body>
    </html>
  `

  return await sendEmail({
    to: user.email,
    subject: '🎉 Welcome to LifeLines - Account Created Successfully',
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
  const resetUrl = `${process.env.APP_URL}/reset-password?token=${resetToken}`
  
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

// Formation request status update emails
export async function sendFormationRequestApprovalEmail(
  request: {
    groupLeader: string
    leaderEmail: string
    title: string
    description?: string
  },
  tempPassword: string
) {
  // Use the existing welcome email function
  return await sendWelcomeEmail(
    request.leaderEmail,
    request.groupLeader,
    tempPassword,
    request.title
  )
}

export async function sendFormationRequestRejectionEmail(
  request: {
    groupLeader: string
    leaderEmail: string
    title: string
  },
  rejectionReason?: string
) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Formation Request Update</title>
        <style>
            body { font-family: 'Libre Franklin', Arial, sans-serif; line-height: 1.6; color: #374151; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1f346d; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
            .button { display: inline-block; background: #019e7c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .info-box { background: #f0f9ff; border: 1px solid #0ea5e9; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Formation Request Update</h1>
                <p>Thank you for your interest in leading a LifeLine</p>
            </div>
            
            <div class="content">
                <h2>Hello ${request.groupLeader},</h2>
                
                <p>Thank you for submitting your formation request for "<strong>${request.title}</strong>". After careful consideration by our formation team, we are unable to approve this request at this time.</p>
                
                ${rejectionReason ? `
                <div class="info-box">
                    <h3>Feedback from our team:</h3>
                    <p>${rejectionReason}</p>
                </div>
                ` : ''}
                
                <p>This doesn't mean your idea isn't valuable! Here are some next steps you might consider:</p>
                
                <ul>
                    <li>Contact our formation team to discuss how to refine your proposal</li>
                    <li>Consider joining an existing LifeLine to gain experience</li>
                    <li>Resubmit your request after making suggested adjustments</li>
                    <li>Explore different timing or format options</li>
                </ul>
                
                <p>We encourage you to stay engaged with our community and consider reapplying in the future.</p>
                
                <a href="${process.env.APP_URL}/lifelines" class="button">Explore Current LifeLines</a>
                
                <p>If you have questions or would like to discuss this decision, please feel free to contact our formation support team.</p>
                
                <p>Blessings,<br>
                The Formation Team<br>
                Saint Helen Church</p>
            </div>
            
            <div class="footer">
                <p>© 2024 A ministry of Saint Helen Church, Westfield, New Jersey</p>
                <p>Questions? Contact us at <a href="mailto:support@sainthelen.org">support@sainthelen.org</a></p>
            </div>
        </div>
    </body>
    </html>
  `

  return await sendEmail({
    to: request.leaderEmail,
    subject: `Formation Request Update: ${request.title}`,
    html
  })
}

// Support ticket email notifications
export async function sendSupportTicketCreatedEmail(
  ticket: {
    referenceNumber: string
    subject: string
    description: string
    priority: string
    requester: {
      displayName: string
      email: string
    }
  }
) {
  // Email to the requester
  const requesterHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Support Ticket Created</title>
        <style>
            body { font-family: 'Libre Franklin', Arial, sans-serif; line-height: 1.6; color: #374151; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1f346d; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
            .button { display: inline-block; background: #019e7c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .ticket-info { background: white; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #019e7c; }
            .reference { background: #f0f9ff; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 18px; font-weight: bold; text-align: center; margin: 15px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Support Ticket Created</h1>
                <p>We've received your request for help</p>
            </div>
            
            <div class="content">
                <h2>Hello ${ticket.requester.displayName},</h2>
                
                <p>Thank you for contacting LifeLines support. We have received your support request and will respond as soon as possible.</p>
                
                <div class="reference">
                    Reference #: ${ticket.referenceNumber}
                </div>
                
                <div class="ticket-info">
                    <h3>Your Request Details:</h3>
                    <p><strong>Subject:</strong> ${ticket.subject}</p>
                    <p><strong>Priority:</strong> ${ticket.priority}</p>
                    <p><strong>Description:</strong><br>${ticket.description.substring(0, 300)}${ticket.description.length > 300 ? '...' : ''}</p>
                </div>
                
                <p><strong>What happens next?</strong></p>
                <ul>
                    <li>Our support team will review your request</li>
                    <li>You'll receive updates via email as we work on your issue</li>
                    <li>Expected response time: 24-48 hours for most requests</li>
                </ul>
                
                <p>You can track the status of your ticket anytime:</p>
                
                <a href="${process.env.APP_URL}/dashboard/formation-support/support-tickets/${ticket.referenceNumber}" class="button">View Ticket Status</a>
                
                <p><strong>Need immediate help?</strong> For urgent matters, please contact the church office directly.</p>
                
                <p>Blessings,<br>
                The LifeLines Support Team</p>
            </div>
            
            <div class="footer">
                <p>© 2024 A ministry of Saint Helen Church, Westfield, New Jersey</p>
                <p>Reference this ticket: ${ticket.referenceNumber}</p>
            </div>
        </div>
    </body>
    </html>
  `

  // Email to support team
  const supportHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>New Support Ticket</title>
        <style>
            body { font-family: 'Libre Franklin', Arial, sans-serif; line-height: 1.6; color: #374151; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .button { display: inline-block; background: #019e7c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .ticket-info { background: white; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626; }
            .priority-high { border-left-color: #dc2626; }
            .priority-medium { border-left-color: #f59e0b; }
            .priority-low { border-left-color: #10b981; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>New Support Ticket</h1>
                <p>Priority: ${ticket.priority}</p>
            </div>
            
            <div class="content">
                <h2>New Ticket: ${ticket.referenceNumber}</h2>
                
                <div class="ticket-info priority-${ticket.priority.toLowerCase()}">
                    <p><strong>From:</strong> ${ticket.requester.displayName} (${ticket.requester.email})</p>
                    <p><strong>Subject:</strong> ${ticket.subject}</p>
                    <p><strong>Priority:</strong> ${ticket.priority}</p>
                    <p><strong>Description:</strong></p>
                    <p>${ticket.description}</p>
                </div>
                
                <p>Please respond to this ticket promptly:</p>
                
                <a href="${process.env.APP_URL}/dashboard/formation-support/support-tickets/${ticket.referenceNumber}" class="button">Respond to Ticket</a>
            </div>
        </div>
    </body>
    </html>
  `

  const supportEmail = process.env.ADMIN_EMAIL || 'support@sainthelen.org'

  // Send both emails
  const results = await Promise.allSettled([
    sendEmail({
      to: ticket.requester.email,
      subject: `Support Ticket Created: ${ticket.subject} [${ticket.referenceNumber}]`,
      html: requesterHtml
    }),
    sendEmail({
      to: supportEmail,
      subject: `New Support Ticket [${ticket.priority}]: ${ticket.subject} [${ticket.referenceNumber}]`,
      html: supportHtml
    })
  ])

  return results
}

export async function sendSupportTicketResponseEmail(
  ticket: {
    referenceNumber: string
    subject: string
    requester: {
      displayName: string
      email: string
    }
  },
  response: {
    content: string
    isFromSupport: boolean
    author: {
      displayName: string
    }
  }
) {
  const isNotifyingCustomer = response.isFromSupport
  const recipient = isNotifyingCustomer ? ticket.requester : { email: process.env.ADMIN_EMAIL || 'support@sainthelen.org' }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Support Ticket Response</title>
        <style>
            body { font-family: 'Libre Franklin', Arial, sans-serif; line-height: 1.6; color: #374151; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1f346d; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
            .button { display: inline-block; background: #019e7c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .response-content { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #019e7c; }
            .support-response { border-left-color: #0ea5e9; }
            .customer-response { border-left-color: #8b5cf6; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${isNotifyingCustomer ? 'Support Team Response' : 'Customer Response'}</h1>
                <p>Ticket #${ticket.referenceNumber}</p>
            </div>
            
            <div class="content">
                <h2>${isNotifyingCustomer ? `Hello ${ticket.requester.displayName}` : 'Support Team Update'},</h2>
                
                <p>There's a new response on your support ticket "<strong>${ticket.subject}</strong>":</p>
                
                <div class="response-content ${response.isFromSupport ? 'support-response' : 'customer-response'}">
                    <p><strong>From:</strong> ${response.author.displayName} ${response.isFromSupport ? '(Support Team)' : '(Customer)'}</p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 15px 0;">
                    <p>${response.content}</p>
                </div>
                
                ${isNotifyingCustomer ? `
                <p>You can view the complete conversation and respond if needed:</p>
                ` : `
                <p>Please check the ticket and respond if needed:</p>
                `}
                
                <a href="${process.env.APP_URL}/dashboard/formation-support/support-tickets/${ticket.referenceNumber}" class="button">View Full Ticket</a>
                
                <p>${isNotifyingCustomer ? 'Thank you for your patience as we work to resolve your issue.' : 'Please respond promptly to maintain good customer service.'}</p>
                
                <p>Blessings,<br>
                The LifeLines Team</p>
            </div>
            
            <div class="footer">
                <p>© 2024 A ministry of Saint Helen Church, Westfield, New Jersey</p>
                <p>Ticket Reference: ${ticket.referenceNumber}</p>
            </div>
        </div>
    </body>
    </html>
  `

  if (typeof recipient === 'string') {
    return await sendEmail({
      to: recipient,
      subject: `Support Ticket Response: ${ticket.subject} [${ticket.referenceNumber}]`,
      html
    })
  } else {
    return await sendEmail({
      to: recipient.email,
      subject: `Support Ticket Response: ${ticket.subject} [${ticket.referenceNumber}]`,
      html
    })
  }
}

export async function sendSupportTicketResolvedEmail(
  ticket: {
    referenceNumber: string
    subject: string
    requester: {
      displayName: string
      email: string
    }
  }
) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Support Ticket Resolved</title>
        <style>
            body { font-family: 'Libre Franklin', Arial, sans-serif; line-height: 1.6; color: #374151; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
            .button { display: inline-block; background: #019e7c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .success-box { background: #ecfdf5; border: 1px solid #10b981; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ Ticket Resolved</h1>
                <p>Your issue has been resolved</p>
            </div>
            
            <div class="content">
                <h2>Hello ${ticket.requester.displayName},</h2>
                
                <div class="success-box">
                    <p><strong>Good news!</strong> Your support ticket has been resolved.</p>
                    <p><strong>Ticket:</strong> ${ticket.subject}</p>
                    <p><strong>Reference:</strong> ${ticket.referenceNumber}</p>
                </div>
                
                <p>Our support team has marked your ticket as resolved. If the issue persists or you have additional questions, please don't hesitate to:</p>
                
                <ul>
                    <li>Reply to this ticket to reopen it</li>
                    <li>Create a new support ticket</li>
                    <li>Contact our support team directly</li>
                </ul>
                
                <a href="${process.env.APP_URL}/dashboard/formation-support/support-tickets" class="button">View All Tickets</a>
                
                <p><strong>How was our support?</strong> We'd love to hear your feedback about your experience with our support team.</p>
                
                <p>Thank you for using LifeLines, and we're glad we could help!</p>
                
                <p>Blessings,<br>
                The LifeLines Support Team</p>
            </div>
            
            <div class="footer">
                <p>© 2024 A ministry of Saint Helen Church, Westfield, New Jersey</p>
                <p>Resolved Ticket: ${ticket.referenceNumber}</p>
            </div>
        </div>
    </body>
    </html>
  `

  return await sendEmail({
    to: ticket.requester.email,
    subject: `✅ Resolved: ${ticket.subject} [${ticket.referenceNumber}]`,
    html
  })
}