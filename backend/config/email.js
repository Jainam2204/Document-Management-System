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