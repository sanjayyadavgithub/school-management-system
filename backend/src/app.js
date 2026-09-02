require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const classRoutes = require('./routes/classRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const feeRoutes = require('./routes/feeRoutes');
const chatRoutes = require('./routes/chatRoutes');
const materialRoutes = require('./routes/materialRoutes');
const homeworkRoutes = require('./routes/homeworkRoutes');
const noticeRoutes = require('./routes/noticeRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const examRoutes = require('./routes/examRoutes');
const aiRoutes = require('./routes/aiRoutes');
const attendanceIntegrationRoutes = require('./routes/attendanceIntegrationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const libraryRoutes = require('./routes/libraryRoutes');
const lmsRoutes = require('./routes/lmsRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const alumniRoutes = require('./routes/alumniRoutes');
const videoMeetingRoutes = require('./routes/videoMeetingRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const complianceRoutes = require('./routes/complianceRoutes');
const contactRoutes = require('./routes/contactRoutes');
const questionRoutes = require('./routes/questionRoutes');

// Import Models for socket DB logger
const ChatMessage = require('./models/ChatMessage');

const app = express();
const server = http.createServer(app);

// Configure CORS to allow frontend connections on dynamic ports
const corsOptions = {
  origin: '*', // In development, allow broad access
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

// Serve uploads locally
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Mount API Route Namespaces
app.use('/api/auth', authRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/timetables', timetableRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/attendance/integration', attendanceIntegrationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/lms', lmsRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/alumni', alumniRoutes);
app.use('/api/meetings', videoMeetingRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/questions', questionRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Default status and seed check route
app.get('/', async (req, res) => {
  const User = require('./models/User');
  try {
    const superAdmin = await User.findOne({ role: 'SuperAdmin' });
    res.status(200).json({
      status: 'active',
      system: 'SMS Multi-Tenant Backend',
      superadmin: superAdmin ? 'seeded' : 'missing'
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Configure Socket.IO Server
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  }
});

// Store active connections mapped by userId -> socketId
const activeSockets = new Map();

io.on('connection', (socket) => {
  console.log(`Socket client connected: ${socket.id}`);

  // Authenticate socket user and join tenant room
  socket.on('setup', (userData) => {
    if (userData && userData.id && userData.schoolId) {
      socket.userId = userData.id;
      socket.schoolId = userData.schoolId;

      activeSockets.set(userData.id, socket.id);

      // Join school-specific room for message scoping
      const schoolRoom = `school_${userData.schoolId}`;
      socket.join(schoolRoom);
      console.log(`User ${userData.id} joined room: ${schoolRoom}`);

      socket.emit('connected');
    }
  });

  // Handle incoming private chat message
  socket.on('send_message', async (messageData) => {
    // messageData: { senderId, receiverId, message, schoolId }
    const { senderId, receiverId, message, schoolId } = messageData;

    try {
      if (!senderId || !receiverId || !message || !schoolId) return;

      // Log to MongoDB
      const savedMessage = await ChatMessage.create({
        schoolId,
        senderId,
        receiverId,
        message,
      });

      // Emit to receiver if online
      const receiverSocketId = activeSockets.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('message_received', savedMessage);
      }

      // Emit back to sender for confirmation
      socket.emit('message_sent', savedMessage);
    } catch (err) {
      console.error('Socket message processing error:', err.message);
    }
  });

  // Clean up on disconnect
  socket.on('disconnect', () => {
    if (socket.userId) {
      activeSockets.delete(socket.userId);
      console.log(`User ${socket.userId} disconnected`);
    }
  });
});

// Seed Initial Super Admin Account on startup (if not already exists)
const seedSuperAdmin = async () => {
  const User = require('./models/User');
  try {
    const email = 'superadmin@gmail.com';
    let superAdmin = await User.findOne({ email });
    if (!superAdmin) {
      // Clear out any other old SuperAdmin roles to avoid tenant/creds confusion
      await User.deleteMany({ role: 'SuperAdmin' });
      await User.create({
        name: 'SaaS Application Owner',
        email,
        password: 'SuperAdmin9336@',
        role: 'SuperAdmin',
        phone: '1234567890',
        isActive: true,
      });
      console.log(`Seeded Initial Super Admin credentials successfully.`);
      console.log(`Email: ${email}`);
      console.log(`Password: SuperAdmin9336@`);
    }
  } catch (err) {
    console.error('Super Admin seeding warning:', err.message);
  }
};

const PORT = process.env.PORT || 50001;

// Connect to Database and start Server
connectDB().then(async () => {
  await seedSuperAdmin();
  server.listen(PORT, () => {
    console.log(`Server listening on Port: ${PORT}`);
  });
});
