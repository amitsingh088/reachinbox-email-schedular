import nodemailer from 'nodemailer';
import { env } from '../config/env';

let transporter: nodemailer.Transporter | null = null;
let etherealAccount: { user: string; pass: string } | null = null;

export const getTransporter = async (): Promise<nodemailer.Transporter> => {
  if (transporter) return transporter;

  if (env.ETHEREAL_USER && env.ETHEREAL_PASS) {
    etherealAccount = { user: env.ETHEREAL_USER, pass: env.ETHEREAL_PASS };
  } else {
    // Create a test account on Ethereal
    const testAccount = await nodemailer.createTestAccount();
    etherealAccount = { user: testAccount.user, pass: testAccount.pass };
    console.log('📧 Ethereal Email Account Created:');
    console.log(`   User: ${testAccount.user}`);
    console.log(`   Pass: ${testAccount.pass}`);
    console.log(`   Preview URL: https://ethereal.email`);
  }

  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: etherealAccount.user,
      pass: etherealAccount.pass,
    },
  });

  return transporter;
};

export interface SendEmailParams {
  from: string;
  to: string;
  subject: string;
  body: string;
}

export const sendEmail = async (params: SendEmailParams): Promise<{ messageId: string; previewUrl: string | false }> => {
  const transport = await getTransporter();

  const info = await transport.sendMail({
    from: params.from,
    to: params.to,
    subject: params.subject,
    html: params.body,
    text: params.body.replace(/<[^>]*>/g, ''),
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log(`📨 Email sent to ${params.to} | Message ID: ${info.messageId}`);
  if (previewUrl) {
    console.log(`   Preview: ${previewUrl}`);
  }

  return { messageId: info.messageId, previewUrl };
};
