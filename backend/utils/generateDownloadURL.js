import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3 from "../config/s3.js";

/**
 * Generate a signed download URL for an S3 object.
 * @param fileKey - S3 key for the target file.
 * @param expiryTime - Expiration time in seconds for the URL.
 * @returns A signed URL string for file download.
 */
export const generateDownloadUrl = async (fileKey, expiryTime) => {
    const command = new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileKey
    });

    const url = await getSignedUrl(s3, command, {
        expiresIn: expiryTime
    });

    return url;
};