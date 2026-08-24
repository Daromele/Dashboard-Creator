/**
 * Magic-link delivery.
 *
 * When SMTP_URL is configured the link is emailed. Otherwise it is written to
 * the server log and handed back to the caller so a self-hosted or local
 * install still has a working, real sign-in flow (no fake button, no bypass).
 */

import nodemailer from "nodemailer";

export interface DeliveryResult {
  delivered: boolean;
  /** Present only when SMTP is not configured, for local/self-hosted use. */
  link?: string;
}

export async function sendMagicLink(email: string, link: string): Promise<DeliveryResult> {
  const smtpUrl = process.env.SMTP_URL;
  if (!smtpUrl) {
    console.info(`[money-power] Sign-in link for ${email}: ${link}`);
    return { delivered: false, link };
  }

  const transport = nodemailer.createTransport(smtpUrl);
  await transport.sendMail({
    to: email,
    from: process.env.MAIL_FROM ?? "Money Power <no-reply@money-power.app>",
    subject: "Your Money Power sign-in link",
    text: `Sign in to Money Power:\n\n${link}\n\nThis link can be used once and expires in 20 minutes.`,
    html:
      `<p>Sign in to Money Power:</p>` +
      `<p><a href="${link}">Open Money Power</a></p>` +
      `<p style="color:#494544;font-size:13px">This link can be used once and expires in 20 minutes.</p>`,
  });
  return { delivered: true };
}
