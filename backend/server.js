const express = require('express');
const cors = require('cors');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const connectDB = require('./config/database');
const registerSocketHandlers = require('./sockets/index');
const alertService = require('./services/alert.service');

// Route imports
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/device');
const surveillanceRoutes = require('./routes/surveillance');
const monitoringRoutes = require('./routes/monitoring');
const alertRoutes = require('./routes/alerts');
const uploadRoutes = require('./routes/upload');

// Environment config
const config = require('./config/env');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve mock recordings statically
app.use('/recordings', express.static(path.join(__dirname, 'public', 'recordings')));
// Serve static client build if deployed
app.use(express.static(path.join(__dirname, 'public')));

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api/surveillance', surveillanceRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/upload', uploadRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'CropCure Parental Control API Server is running' });
});

// Select HTTP or HTTPS protocol based on certificates availability
let server;
const certsPath = path.join(__dirname, 'certs');
const keyPath = path.join(certsPath, 'private-key.pem');
const certPath = path.join(certsPath, 'certificate.pem');

let isHttps = false;
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  try {
    const options = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };
    server = https.createServer(options, app);
    isHttps = true;
    console.log('SSL Certificates found. Starting server in HTTPS mode.');
  } catch (error) {
    console.error(`Error loading certificates: ${error.message}. Falling back to HTTP.`);
    server = http.createServer(app);
  }
} else {
  console.warn('HTTPS certificates not found at ./certs/private-key.pem. Starting server in HTTP mode.');
  server = http.createServer(app);
}

// Bind socket.io with buffer, ping tolerance & transport options
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e8
});

// Wire alert service with socket.io for real-time push
alertService.setSocketIO(io);

// Register WebSocket signaling and command flows
registerSocketHandlers(io);

// Handle EADDRINUSE gracefully
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n⚠️ PORT IN USE: Port ${PORT} is already in use by another process.`);
    console.error(`Please stop the existing server instance using port ${PORT}.\n`);
    process.exit(1);
  } else {
    console.error('Server error:', error.message);
  }
});

// Connect to MongoDB & Start Listening
const PORT = config.server.port;
connectDB().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on ${isHttps ? 'https' : 'http'}://0.0.0.0:${PORT} (Accessible via http://192.168.1.24:${PORT})`);
  });
});
