import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3 from "../config/s3.js";


export const generateDownloadUrl = async (fileKey, expiryTime, fileName) => {
    const commandParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileKey,
    };

    if (fileName) {
        commandParams.ResponseContentDisposition = `attachment; filename="${fileName}"`;
    }

    const command = new GetObjectCommand(commandParams);

    const url = await getSignedUrl(s3, command, {
        expiresIn: expiryTime
    });

    return url;
};