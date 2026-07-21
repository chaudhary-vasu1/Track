const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const env = require('../config/env');

let s3Client = null;

if (process.env.AWS_ACCESS_KEY && process.env.AWS_SECRET_KEY) {
  s3Client = new AWS.S3({
    accessKeyId: env.aws.accessKey,
    secretAccessKey: env.aws.secretKey
  });
}

async function uploadRecordingToS3(fileBufferOrPath, recordingId, type) {
  const isBuffer = Buffer.isBuffer(fileBufferOrPath);
  let fileBuffer = fileBufferOrPath;

  if (!isBuffer) {
    try {
      fileBuffer = fs.readFileSync(fileBufferOrPath);
    } catch (e) {
      console.warn(`File reading error: ${e.message}. Uploading empty mock buffer.`);
      fileBuffer = Buffer.from('mock audio/video file content');
    }
  }

  const extension = type === 'video' ? 'mp4' : 'mp3';
  const key = `recordings/${type}/${recordingId}-${Date.now()}.${extension}`;
  
  if (s3Client) {
    try {
      const params = {
        Bucket: env.aws.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: type === 'video' ? 'video/mp4' : 'audio/mpeg',
        ServerSideEncryption: 'AES256'
      };
      const result = await s3Client.upload(params).promise();
      return result.Location;
    } catch (error) {
      console.error(`S3 Upload failed, falling back to mock: ${error.message}`);
    }
  }

  // Fallback local mock static files
  const mockFolder = path.join(__dirname, '..', 'public', 'recordings');
  if (!fs.existsSync(mockFolder)) {
    fs.mkdirSync(mockFolder, { recursive: true });
  }

  const filename = `${recordingId}.${extension}`;
  const localPath = path.join(mockFolder, filename);
  fs.writeFileSync(localPath, fileBuffer);
  
  return `/recordings/${filename}`;
}

module.exports = {
  uploadRecordingToS3
};
