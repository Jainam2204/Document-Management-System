const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3 = require("../config/s3");
const { v4: uuidv4 } = require("uuid");
 
export default getUploadUrl = async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
 
    const key = `uploads/${req.user.id}/${uuidv4()}-${fileName}`;
 
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });
 
    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: 60,
    });
 
    res.json({ uploadUrl, key });
 
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};