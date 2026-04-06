import pkg from "@getbrevo/brevo";
const { ApiClient, TransactionalEmailsApi } = pkg;
import dotenv from "dotenv";

dotenv.config();

if (!process.env.BREVO_API_KEY) {
  throw new Error("Missing BREVO_API_KEY");
}

if (!process.env.EMAIL_FROM) {
  throw new Error("Missing EMAIL_FROM");
}

const apiClient = new ApiClient();
apiClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

const client = new TransactionalEmailsApi(apiClient);

export default client;