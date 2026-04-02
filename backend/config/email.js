// import { TransactionalEmailsApi, TransactionalEmailsApiApiKeys } from "@getbrevo/brevo";
// import dotenv from "dotenv/config";

// if (!process.env.BREVO_API_KEY) {
//     throw new Error("Missing BREVO_API_KEY");
// }

// if (!process.env.EMAIL_FROM) {
//     throw new Error("Missing EMAIL_FROM");
// }

// const apiInstance = new TransactionalEmailsApi();

// apiInstance.setApiKey(
//     TransactionalEmailsApiApiKeys.apiKey,
//     process.env.BREVO_API_KEY
// );

// export default apiInstance;


import { BrevoClient } from "@getbrevo/brevo";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.BREVO_API_KEY) {
  throw new Error("Missing BREVO_API_KEY");
}

if (!process.env.EMAIL_FROM) {
  throw new Error("Missing EMAIL_FROM");
}

const client = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
});

export default client;