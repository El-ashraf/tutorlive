import nodemailer from 'nodemailer'

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function sendBookingConfirmation({
  to,
  studentName,
  tutorName,
  subject,
  scheduledAt,
  roomId,
}: {
  to: string
  studentName: string
  tutorName: string
  subject: string
  scheduledAt: Date
  roomId: string
}) {
  const sessionUrl = `${process.env.NEXT_PUBLIC_APP_URL}/session/${roomId}`
  const dateStr = new Date(scheduledAt).toLocaleString('en-GB', {
    dateStyle: 'full',
    timeStyle: 'short',
  })

  await transporter.sendMail({
    from: `TutorLive <${process.env.GMAIL_USER}>`,
    to,
    subject: `✅ Session confirmed: ${subject} with ${tutorName}`,
    html: `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#fbf8f1;">
        <div style="background:#243149;padding:24px 32px;border-radius:16px;text-align:center;margin-bottom:32px;">
          <h1 style="color:#f29a63;margin:0;font-size:26px;font-weight:700;letter-spacing:-0.5px;">TutorLive</h1>
          <p style="color:#aeb9c7;margin:6px 0 0;font-size:13px;">Live tutoring, done right.</p>
        </div>
        <h2 style="color:#243149;font-size:20px;margin:0 0 8px;">Your session is confirmed! 🎉</h2>
        <p style="color:#6b7280;margin:0 0 24px;">Hi ${studentName}, here are your session details:</p>
        <div style="background:#fff;border:1px solid #e5ded3;border-radius:12px;padding:24px;margin-bottom:28px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px;width:90px;">Subject</td><td style="padding:8px 0;color:#243149;font-weight:600;">${subject}</td></tr>
            <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px;">Tutor</td><td style="padding:8px 0;color:#243149;font-weight:600;">${tutorName}</td></tr>
            <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px;">When</td><td style="padding:8px 0;color:#243149;font-weight:600;">${dateStr}</td></tr>
          </table>
        </div>
        <div style="text-align:center;margin-bottom:32px;">
          <a href="${sessionUrl}" style="display:inline-block;background:#f29a63;color:#243149;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">Join Session Room →</a>
        </div>
        <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">This link will be active at the time of your session.</p>
      </div>
    `,
  })
}

export async function sendBookingRequest({
  to,
  tutorName,
  studentName,
  subject,
  scheduledAt,
  dashboardUrl,
}: {
  to: string
  tutorName: string
  studentName: string
  subject: string
  scheduledAt: Date
  dashboardUrl: string
}) {
  const dateStr = new Date(scheduledAt).toLocaleString('en-GB', {
    dateStyle: 'full',
    timeStyle: 'short',
  })

  await transporter.sendMail({
    from: `TutorLive <${process.env.GMAIL_USER}>`,
    to,
    subject: `📚 New booking request: ${subject} from ${studentName}`,
    html: `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#fbf8f1;">
        <div style="background:#243149;padding:24px 32px;border-radius:16px;text-align:center;margin-bottom:32px;">
          <h1 style="color:#f29a63;margin:0;font-size:26px;font-weight:700;">TutorLive</h1>
        </div>
        <h2 style="color:#243149;font-size:20px;margin:0 0 8px;">New session request, ${tutorName}!</h2>
        <p style="color:#6b7280;margin:0 0 24px;">${studentName} wants to book a session with you:</p>
        <div style="background:#fff;border:1px solid #e5ded3;border-radius:12px;padding:24px;margin-bottom:28px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px;width:90px;">Subject</td><td style="padding:8px 0;color:#243149;font-weight:600;">${subject}</td></tr>
            <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px;">Student</td><td style="padding:8px 0;color:#243149;font-weight:600;">${studentName}</td></tr>
            <tr><td style="padding:8px 0;color:#9ca3af;font-size:13px;">Requested</td><td style="padding:8px 0;color:#243149;font-weight:600;">${dateStr}</td></tr>
          </table>
        </div>
        <div style="text-align:center;">
          <a href="${dashboardUrl}" style="display:inline-block;background:#243149;color:#f29a63;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">Accept or Decline →</a>
        </div>
      </div>
    `,
  })
}
