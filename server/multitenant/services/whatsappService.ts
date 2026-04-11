import axios from "axios";
import { env } from "../env.js";
import logger from "../logger.js";

const BASE = `https://graph.facebook.com/${env.META_API_VERSION}`;

export const whatsappService = {
  async sendText(phone: string, body: string): Promise<string> {
    const res = await axios.post(
      `${BASE}/${env.META_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: phone.replace(/\D/g, ""),
        type: "text",
        text: { body },
      },
      {
        headers: {
          Authorization: `Bearer ${env.META_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    const wamid = res.data?.messages?.[0]?.id as string;
    logger.debug({ phone, wamid }, "WhatsApp message sent");
    return wamid;
  },

  async sendTemplate(
    phone: string,
    templateName: string,
    components: unknown[]
  ): Promise<string> {
    const res = await axios.post(
      `${BASE}/${env.META_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: phone.replace(/\D/g, ""),
        type: "template",
        template: {
          name: templateName,
          language: { code: "en" },
          components,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${env.META_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    return res.data?.messages?.[0]?.id as string;
  },

  async verifyWebhookSignature(body: Buffer, signature: string): Promise<boolean> {
    const crypto = await import("crypto");
    const expected = `sha256=${crypto
      .createHmac("sha256", env.META_APP_SECRET ?? "")
      .update(body)
      .digest("hex")}`;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  },
};
