const http = require('http');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { attachIO } = require('./config/websocket');
const { configureCloudinary } = require('./config/cloudinary');

dotenv.config();

const app = express();

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: corsOrigin === '*' ? true : [corsOrigin], credentials: true }));

configureCloudinary();

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/chats', require('./routes/chatRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/secure_chat';

const server = http.createServer(app);

(async () => {
  await connectDB(MONGO_URI);
  attachIO(server, { cors: { origin: corsOrigin === '*' ? true : [corsOrigin], credentials: true } });
  server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
})();

module.exports = app;
