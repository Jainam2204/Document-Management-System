import client from "../config/email.js";
import dotenv from "dotenv";

dotenv.config();

const sendEmail = async ({
    to,
    subject,
    text,
    html
}) => {
    try {
        const response = await client.sendTransacEmail({
            sender: {
                email: process.env.EMAIL_FROM,
                name: process.env.EMAIL_FROM_NAME || "Team DMS",
            },
            to: [
                {
                    email: to,
                },
            ],
            subject,
            textContent: text,
            htmlContent: html || `<p>${text}</p>`,
        });

        console.log("Email sent!", response);
        return response;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
};

export default sendEmail;