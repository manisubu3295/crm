import axios from "axios";
import { env } from "../env.js";
import logger from "../logger.js";

export const emailService = {
  async send(
    to: string,
    subject: string,
    htmlBody: string,
    toName?: string
  ): Promise<string> {
    if (!to) throw new Error("Email recipient is empty");

    const payload = {
      personalizations: [{ to: [{ email: to, name: toName ?? to }] }],
      from: { email: env.EMAIL_FROM, name: env.EMAIL_FROM_NAME },
      subject,
      content: [{ type: "text/html", value: htmlBody }],
    };

    const res = await axios.post(
      "https://api.sendgrid.com/v3/mail/send",
      payload,
      {
        headers: {
          Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // SendGrid returns message id in X-Message-Id header
    const msgId = (res.headers["x-message-id"] as string) ?? `sg-${Date.now()}`;
    logger.debug({ to, subject, msgId }, "Email sent via SendGrid");
    return msgId;
  },
};
