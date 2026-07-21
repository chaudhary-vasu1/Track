require('dotenv').config();

const config = {
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/cropcure',
  jwtSecret: process.env.JWT_SECRET || 'fallback_development_secret_key_minimum_32_chars_long',
  aws: {
    accessKey: process.env.AWS_ACCESS_KEY || 'mock_access_key',
    secretKey: process.env.AWS_SECRET_KEY || 'mock_secret_key',
    bucketName: process.env.AWS_BUCKET_NAME || 'cropcure-recordings'
  },
  server: {
    url: process.env.BACKEND_URL || 'https://localhost:8443',
    port: process.env.BACKEND_PORT || 8443,
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    user: process.env.SMTP_USER || 'placeholder@gmail.com',
    pass: process.env.SMTP_PASS || 'placeholder'
  },
  webrtc: {
    turnServer: process.env.TURN_SERVER || 'turn:stun.l.google.com:19302',
    turnUsername: process.env.TURN_USERNAME || '',
    turnPassword: process.env.TURN_PASSWORD || ''
  }
};

module.exports = config;
