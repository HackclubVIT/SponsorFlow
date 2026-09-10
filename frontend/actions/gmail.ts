'use server';

import { google } from 'googleapis';
import MailComposer from 'nodemailer/lib/mail-composer';
import { prisma } from '../lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../app/api/auth/[...nextauth]/route';
import { marked } from 'marked';

const getGmailClient = () => {
  return new google.auth.OAuth2(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    // Redirect URI isn't strictly needed just to send emails with a refresh token,
    // but NextAuth uses a specific one.
    process.env.NEXTAUTH_URL + '/api/auth/callback/google'
  );
};

const getAuthenticatedGmailClient = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  if (!user || (!user.gmailAccessToken && !user.gmailRefreshToken)) {
    throw new Error('Gmail not connected or tokens missing. Please sign out and sign in again to refresh your connection.');
  }

  const oauth2Client = getGmailClient();
  oauth2Client.setCredentials({
    access_token: user.gmailAccessToken,
    refresh_token: user.gmailRefreshToken,
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
};

const createMimeEmail = async (
  to: string,
  subject: string,
  body: string
) => {
  const boundary = 'outreach-boundary-' + Date.now().toString(16);
  let raw = `To: ${to}\r\n`;
  raw += `Cc: hackclubfinance@gmail.com\r\n`;
  raw += `Subject: ${subject}\r\n`;
  raw += `MIME-Version: 1.0\r\n`;
  raw += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;
  
  raw += `--${boundary}\r\n`;
  raw += `Content-Type: text/plain; charset="UTF-8"\r\n\r\n`;
  raw += `${body}\r\n\r\n`;
  
  const htmlBody = await marked.parse(body);
  
  raw += `--${boundary}\r\n`;
  raw += `Content-Type: text/html; charset="UTF-8"\r\n\r\n`;
  raw += `${htmlBody}\r\n\r\n`;
  
  raw += `--${boundary}--`;
  
  return Buffer.from(raw)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

export async function sendEmail(companyId: string, subject: string, body: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Unauthorized');
  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { assignment: true }
  });

  if (!company) throw new Error('Company not found');
  if (!company.email) throw new Error('Company has no email address');

  if (company.status === 'CONFIRMED' || company.status === 'REJECTED') {
    throw new Error('Cannot send emails to a confirmed or rejected company.');
  }

  if (company.status === 'NOT_ASSIGNED') {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const hasValidLock = company.lockedById === userId && 
                         company.lockedAt && 
                         company.lockedAt > fiveMinutesAgo;
    
    if (!hasValidLock) {
      throw new Error('You must lock this company before sending the first email.');
    }
  } else {
    if (company.assignment?.userId !== userId && userRole !== 'ADMIN') {
      throw new Error('Forbidden: Company assigned to another member.');
    }
  }

  const gmail = await getAuthenticatedGmailClient(userId);

  // 3-day cool-down for non-admins
  if (userRole !== 'ADMIN') {
    const lastEmail = await prisma.email.findFirst({
      where: { companyId, status: 'SENT' },
      orderBy: { sentAt: 'desc' }
    });
    
    if (lastEmail && lastEmail.sentAt) {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      if (lastEmail.sentAt > threeDaysAgo) {
        throw new Error('Cool-down active: Members must wait at least 3 days before sending another email to this company.');
      }
    }
  }

  const rawMessage = await createMimeEmail(company.email, subject, body);

  try {
    const sendResult = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: rawMessage,
      },
    });
    var messageId = sendResult.data.id;
    var threadId = sendResult.data.threadId;
  } catch (error: any) {
    console.error('Gmail API Error:', error);
    if (error.code === 429) {
      throw new Error('Gmail API rate limit exceeded. Please try again later.');
    }
    if (error.code === 400 && error.message.includes('invalid recipient')) {
      throw new Error('Invalid email recipient address.');
    }
    throw new Error(`Failed to send email: ${error.message}`);
  }

  // Record interaction
  await prisma.email.create({
    data: {
      subject,
      body,
      recipient: company.email,
      status: 'SENT',
      sentAt: new Date(),
      companyId,
      senderId: userId,
      messageId: typeof messageId !== 'undefined' ? messageId : undefined,
      threadId: typeof threadId !== 'undefined' ? threadId : undefined
    }
  });

  await prisma.assignment.upsert({
    where: { companyId },
    update: { userId },
    create: { companyId, userId }
  });

  const newStatus = (company.status === 'NOT_ASSIGNED' || company.status === 'ASSIGNED') ? 'EMAIL_SENT' : company.status;

  await prisma.company.update({
    where: { id: companyId },
    data: { 
      status: newStatus,
      lockedById: null,
      lockedAt: null
    }
  });

  await prisma.activity.create({
    data: { companyId, type: 'EMAIL_SENT', description: `Email sent: ${subject}`, userId }
  });

  return { success: true };
}


export async function sendEmailWithAttachments(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;

  const companyId = formData.get("companyId") as string;
  const subject = formData.get("subject") as string;
  const body = formData.get("body") as string;
  
  if (!companyId || !subject || !body) {
    throw new Error("Missing required fields");
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { assignment: true }
  });

  if (!company) throw new Error("Company not found");
  if (!company.email) throw new Error("Company has no email address");

  if (company.status === "CONFIRMED" || company.status === "REJECTED") {
    throw new Error("Cannot send emails to a confirmed or rejected company.");
  }

  if (company.status === "NOT_ASSIGNED") {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const hasValidLock = company.lockedById === userId && 
                         company.lockedAt && 
                         company.lockedAt > fiveMinutesAgo;
    
    if (!hasValidLock) {
      throw new Error("You must lock this company before sending the first email.");
    }
  } else {
    if (company.assignment?.userId !== userId && userRole !== "ADMIN") {
      throw new Error("Forbidden: Company assigned to another member.");
    }
  }

  const gmail = await getAuthenticatedGmailClient(userId);
  
  // 3-day cool-down for non-admins
  if (userRole !== 'ADMIN') {
    const lastEmail = await prisma.email.findFirst({
      where: { companyId, status: 'SENT' },
      orderBy: { sentAt: 'desc' }
    });
    
    if (lastEmail && lastEmail.sentAt) {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      if (lastEmail.sentAt > threeDaysAgo) {
        throw new Error('Cool-down active: Members must wait at least 3 days before sending another email to this company.');
      }
    }
  }

  const attachments = [];
  // formData.getAll("attachments") gets all files appended
  const fileEntries = formData.getAll("attachments");
  for (const entry of fileEntries) {
    if (entry instanceof File && entry.size > 0) {
      const buffer = Buffer.from(await entry.arrayBuffer());
      attachments.push({
        filename: entry.name,
        content: buffer,
        contentType: entry.type
      });
    }
  }

  const htmlBody = await marked.parse(body);

  const mail = new MailComposer({
    to: company.email,
    cc: 'hackclubfinance@gmail.com',
    subject: subject,
    text: body,
    html: htmlBody,
    attachments: attachments
  });

  const mailBuffer = await new Promise<Buffer>((resolve, reject) => {
    mail.compile().build((err, message) => {
      if (err) reject(err);
      else resolve(message);
    });
  });

  const rawMessage = mailBuffer.toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  try {
    const sendResult = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: rawMessage,
      },
    });
    var sentMessageId = sendResult.data.id;
    var sentThreadId = sendResult.data.threadId;
  } catch (error: any) {
    console.error("Gmail API Error:", error);
    if (error.code === 429) {
      throw new Error("Gmail API rate limit exceeded. Please try again later.");
    }
    if (error.code === 400 && error.message.includes("invalid recipient")) {
      throw new Error("Invalid email recipient address.");
    }
    throw new Error(`Failed to send email: ${error.message}`);
  }

  await prisma.email.create({
    data: {
      subject,
      body,
      recipient: company.email,
      status: "SENT",
      sentAt: new Date(),
      companyId,
      senderId: userId,
      messageId: sentMessageId || null,
      threadId: sentThreadId || null
    }
  });

  await prisma.assignment.upsert({
    where: { companyId },
    update: { userId },
    create: { companyId, userId }
  });

  const newStatus = (company.status === 'NOT_ASSIGNED' || company.status === 'ASSIGNED') ? 'EMAIL_SENT' : company.status;

  await prisma.company.update({
    where: { id: companyId },
    data: { 
      status: newStatus,
      lockedById: null,
      lockedAt: null
    }
  });

  await prisma.activity.create({
    data: { companyId, type: "EMAIL_SENT", description: `Email sent: ${subject}`, userId }
  });

  return { success: true };
}



export async function syncInboxReplies() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  const userId = (session.user as any).id;

  const gmail = await getAuthenticatedGmailClient(userId);

  // Find all outbound emails that have a threadId and haven't been replied to yet,
  // or where we just want to sync recent threads.
  const recentEmails = await prisma.email.findMany({
    where: { 
      senderId: userId,
      threadId: { not: null },
      company: { status: { in: ['EMAIL_SENT', 'REPLIED'] } } 
    },
    include: { company: true },
    orderBy: { sentAt: 'desc' },
    take: 50 // Limit to recent 50 threads for performance
  });

  let newRepliesCount = 0;

  for (const email of recentEmails) {
    if (!email.threadId) continue;
    
    try {
      // Fetch the thread from Gmail
      const thread = await gmail.users.threads.get({
        userId: 'me',
        id: email.threadId,
      });

      if (!thread.data || !thread.data.messages) continue;

      // Check messages in this thread
      for (const message of thread.data.messages) {
        // Skip the original outbound message we already tracked
        if (message.id === email.messageId) continue;

        // Extract sender and content
        const headers = message.payload?.headers || [];
        const fromHeader = headers.find(h => h.name?.toLowerCase() === 'from')?.value || 'Unknown Sender';
        
        // Ensure the message is actually inbound (not another sent message from us)
        const isFromUs = fromHeader.includes(session.user?.email || '');
        if (isFromUs) continue;

        // Check if we already logged this reply
        const existingReply = await prisma.reply.findUnique({
          where: { messageId: message.id! }
        });

        if (!existingReply) {
          // Decode body
          let bodyData = '';
          const parts = message.payload?.parts || [message.payload];
          const textPart = parts.find(p => p?.mimeType === 'text/plain') || parts[0];
          
          if (textPart?.body?.data) {
            bodyData = Buffer.from(textPart.body.data, 'base64').toString('utf8');
          } else {
            bodyData = message.snippet || 'No text content found.';
          }

          // Save the reply
          await prisma.reply.create({
            data: {
              companyId: email.companyId,
              emailId: email.id,
              sender: fromHeader,
              content: bodyData,
              messageId: message.id
            }
          });

          // Update company status to REPLIED if it was EMAIL_SENT
          if (email.company.status === 'EMAIL_SENT') {
            await prisma.company.update({
              where: { id: email.companyId },
              data: { status: 'REPLIED' }
            });
          }

          // Add Activity
          await prisma.activity.create({
            data: {
              companyId: email.companyId,
              userId: userId,
              type: 'EMAIL_REPLY',
              description: 'Received a reply from ' + fromHeader
            }
          });

          newRepliesCount++;
        }
      }
    } catch (err) {
      console.error('Failed to sync thread ' + email.threadId, err);
    }
  }

  return { success: true, count: newRepliesCount };
}
