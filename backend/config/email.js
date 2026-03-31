import { TransactionalEmailsApi, TransactionalEmailsApiApiKeys } from '@getbrevo/brevo';
import dotenv from "dotenv/config";
import logger from"../utils/logger";

if (!process.env.BREVO_API_KEY) {
    throw new Error("Missing required environment variable: BREVO_API_KEY");
}

if (!process.env.EMAIL_FROM) {
    throw new Error("Missing required environment variable: EMAIL_FROM");
}

const apiInstance = new TransactionalEmailsApi();

apiInstance.setApiKey(
    TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY
);

logger.info("Brevo API initialized successfully");
logger.info(`Default sender: ${process.env.EMAIL_FROM}`);

module.exports = apiInstance;