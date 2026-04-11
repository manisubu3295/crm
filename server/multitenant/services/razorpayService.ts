import axios from "axios";
import crypto from "crypto";
import { env } from "../env.js";
import logger from "../logger.js";

const BASE = "https://api.razorpay.com/v1";

function authHeader() {
  const cred = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
  return { Authorization: `Basic ${cred}`, "Content-Type": "application/json" };
}

export const razorpayService = {
  isConfigured(): boolean {
    return !!(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
  },

  /** Create a Razorpay payment link and return the short URL */
  async createPaymentLink(opts: {
    amount: number;        // in rupees (will be converted to paise)
    leadName: string;
    leadPhone: string;
    leadEmail?: string;
    description: string;
    receiptId: string;
    expireBy?: Date;       // optional expiry
  }): Promise<{ id: string; short_url: string }> {
    if (!this.isConfigured()) {
      throw new Error("Razorpay credentials not configured");
    }

    const body: Record<string, unknown> = {
      amount: Math.round(opts.amount * 100),  // paise
      currency: "INR",
      accept_partial: false,
      description: opts.description,
      receipt: opts.receiptId,
      customer: {
        name: opts.leadName,
        contact: opts.leadPhone.replace(/\D/g, ""),
        ...(opts.leadEmail ? { email: opts.leadEmail } : {}),
      },
      notify: { sms: true, email: !!opts.leadEmail, whatsapp: false },
      reminder_enable: true,
    };

    if (opts.expireBy) {
      body["expire_by"] = Math.floor(opts.expireBy.getTime() / 1000);
    }

    const res = await axios.post(`${BASE}/payment_links`, body, { headers: authHeader() });
    logger.info({ receiptId: opts.receiptId, linkId: res.data.id }, "Razorpay payment link created");
    return { id: res.data.id, short_url: res.data.short_url };
  },

  /** Verify webhook signature from Razorpay */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
    const expected = crypto
      .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");
    return signature === expected;
  },
};
