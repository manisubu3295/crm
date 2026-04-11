import axios from "axios";
import { env } from "../env.js";
import logger from "../logger.js";

// Exotel IVR — outbound call
export const ivrService = {
  async initiateCall(phone: string, appId: string): Promise<string> {
    const mobile = phone.replace(/\D/g, "");
    const toNumber = mobile.startsWith("0") ? mobile : `0${mobile}`;

    const url = `https://${env.EXOTEL_API_KEY}:${env.EXOTEL_API_TOKEN}@${env.EXOTEL_SUBDOMAIN}/v1/Accounts/${env.EXOTEL_SID}/Calls/connect.json`;

    const params = new URLSearchParams({
      From: toNumber,
      To: env.EXOTEL_CALLER_ID ?? "",
      CallerId: env.EXOTEL_CALLER_ID ?? "",
      Url: `http://my.exotel.com/${env.EXOTEL_SID}/exoml/start_voice/${appId}`,
      StatusCallback: `${process.env.APP_PUBLIC_URL ?? ""}/api/webhooks/exotel/status`,
      StatusCallbackContentType: "application/json",
    });

    const res = await axios.post(url, params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const callSid = res.data?.Call?.Sid as string;
    logger.debug({ phone, callSid }, "IVR call initiated via Exotel");
    return callSid;
  },
};
