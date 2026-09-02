# 🏫 School Management System (SMS) - Monorepo

A comprehensive, multi-tenant **School Management System (SMS)** built with **Node.js, Express, MongoDB, Socket.io, React 19, and React Native**. This repository is structured as a monorepo containing the backend API server, web client, and mobile application.

---

## 📁 Repository Structure

```text
SMS/
├── backend/       # Node.js + Express REST API & Socket.io Real-time Server
├── frontend/      # React 19 Web Portal (Admin, Teacher, Student, Parent)
├── mobile/        # React Native Cross-Platform Mobile Application (Android & iOS)
├── package.json   # Root Monorepo configuration & scripts
└── .gitignore     # Centralized Git ignore rules
```

---

## ✨ Key Features

### 🏢 Multi-School & User Management
- **Multi-Tenant Support**: Manage multiple schools with isolated data boundaries.
- **Role-Based Access Control (RBAC)**: Custom permissions for Super Admin, School Admin, Teachers, Students, and Parents.
- **Audit Logs**: Complete activity logging for security and compliance.

### 📚 Academic & LMS Management
- **Classes, Subjects & Timetables**: Dynamic scheduling for classes, subjects, and teachers.
- **Homework & Assignments**: Online submission, evaluation, and grade management.
- **Study Material & LMS**: Centralized repository for learning materials and video lectures.
- **Exams & Assessments**: Online testing, question banks, automated grading, and result generation.

### ⏱️ Attendance & Biometrics
- **Daily Attendance**: Track student and staff attendance with real-time status.
- **Biometric Integration**: API endpoints for hardware/biometric attendance devices.
- **Leave Management**: Leave application and approval workflows for teachers and students.

### 💳 Finance & Operations
- **Fee Management**: Custom fee structures, concession rules, payment tracking, and receipt generation.
- **Payroll System**: Salary processing, allowances, deductions, and payslip generation.
- **Library Management**: Book inventory tracking, borrowing/return management, and late fee calculations.

### 💬 Communication & Real-Time Features
- **Socket.io Real-Time Messaging**: Built-in chat system for school-scoped communication.
- **Notice Board & Announcements**: Instant announcements for parents, teachers, and students.
- **WhatsApp & Email Integration**: Automated alerts for attendance, fee reminders, and notices.
- **Video Meetings**: Integration for virtual classes and parent-teacher meetings.

### 🤖 Smart & Extra Modules
- **AI Service Integration**: Powered by Ollama AI for automated assistance and insights.
- **Certificate Management**: Custom template builder and automated certificate issuance.
- **Alumni Portal**: Alumni directory and job posting platform.
- **Automated Backups**: Database backup service to safeguard school records.

---

## 🛠️ Tech Stack

### **Backend**
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ORM)
- **Real-Time Communication**: Socket.io
- **Authentication**: JWT & Bcrypt
- **File Uploads & Storage**: Multer & Cloudinary
- **Integrations**: Nodemailer, WhatsApp API, Ollama AI

### **Frontend**
- **Framework**: React 19
- **Client**: Web Vitals, Testing Library
- **Real-Time**: Socket.io Client

### **Mobile**
- **Framework**: React Native 0.86 (TypeScript)
- **Platforms**: Android & iOS

---

## 🚀 Getting Started

### Prerequisites
Make sure you have the following installed on your machine:
- **Node.js** (v22.11.0 or later recommended)
- **npm** (v10+ or yarn/pnpm)
- **MongoDB** (Local instance or MongoDB Atlas cluster)
- **Android Studio** & **Xcode** *(for running the mobile app)*

---

### 1. Installation

Clone the repository and install root dependencies:

```bash
git clone https://github.com/sanjayyadavgithub/school-management-system.git
cd school-management-system

# Install all workspace dependencies
npm run bootstrap
```

---

### 2. Environment Configuration

Create `.env` files in each workspace directory based on the required variables:

#### **Backend (`backend/.env`)**
```env
PORT=50001
MONGO_URI=mongodb://localhost:27017/school_management
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
```

#### **Frontend (`frontend/.env`)**
```env
REACT_APP_API_URL=http://localhost:50001/api
```

#### **Mobile (`mobile/.env`)**
```env
API_URL=http://10.0.2.2:50001/api
```

---

### 3. Running the Applications

#### **Start Backend Server**
```bash
npm run backend:dev
```
*Backend will run at `http://localhost:50001`*

#### **Start Frontend Web Application**
```bash
npm run frontend:start
```
*Frontend will run at `http://localhost:3000`*

#### **Start Mobile Application**
```bash
npm run mobile:start
```
- For Android: `npm run android --workspace=mobile`
- For iOS: `npm run ios --workspace=mobile`

---

## 📜 Monorepo Scripts

| Command | Description |
| :--- | :--- |
| `npm run bootstrap` | Installs dependencies across all workspaces |
| `npm run backend:dev` | Runs backend API server in development mode (with nodemon) |
| `npm run frontend:start` | Runs React web frontend application |
| `npm run mobile:start` | Starts Metro bundler for React Native mobile app |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is proprietary and confidential. Unauthorized copying or distribution of any part of this repository is strictly prohibited.
