import axios from "axios";
import { env } from "../env.js";
import logger from "../logger.js";

// Msg91 transactional SMS
export const smsService = {
  async send(phone: string, message: string): Promise<string> {
    const mobileNo = phone.replace(/\D/g, "");
    const mobile = mobileNo.startsWith("91") ? mobileNo : `91${mobileNo}`;

    const res = await axios.post(
      "https://api.msg91.com/api/v5/flow/",
      {
        template_id: env.MSG91_OTP_TEMPLATE_ID,
        short_url: "0",
        realTimeResponse: "1",
        recipients: [{ mobiles: mobile, message }],
      },
      {
        headers: {
          authkey: env.MSG91_AUTH_KEY ?? "",
          "Content-Type": "application/json",
        },
      }
    );

    const msgId = (res.data?.request_id as string) ?? `msg91-${Date.now()}`;
    logger.debug({ mobile, msgId }, "SMS sent via Msg91");
    return msgId;
  },

  async sendOtp(phone: string, otp: string): Promise<string> {
    const mobile = phone.replace(/\D/g, "");
    const res = await axios.post(
      `https://api.msg91.com/api/v5/otp?template_id=${env.MSG91_OTP_TEMPLATE_ID}&mobile=91${mobile}&otp=${otp}`,
      {},
      { headers: { authkey: env.MSG91_AUTH_KEY ?? "" } }
    );
    return res.data?.request_id ?? "";
  },
};
