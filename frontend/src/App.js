import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:50001/api';

export default function App() {
  // Authentication states
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [useBackend, setUseBackend] = useState(true);

  // Forms and view controllers
  const [activeView, setActiveView] = useState('dashboard');
  const [loginRole, setLoginRole] = useState('Admin'); // Admin, Teacher, Student, Parent, SuperAdmin
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerModal, setRegisterModal] = useState(false);
  const [otpModal, setOtpModal] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [editingClass, setEditingClass] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Register School form state
  const [regSchoolName, setRegSchoolName] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regSchoolId, setRegSchoolId] = useState('');
  const [regOtp, setRegOtp] = useState('');
  const [regAdminName, setRegAdminName] = useState('');
  const [regAdminEmail, setRegAdminEmail] = useState('');
  const [regAdminPass, setRegAdminPass] = useState('');

  // In-memory data states
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [notices, setNotices] = useState([]);
  const [fees, setFees] = useState([]);
  const [exams, setExams] = useState([]);

  // Dashboard Aggregates
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);
  const [totalTeachersCount, setTotalTeachersCount] = useState(0);
  const [attendanceRate, setAttendanceRate] = useState(100);
  const [feeCollection, setFeeCollection] = useState(500); // Set default to 500 matching image

  // Dynamic CRUD form inputs
  const [studentForm, setStudentForm] = useState({ name: '', email: '', password: '', phone: '', classId: '', rollNumber: '', parentName: '', parentEmail: '', parentPhone: '' });
  const [teacherForm, setTeacherForm] = useState({ name: '', email: '', password: '', phone: '', qualification: '', experience: 1 });
  const [classForm, setClassForm] = useState({ name: '', section: '', roomNumber: '' });
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', classId: '' });
  const [editingSubject, setEditingSubject] = useState(null);
  const [noticeForm, setNoticeForm] = useState({ title: '', content: '', priority: 'Medium' });
  const [feeForm, setFeeForm] = useState({ classId: '', feeType: '', amount: 1000, frequency: 'Monthly' });
  const [feeCollectForm, setFeeCollectForm] = useState({ studentId: '', feeStructureId: '', amountPaid: 0, paymentMode: 'Cash' });

  // Get In Touch Landing Page & Super Admin Inquiry states
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [contactInquiries, setContactInquiries] = useState([]);
  const [inquiryTab, setInquiryTab] = useState('active'); // 'active' (List of Inquiries) or 'solved' (Solved Inquiries)

  // Homework, Reports, Roles, Subjects Mappings state variables
  const [homeworkForm, setHomeworkForm] = useState({ classId: '', subjectId: '', title: '', instructions: '', dueDate: '', maxMarks: 100 });
  const [homeworks, setHomeworks] = useState([]);
  const [rolesPermissions, setRolesPermissions] = useState({
    Admin: { manageSchool: true, addUsers: true, markAttendance: true, publishNotices: true, collectFees: true, submitHomework: false, viewReports: true, accessAI: true },
    Teacher: { manageSchool: false, addUsers: false, markAttendance: true, publishNotices: true, collectFees: false, submitHomework: false, viewReports: true, accessAI: true },
    Student: { manageSchool: false, addUsers: false, markAttendance: false, publishNotices: false, collectFees: false, submitHomework: true, viewReports: false, accessAI: false },
    Parent: { manageSchool: false, addUsers: false, markAttendance: false, publishNotices: false, collectFees: false, submitHomework: false, viewReports: false, accessAI: false }
  });
  const [classSubjectMappings, setClassSubjectMappings] = useState([]);
  const [mappingForm, setMappingForm] = useState({ classId: '', subjectId: '', teacherId: '' });

  // Custom states added for weekly schedule, permission controls, and materials
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [socket, setSocket] = useState(null);
  const [selectedTeacherForPermissions, setSelectedTeacherForPermissions] = useState(null);
  const [timetableFilter, setTimetableFilter] = useState('All'); // All, English, Mathematics, Physics
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [managePeriodModal, setManagePeriodModal] = useState(false);
  const [newPeriodForm, setNewPeriodForm] = useState({ day: 'Monday', periodNumber: 1, startTime: '08:30', endTime: '09:15', subjectName: 'Mathematics', teacherName: 'Shekhar Sharma' });

  // Exams / Tests & Question Builder
  const [examsList, setExamsList] = useState([]);
  const [examForm, setExamForm] = useState({ name: '', classId: '', subjectId: '', examDate: '', maxMarks: 50, passingMarks: 17 });
  const [examQuestions, setExamQuestions] = useState([
    { questionText: '', type: 'ShortAnswer', options: ['', '', '', ''], correctAnswer: '', marks: 5 }
  ]);
  const [viewingExamModal, setViewingExamModal] = useState(null);

  // Subject-Wise Question Bank State
  const [questionsBank, setQuestionsBank] = useState([]);
  const [questionBankForm, setQuestionBankForm] = useState({
    classId: '',
    subjectId: '',
    questionHindi: '',
    questionEnglish: '',
    option1: '',
    option2: '',
    option3: '',
    option4: '',
    answer: '',
    marks: 1
  });
  const [questionFilterClass, setQuestionFilterClass] = useState('');
  const [questionFilterSubject, setQuestionFilterSubject] = useState('');

  // Period-Wise & Subject-Wise Attendance State
  const [selectedAttendanceClass, setSelectedAttendanceClass] = useState('');
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedAttendancePeriod, setSelectedAttendancePeriod] = useState('');
  const [selectedAttendanceSubject, setSelectedAttendanceSubject] = useState('');
  const [teacherPeriodSlots, setTeacherPeriodSlots] = useState([]);
  const [attendanceStudentRecords, setAttendanceStudentRecords] = useState([]);
  const [attendanceSheetMeta, setAttendanceSheetMeta] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Study Materials
  const [studyMaterials, setStudyMaterials] = useState([]);
  const [materialForm, setMaterialForm] = useState({ title: '', description: '', classId: '', subjectId: '', fileUrl: '' });

  // AI Assistant workspace
  const [aiActiveTool, setAiActiveTool] = useState('insights'); // insights, reminder, comment, notice, event
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiReminderForm, setAiReminderForm] = useState({ parentName: '', studentName: '', className: '', feeType: 'Tuition Fee', amountDue: '500', dueDate: '', tone: 'Polite' });

  // Chat window workspace
  const [chatContacts, setChatContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [chatMessageInput, setChatMessageInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const selectedContactRef = React.useRef(null);

  useEffect(() => {
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);

  // Load Context Data on login
  useEffect(() => {
    if (token) {
      loadBackendData();
    }
  }, [token]);

  const loadBackendData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Sync user profile & schoolName dynamically from backend
      try {
        const resMe = await fetch(`${API_URL}/auth/me`, { headers });
        const dataMe = await resMe.json();
        if (dataMe.success && dataMe.user) {
          setUser(dataMe.user);
          localStorage.setItem('user', JSON.stringify(dataMe.user));
        }
      } catch (err) {
        console.log('User profile sync error:', err);
      }

      const resClasses = await fetch(`${API_URL}/classes`, { headers });
      const dataClasses = await resClasses.json();
      if (dataClasses.success) setClasses(dataClasses.classes);

      const resSubjects = await fetch(`${API_URL}/subjects`, { headers });
      const dataSubjects = await resSubjects.json();
      if (dataSubjects.success) setSubjects(dataSubjects.subjects);

      const resStudents = await fetch(`${API_URL}/students`, { headers });
      const dataStudents = await resStudents.json();
      if (dataStudents.success) {
        setStudents(dataStudents.students);
        setTotalStudentsCount(dataStudents.students.length);
      }

      const resTeachers = await fetch(`${API_URL}/teachers`, { headers });
      const dataTeachers = await resTeachers.json();
      if (dataTeachers.success) {
        setTeachers(dataTeachers.teachers);
        setTotalTeachersCount(dataTeachers.teachers.length);
        if (dataTeachers.teachers.length > 0) {
          setSelectedTeacherForPermissions(dataTeachers.teachers[0]);
        }
      }

      const resNotices = await fetch(`${API_URL}/notices`, { headers });
      const dataNotices = await resNotices.json();
      if (dataNotices.success) setNotices(dataNotices.notices);

      const resFees = await fetch(`${API_URL}/fees/structures`, { headers });
      const dataFees = await resFees.json();
      if (dataFees.success) setFees(dataFees.structures);

      // Fetch homework assignments
      try {
        const resHomework = await fetch(`${API_URL}/homework`, { headers });
        const dataHomework = await resHomework.json();
        if (dataHomework.success && dataHomework.homework && dataHomework.homework.length > 0) {
          setHomeworks(dataHomework.homework);
        }
      } catch (err) {
        console.log('Homework fetch error: using default mock homework.');
      }

      // Fetch exams list
      try {
        const resExams = await fetch(`${API_URL}/exams`, { headers });
        const dataExams = await resExams.json();
        if (dataExams.success && dataExams.exams && dataExams.exams.length > 0) {
          setExamsList(dataExams.exams);
        }
      } catch (err) {
        console.log('Exams fetch error, using default mock exams');
      }

      // Fetch study materials
      try {
        const resMaterials = await fetch(`${API_URL}/materials`, { headers });
        const dataMaterials = await resMaterials.json();
        if (dataMaterials.success && dataMaterials.materials && dataMaterials.materials.length > 0) {
          setStudyMaterials(dataMaterials.materials);
        }
      } catch (err) {
        console.log('Study materials fetch error');
      }

      // Fetch Subject-Wise Questions Bank
      try {
        const resQuestions = await fetch(`${API_URL}/questions`, { headers });
        const dataQuestions = await resQuestions.json();
        if (dataQuestions.success && dataQuestions.questions) {
          setQuestionsBank(dataQuestions.questions);
        }
      } catch (err) {
        console.log('Questions bank fetch error');
      }

      // Fetch timetable
      try {
        const resTimetable = await fetch(`${API_URL}/timetables/my-schedule`, { headers });
        const dataTimetable = await resTimetable.json();
        if (dataTimetable.success && dataTimetable.timetable && dataTimetable.timetable.schedule && dataTimetable.timetable.schedule.length > 0) {
          const formatted = dataTimetable.timetable.schedule.map(slot => ({
            day: slot.day,
            periodNumber: slot.periodNumber,
            startTime: slot.startTime,
            endTime: slot.endTime,
            subjectName: slot.subjectId ? slot.subjectId.name : 'Subject',
            teacherName: slot.teacherId ? slot.teacherId.name : 'Teacher'
          }));
          setTimetableSlots(formatted);
        }
      } catch (err) {
        console.log('Timetable fetch error, using mock slots');
      }

      // SuperAdmin-only calls
      if (user && user.role === 'SuperAdmin') {
        const resSchools = await fetch(`${API_URL}/superadmin/schools`, { headers });
        const dataSchools = await resSchools.json();
        if (dataSchools.success) setSchools(dataSchools.schools);

        try {
          const resInquiries = await fetch(`${API_URL}/contact`, { headers });
          const dataInquiries = await resInquiries.json();
          if (dataInquiries.success) setContactInquiries(dataInquiries.inquiries);
        } catch (err) {
          console.error('Fetch inquiries error:', err);
        }
      }
    } catch (err) {
      console.error('API load error:', err);
    }
  };

  const fetchSchools = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const resSchools = await fetch(`${API_URL}/superadmin/schools`, { headers });
      const dataSchools = await resSchools.json();
      if (dataSchools.success) setSchools(dataSchools.schools);
    } catch (err) {
      console.error('Fetch schools error:', err);
    }
  };

  const handleToggleSchoolStatus = async (schoolId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_URL}/superadmin/schools/${schoolId}/toggle`, {
        method: 'PATCH',
        headers
      });
      const data = await res.json();
      if (data.success) {
        showError(data.message);
        fetchSchools();
      } else {
        showError(data.message);
      }
    } catch (err) {
      showError('Failed to update tenant status.');
    }
  };

  const fetchInquiries = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_URL}/contact`, { headers });
      const data = await res.json();
      if (data.success) setContactInquiries(data.inquiries);
    } catch (err) {
      console.error('Fetch inquiries error:', err);
    }
  };

  const handleUpdateInquiryStatus = async (inquiryId, newStatus) => {
    try {
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const res = await fetch(`${API_URL}/contact/${inquiryId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        showError(data.message);
        fetchInquiries();
      } else {
        showError(data.message);
      }
    } catch (err) {
      showError('Failed to update inquiry status');
    }
  };

  const handleDeleteInquiry = async (inquiryId) => {
    if (!window.confirm('Are you sure you want to delete this website inquiry?')) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_URL}/contact/${inquiryId}`, {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (data.success) {
        showError(data.message);
        fetchInquiries();
      } else {
        showError(data.message);
      }
    } catch (err) {
      showError('Failed to delete inquiry');
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm)
      });
      const data = await res.json();
      if (data.success) {
        showError(data.message || 'Thank you! Your inquiry has been saved.');
        setContactForm({ name: '', email: '', phone: '', message: '' });
      } else {
        showError(data.message);
      }
    } catch (err) {
      showError('Failed to send inquiry. Please check backend connection.');
    } finally {
      setSubmitting(false);
    }
  };

  // Auth Handling
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      showError('Please fill in credentials');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        setActiveView('dashboard');
      } else {
        showError(data.message);
      }
    } catch (err) {
      showError('Server connection failed. Please ensure the backend is running.');
    } finally {
      setSubmitting(false);
    }
  };

  const loginSuccess = (t, u) => {
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
  };

  const handleRegisterSchool = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/auth/register-school`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolName: regSchoolName, address: regAddress, email: regEmail, phone: regPhone })
      });
      const data = await res.json();
      if (data.success) {
        setRegSchoolId(data.schoolId);
        setRegisterModal(false);
        setOtpModal(true);
        showError('Verification code sent. Code: ' + (data.otpCode || ''));
      } else {
        showError(data.message);
      }
    } catch (err) {
      showError('Registration API offline.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: regSchoolId,
          otpCode: regOtp,
          adminName: regAdminName,
          adminEmail: regAdminEmail,
          adminPassword: regAdminPass
        })
      });
      const data = await res.json();
      if (data.success) {
        setOtpModal(false);
        loginSuccess(data.token, data.user);
        setActiveView('dashboard');
      } else {
        showError(data.message);
      }
    } catch (err) {
      showError('Verification API offline.');
    } finally {
      setSubmitting(false);
    }
  };

  // CRUD Submissions
  const addStudent = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: studentForm.name,
          email: studentForm.email,
          password: studentForm.password,
          rollNumber: studentForm.rollNumber,
          classId: studentForm.classId,
          parentName: studentForm.parentName,
          parentEmail: studentForm.parentEmail
        })
      });
      const data = await res.json();
      if (data.success) {
        showError('Student added successfully!');
        setStudentForm({ name: '', email: '', password: '', phone: '', classId: '', rollNumber: '', parentName: '', parentEmail: '', parentPhone: '' });
        loadBackendData();
      } else {
        showError(data.message);
      }
    } catch (err) {
      showError('Failed to add student');
    } finally {
      setSubmitting(false);
    }
  };

  const addTeacher = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: teacherForm.name,
          email: teacherForm.email,
          password: teacherForm.password,
          qualification: teacherForm.qualification,
          experience: teacherForm.experience
        })
      });
      const data = await res.json();
      if (data.success) {
        showError('Teacher added successfully!');
        setTeacherForm({ name: '', email: '', password: '', phone: '', qualification: '', experience: 1 });
        loadBackendData();
      } else {
        showError(data.message);
      }
    } catch (err) {
      showError('Failed to add teacher');
    } finally {
      setSubmitting(false);
    }
  };

  const addClass = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const method = editingClass ? 'PUT' : 'POST';
      const url = editingClass ? `${API_URL}/classes/${editingClass._id}` : `${API_URL}/classes`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(classForm)
      });
      const data = await res.json();
      if (data.success) {
        showError(editingClass ? 'Class updated successfully!' : 'Class created successfully!');
        setClassForm({ name: '', section: '', roomNumber: '' });
        setEditingClass(null);
        loadBackendData();
      } else {
        showError(data.message);
      }
    } catch (err) {
      showError('Failed to save class section');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteClassSection = async (classId) => {
    if (!window.confirm('Are you sure you want to delete this class section?')) return;
    try {
      const res = await fetch(`${API_URL}/classes/${classId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showError('Class section deleted!');
        loadBackendData();
      } else {
        showError(data.message);
      }
    } catch (err) {
      showError('Failed to delete class');
    }
  };

  const addSubject = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(subjectForm)
      });
      const data = await res.json();
      if (data.success) {
        showError('Subject created successfully!');
        setSubjectForm({ name: '', code: '', classId: '' });
        loadBackendData();
      } else {
        showError(data.message);
      }
    } catch (err) {
      showError('Failed to create subject');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSubject = async (e) => {
    e.preventDefault();
    if (!editingSubject || !editingSubject._id) return;
    try {
      setSubmitting(true);
      const targetClassId = typeof editingSubject.classId === 'object' ? editingSubject.classId._id : editingSubject.classId;
      const res = await fetch(`${API_URL}/subjects/${editingSubject._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: editingSubject.name,
          code: editingSubject.code,
          classId: targetClassId
        })
      });
      const data = await res.json();
      if (data.success) {
        showError('Subject updated successfully!');
        setEditingSubject(null);
        loadBackendData();
      } else {
        showError(data.message);
      }
    } catch (err) {
      showError('Failed to update subject');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubject = async (subjectId) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/subjects/${subjectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showError('Subject deleted successfully!');
        loadBackendData();
      } else {
        showError(data.message);
      }
    } catch (err) {
      showError('Failed to delete subject');
    } finally {
      setSubmitting(false);
    }
  };

  const addHomework = async (e) => {
    e.preventDefault();
    if (!homeworkForm.classId || !homeworkForm.subjectId || !homeworkForm.title || !homeworkForm.instructions || !homeworkForm.dueDate) {
      showError('Please fill in all homework details');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/homework`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          classId: homeworkForm.classId,
          subjectId: homeworkForm.subjectId,
          title: homeworkForm.title,
          instructions: homeworkForm.instructions,
          dueDate: homeworkForm.dueDate,
          maxMarks: homeworkForm.maxMarks
        })
      });
      const data = await res.json();
      if (data.success) {
        showError('Homework assigned successfully!');
        setHomeworkForm({ classId: '', subjectId: '', title: '', instructions: '', dueDate: '', maxMarks: 100 });
        loadBackendData();
      } else {
        // Fallback locally
        const selectedClass = classes.find(c => c._id === homeworkForm.classId) || { name: '10th', section: 'A' };
        const selectedSubject = subjects.find(s => s._id === homeworkForm.subjectId) || { name: 'Mathematics', code: 'MAT0001' };
        const newHomework = {
          _id: 'local_' + Date.now(),
          title: homeworkForm.title,
          instructions: homeworkForm.instructions,
          dueDate: homeworkForm.dueDate,
          maxMarks: homeworkForm.maxMarks,
          classId: selectedClass,
          subjectId: selectedSubject,
          submissions: []
        };
        setHomeworks([newHomework, ...homeworks]);
        showError('Homework saved locally (Sandbox mode)');
        setHomeworkForm({ classId: '', subjectId: '', title: '', instructions: '', dueDate: '', maxMarks: 100 });
      }
    } catch (err) {
      // Fallback locally
      const selectedClass = classes.find(c => c._id === homeworkForm.classId) || { name: '10th', section: 'A' };
      const selectedSubject = subjects.find(s => s._id === homeworkForm.subjectId) || { name: 'Mathematics', code: 'MAT0001' };
      const newHomework = {
        _id: 'local_' + Date.now(),
        title: homeworkForm.title,
        instructions: homeworkForm.instructions,
        dueDate: homeworkForm.dueDate,
        maxMarks: homeworkForm.maxMarks,
        classId: selectedClass,
        subjectId: selectedSubject,
        submissions: []
      };
      setHomeworks([newHomework, ...homeworks]);
      showError('Homework saved locally (Sandbox mode)');
      setHomeworkForm({ classId: '', subjectId: '', title: '', instructions: '', dueDate: '', maxMarks: 100 });
    } finally {
      setSubmitting(false);
    }
  };

  const addMapping = (e) => {
    e.preventDefault();
    if (!mappingForm.classId || !mappingForm.subjectId || !mappingForm.teacherId) {
      showError('Please select class, subject and teacher');
      return;
    }
    const cls = classes.find(c => c._id === mappingForm.classId) || { name: '10th', section: 'A' };
    const sub = subjects.find(s => s._id === mappingForm.subjectId) || { name: 'Mathematics', code: 'MAT0001' };
    const tch = teachers.find(t => t._id === mappingForm.teacherId || t.user?._id === mappingForm.teacherId || t._id === mappingForm.teacherId) || { user: { name: 'Vikram Sharma' } };

    const newMap = {
      _id: 'map_' + Date.now(),
      classSection: `${cls.name} ${cls.section}`,
      subjectName: sub.name,
      teacherName: tch.user ? tch.user.name : (tch.name || 'Vikram Sharma')
    };
    setClassSubjectMappings([...classSubjectMappings, newMap]);
    showError('Class-Subject Teacher mapping added successfully!');
    setMappingForm({ classId: '', subjectId: '', teacherId: '' });
  };

  // AI assistant generator
  const askAIAssistant = async () => {
    setAiResponse('Thinking... Connecting to local Ollama server...');
    try {
      let endpoint = '/ai/insights';
      let body = { query: aiPrompt };
      if (aiActiveTool === 'reminder') {
        endpoint = '/ai/fee-reminder';
        body = aiReminderForm;
      } else if (aiActiveTool === 'comment') {
        endpoint = '/ai/report-comment';
        body = { studentName: aiPrompt, marksObtained: 85, maxMarks: 100 };
      } else if (aiActiveTool === 'notice') {
        endpoint = '/ai/notice-generator';
        body = { title: 'Exam Circular', details: aiPrompt };
      }

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      setAiResponse(data.letter || data.comment || data.notice || data.response || 'Success!');
    } catch (err) {
      setAiResponse('Ollama AI offline or route error.');
    }
  };

  // Chat panel handling
  useEffect(() => {
    if (activeView === 'chat' && token) {
      fetch(`${API_URL}/chat/contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setChatContacts(data.contacts || []);
          }
        })
        .catch(err => console.error('Failed to load chat contacts', err));
    }
  }, [activeView, token, user]);

  // Socket.io real-time connection setup
  useEffect(() => {
    if (!token || !user || !user.id) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const socketUrl = API_URL.replace('/api', '');
    const newSocket = io(socketUrl, {
      transports: ['websocket'],
      upgrade: false
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      newSocket.emit('setup', { id: user.id, schoolId: user.schoolId });
    });

    newSocket.on('message_received', (savedMessage) => {
      const activeContact = selectedContactRef.current;
      if (activeContact && (savedMessage.senderId === activeContact._id || savedMessage.receiverId === activeContact._id)) {
        setChatHistory(prev => {
          if (prev.some(msg => msg._id === savedMessage._id)) return prev;
          return [...prev, savedMessage];
        });
      }
    });

    newSocket.on('message_sent', (savedMessage) => {
      setChatHistory(prev => {
        if (prev.some(msg => msg._id === savedMessage._id)) return prev;
        return [...prev, savedMessage];
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, user]);

  const selectContactChat = async (contact) => {
    setSelectedContact(contact);
    try {
      const res = await fetch(`${API_URL}/chat/history/${contact._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setChatHistory(data.messages || data.history || []);
      }
    } catch (err) {
      console.error('Failed to load chat history', err);
    }
  };

  const sendChatMessage = async () => {
    if (!chatMessageInput || !selectedContact || !selectedContact._id) return;

    // Use Socket.io if available
    if (socket && socket.connected) {
      socket.emit('send_message', {
        senderId: user.id,
        receiverId: selectedContact._id,
        message: chatMessageInput,
        schoolId: user.schoolId
      });
      setChatMessageInput('');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ receiverId: selectedContact._id, message: chatMessageInput })
      });
      const data = await res.json();
      if (data.success) {
        setChatHistory(prev => [...prev, data.chatMessage]);
        setChatMessageInput('');
      } else {
        showError(data.message || 'Server rejected message sending');
      }
    } catch (err) {
      showError('Failed to send chat message: ' + err.message);
    }
  };

  // Question & Answer Builder Handlers
  const handleAddExamQuestion = () => {
    setExamQuestions([
      ...examQuestions,
      { questionText: '', type: 'ShortAnswer', options: ['', '', '', ''], correctAnswer: '', marks: 5 }
    ]);
  };

  const handleRemoveExamQuestion = (index) => {
    if (examQuestions.length <= 1) {
      showError('At least one question is required for a test.');
      return;
    }
    setExamQuestions(examQuestions.filter((_, idx) => idx !== index));
  };

  const handleExamQuestionChange = (index, field, value) => {
    const updated = [...examQuestions];
    updated[index][field] = value;
    setExamQuestions(updated);
  };

  const handleExamQuestionOptionChange = (qIndex, optIndex, value) => {
    const updated = [...examQuestions];
    updated[qIndex].options[optIndex] = value;
    setExamQuestions(updated);
  };

  const handleDeleteExam = async (examId) => {
    if (!window.confirm('Are you sure you want to delete this test/exam schedule?')) return;
    try {
      const res = await fetch(`${API_URL}/exams/${examId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showError('Test deleted successfully');
        setExamsList(examsList.filter(ex => ex._id !== examId));
      } else {
        showError(data.message || 'Failed to delete test');
      }
    } catch (err) {
      showError('Server error deleting test');
    }
  };

  // Subject-Wise Question Bank Handlers
  const handleAddQuestionBank = async (e) => {
    e.preventDefault();
    if (!questionBankForm.classId || !questionBankForm.subjectId || !questionBankForm.questionHindi || !questionBankForm.questionEnglish || !questionBankForm.option1 || !questionBankForm.option2 || !questionBankForm.option3 || !questionBankForm.option4 || !questionBankForm.answer) {
      showError('Please fill in Class, Subject, Question (Hindi), Question (English), Options 1-4, and Answer');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(questionBankForm)
      });
      const data = await res.json();
      if (data.success) {
        showError('Question added to subject question bank!');
        setQuestionBankForm({
          classId: questionBankForm.classId,
          subjectId: questionBankForm.subjectId,
          questionHindi: '',
          questionEnglish: '',
          option1: '',
          option2: '',
          option3: '',
          option4: '',
          answer: '',
          marks: 1
        });
        loadBackendData();
      } else {
        showError(data.message || 'Failed to add question');
      }
    } catch (err) {
      showError('Failed to add question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuestionBank = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question from the bank?')) return;
    try {
      const res = await fetch(`${API_URL}/questions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showError('Question deleted from bank successfully');
        setQuestionsBank(questionsBank.filter(q => q._id !== id));
      } else {
        showError(data.message || 'Failed to delete question');
      }
    } catch (err) {
      showError('Server error deleting question');
    }
  };

  // Period-Wise & Subject-Wise Attendance Handlers
  const fetchTeacherPeriods = async (cId, dStr) => {
    if (!cId || !dStr) return;
    try {
      const res = await fetch(`${API_URL}/attendance/teacher-periods?classId=${cId}&date=${dStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTeacherPeriodSlots(data.periods || []);
      }
    } catch (err) {
      console.error('Failed to fetch teacher periods', err);
    }
  };

  const loadAttendanceRegister = async (cId, dStr, pNum, sId) => {
    if (!cId || !dStr) {
      showError('Please select a Class Section and Date');
      return;
    }
    try {
      setLoadingAttendance(true);
      let url = `${API_URL}/attendance/sheet?classId=${cId}&date=${dStr}`;
      if (pNum && pNum !== 'undefined' && pNum !== 'null' && pNum !== '') url += `&periodNumber=${pNum}`;
      if (sId && sId !== 'undefined' && sId !== 'null' && sId !== '') url += `&subjectId=${sId}`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setAttendanceStudentRecords(data.records || []);
        setAttendanceSheetMeta(data.exists ? { markedBy: data.markedBy, sheetId: data.sheetId } : null);
      } else {
        showError(data.message || 'Failed to load attendance register');
      }
    } catch (err) {
      showError('Server error loading attendance sheet');
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleAttendanceStatusChange = (index, status) => {
    const updated = [...attendanceStudentRecords];
    updated[index].status = status;
    setAttendanceStudentRecords(updated);
  };

  const handleAttendanceRemarksChange = (index, remarks) => {
    const updated = [...attendanceStudentRecords];
    updated[index].remarks = remarks;
    setAttendanceStudentRecords(updated);
  };

  const handleMarkAllAttendance = (status) => {
    const updated = attendanceStudentRecords.map(r => ({ ...r, status }));
    setAttendanceStudentRecords(updated);
  };

  const handleSaveAttendanceRegister = async () => {
    if (!selectedAttendanceClass || !selectedAttendanceDate) {
      showError('Please select a Class Section and Date');
      return;
    }
    if (attendanceStudentRecords.length === 0) {
      showError('No students found to mark attendance');
      return;
    }

    try {
      setSubmitting(true);
      const formattedRecords = attendanceStudentRecords.map(r => ({
        studentId: r.studentId._id || r.studentId,
        status: r.status,
        remarks: r.remarks || ''
      }));

      const payload = {
        classId: selectedAttendanceClass,
        date: selectedAttendanceDate,
        records: formattedRecords,
        periodNumber: selectedAttendancePeriod ? parseInt(selectedAttendancePeriod) : 1,
        subjectId: selectedAttendanceSubject || undefined,
        attendanceType: selectedAttendanceSubject ? 'PeriodWise' : 'Daily'
      };

      const res = await fetch(`${API_URL}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showError('Attendance Register marked & saved successfully!');
        setAttendanceSheetMeta({ markedBy: data.attendanceSheet.markedBy, sheetId: data.attendanceSheet._id });
        loadBackendData();
      } else {
        showError(data.message || 'Failed to save attendance register');
      }
    } catch (err) {
      showError('Server error saving attendance register');
    } finally {
      setSubmitting(false);
    }
  };

  const addExam = async (e) => {
    e.preventDefault();
    if (!examForm.name || !examForm.classId || !examForm.subjectId || !examForm.examDate) {
      showError('Please fill in Exam Title, Class, Subject, and Test Date');
      return;
    }

    const validQuestions = examQuestions.filter(q => q.questionText && q.questionText.trim() !== '');
    if (validQuestions.length === 0) {
      showError('Please add at least one question to the test.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: examForm.name,
          classId: examForm.classId,
          subjectId: examForm.subjectId,
          examDate: examForm.examDate,
          maxMarks: examForm.maxMarks,
          passingMarks: examForm.passingMarks,
          questions: validQuestions
        })
      });
      const data = await res.json();
      if (data.success) {
        showError('Test & Question Paper created successfully!');
        setExamForm({ name: '', classId: '', subjectId: '', examDate: '', maxMarks: 50, passingMarks: 17 });
        setExamQuestions([{ questionText: '', type: 'ShortAnswer', options: ['', '', '', ''], correctAnswer: '', marks: 5 }]);
        loadBackendData();
      } else {
        showError(data.message || 'Failed to create exam');
      }
    } catch (err) {
      const selectedClass = classes.find(c => c._id === examForm.classId) || { name: '10th', section: 'A' };
      const selectedSubject = subjects.find(s => s._id === examForm.subjectId) || { name: 'Mathematics', code: 'MAT0001' };
      const newExam = {
        _id: 'ex_' + Date.now(),
        name: examForm.name,
        classId: selectedClass,
        subjectId: selectedSubject,
        examDate: examForm.examDate,
        maxMarks: validQuestions.reduce((sum, q) => sum + (parseInt(q.marks) || 0), 0) || examForm.maxMarks,
        passingMarks: examForm.passingMarks,
        questions: validQuestions
      };
      setExamsList([newExam, ...examsList]);
      showError('Test & Question Paper saved!');
      setExamForm({ name: '', classId: '', subjectId: '', examDate: '', maxMarks: 50, passingMarks: 17 });
      setExamQuestions([{ questionText: '', type: 'ShortAnswer', options: ['', '', '', ''], correctAnswer: '', marks: 5 }]);
    } finally {
      setSubmitting(false);
    }
  };

  const addStudyMaterial = async (e) => {
    e.preventDefault();
    if (!materialForm.title || !materialForm.classId || !materialForm.subjectId) {
      showError('Please fill in all material fields');
      return;
    }
    const url = materialForm.fileUrl || '#';
    try {
      setSubmitting(true);
      const res = await fetch(`${API_URL}/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: materialForm.title,
          description: materialForm.description,
          classId: materialForm.classId,
          subjectId: materialForm.subjectId,
          fileUrl: url
        })
      });
      const data = await res.json();
      if (data.success) {
        showError('Study material added successfully!');
        setMaterialForm({ title: '', description: '', classId: '', subjectId: '', fileUrl: '' });
        loadBackendData();
      } else {
        const selectedClass = classes.find(c => c._id === materialForm.classId) || { name: '10th', section: 'A' };
        const selectedSubject = subjects.find(s => s._id === materialForm.subjectId) || { name: 'Mathematics' };
        const newMaterial = {
          _id: 'mat_' + Date.now(),
          title: materialForm.title,
          description: materialForm.description,
          fileUrl: url,
          classId: selectedClass,
          subjectId: selectedSubject,
          uploadedBy: { name: user.name, role: user.role }
        };
        setStudyMaterials([newMaterial, ...studyMaterials]);
        showError('Material saved locally (Sandbox mode)');
        setMaterialForm({ title: '', description: '', classId: '', subjectId: '', fileUrl: '' });
      }
    } catch (err) {
      const selectedClass = classes.find(c => c._id === materialForm.classId) || { name: '10th', section: 'A' };
      const selectedSubject = subjects.find(s => s._id === materialForm.subjectId) || { name: 'Mathematics' };
      const newMaterial = {
        _id: 'mat_' + Date.now(),
        title: materialForm.title,
        description: materialForm.description,
        fileUrl: url,
        classId: selectedClass,
        subjectId: selectedSubject,
        uploadedBy: { name: user.name, role: user.role }
      };
      setStudyMaterials([newMaterial, ...studyMaterials]);
      showError('Material saved locally (Sandbox mode)');
      setMaterialForm({ title: '', description: '', classId: '', subjectId: '', fileUrl: '' });
    } finally {
      setSubmitting(false);
    }
  };

  const saveTeacherPermissions = async () => {
    if (!selectedTeacherForPermissions) return;
    const targetUserId = selectedTeacherForPermissions.user?._id || selectedTeacherForPermissions._id;
    try {
      const res = await fetch(`${API_URL}/teachers/${targetUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          permissions: selectedTeacherForPermissions.user ? selectedTeacherForPermissions.user.permissions : selectedTeacherForPermissions.permissions,
          isActive: selectedTeacherForPermissions.user ? selectedTeacherForPermissions.user.isActive : selectedTeacherForPermissions.isActive
        })
      });
      const data = await res.json();
      if (data.success) {
        showError('Permissions updated and synchronized with backend database!');
        loadBackendData();
      } else {
        showError('Saved successfully locally (Sandbox mode)');
      }
    } catch (err) {
      showError('Saved successfully locally (Sandbox mode)');
    }
  };

  const saveTimetablePeriod = async (e) => {
    e.preventDefault();
    const updatedSlots = [...timetableSlots, {
      day: newPeriodForm.day,
      periodNumber: parseInt(newPeriodForm.periodNumber),
      startTime: newPeriodForm.startTime,
      endTime: newPeriodForm.endTime,
      subjectName: newPeriodForm.subjectName,
      teacherName: newPeriodForm.teacherName
    }];
    setTimetableSlots(updatedSlots);
    setManagePeriodModal(false);
    showError('Period slot updated in Weekly Timetable!');

    try {
      setSubmitting(true);
      const targetClass = classes[0] ? classes[0]._id : '10th A';
      const schedulePayload = updatedSlots.map((slot, idx) => ({
        day: slot.day,
        periodNumber: slot.periodNumber,
        startTime: slot.startTime,
        endTime: slot.endTime,
        subjectId: subjects[0] ? subjects[0]._id : undefined,
        teacherId: teachers[0] ? (teachers[0]._id || teachers[0].user?._id) : undefined
      })).filter(slot => slot.subjectId !== undefined);

      await fetch(`${API_URL}/timetables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ classId: targetClass, schedule: schedulePayload })
      });
    } catch (err) {
      console.log('Backend timetable sync ignored.');
    } finally {
      setSubmitting(false);
    }
  };

  const showError = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  return (
    <div className="App">
      {feedbackMsg && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 10000,
          background: 'linear-gradient(135deg, #FF6B35 0%, #FF4D2D 100%)', color: 'white',
          padding: '16px 24px', borderRadius: '12px', boxShadow: '0 8px 30px rgba(255,107,53,0.3)',
          animation: 'fadeIn 0.3s ease', fontWeight: '600'
        }}>
          {feedbackMsg}
        </div>
      )}

      {/* 1. PORTAL LANDING PAGE OR LOGIN / SIGNUP SPLIT VIEW SCREEN */}
      {!token ? (
        !showLogin ? (
          <div className="landing-container">
            {/* Sticky Navigation */}
            <header className="landing-nav">
              <div className="landing-nav-logo" onClick={() => setShowLogin(false)}>
                <div className="logo-icon" style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #FF9E79 0%, #FF6B35 100%)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '800' }}>S</div>
                <span>SMS</span>
              </div>
              <nav className="landing-nav-links">
                <a className="landing-nav-link" href="#features">Features</a>
                <a className="landing-nav-link" href="#pricing">Pricing</a>
                <a className="landing-nav-link" href="#faq">FAQs</a>
                <a className="landing-nav-link" href="#contact">Contact</a>
                <button className="landing-btn-signin" onClick={() => setShowLogin(true)}>Sign In</button>
                <button className="landing-btn-demo" onClick={() => setShowLogin(true)}>Book a demo</button>
              </nav>
            </header>

            {/* Hero Section */}
            <section className="landing-hero">
              <h1>Run your school on one platform</h1>
              <p>Attendance, fees, timetables, and communication for admins, teachers, and parents — with advanced local AI built in. Zero external software costs.</p>
              <div className="landing-hero-ctas">
                <button className="landing-btn-hero-primary" onClick={() => setShowLogin(true)}>Book a free demo</button>
                <button className="landing-btn-hero-secondary" onClick={() => setShowLogin(true)}>Watch video</button>
              </div>
              <span className="landing-hero-trusted">Trusted by 120+ schools across India</span>
            </section>

            {/* Live Stats Preview */}
            <section className="landing-stats-container">
              <div className="landing-stats-card">
                <div className="landing-stat-item">
                  <span className="landing-stat-value">1,842</span>
                  <span className="landing-stat-label">Students</span>
                </div>
                <div className="landing-stat-item">
                  <span className="landing-stat-value">94.2%</span>
                  <span className="landing-stat-label">Attendance</span>
                </div>
                <div className="landing-stat-item">
                  <span className="landing-stat-value">₹18.4L</span>
                  <span className="landing-stat-label">Fees Collected</span>
                </div>
                <div className="landing-stat-item">
                  <span className="landing-stat-value">23</span>
                  <span className="landing-stat-label">At-Risk Alerts</span>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#9094A6', marginTop: '12px', textAlign: 'center' }}>Live preview of the admin dashboard metrics</p>
            </section>

            {/* Features Section */}
            <section id="features" className="landing-features-container">
              <div className="landing-section-header">
                <h2>Built for every role in your school</h2>
                <p>One unified platform, four tailored dashboards.</p>
              </div>
              <div className="landing-features-grid">
                <div className="landing-feature-card">
                  <div className="landing-feature-icon">🤖</div>
                  <h3 className="landing-feature-title">AI Assistant</h3>
                  <p className="landing-feature-desc">Fee reminders, report card comments, and school notices generated instantly using local Llama engine.</p>
                </div>
                <div className="landing-feature-card">
                  <div className="landing-feature-icon">📅</div>
                  <h3 className="landing-feature-title">Attendance & Timetable</h3>
                  <p className="landing-feature-desc">Real-time attendance tracking using automated device cameras, RFID card logs, and parent alerts.</p>
                </div>
                <div className="landing-feature-card">
                  <div className="landing-feature-icon">💬</div>
                  <h3 className="landing-feature-title">Communication</h3>
                  <p className="landing-feature-desc">Direct real-time chat between school admins, teachers, and parents with zero-setup notification alerts.</p>
                </div>
                <div className="landing-feature-card">
                  <div className="landing-feature-icon">📚</div>
                  <h3 className="landing-feature-title">Digital Library</h3>
                  <p className="landing-feature-desc">Catalog books and read secure digital e-books with download-disabled PDF viewers to protect copyrights.</p>
                </div>
                <div className="landing-feature-card">
                  <div className="landing-feature-icon">📝</div>
                  <h3 className="landing-feature-title">LMS & Quiz Platform</h3>
                  <p className="landing-feature-desc">Run secure online exams with tab-switch proctoring detectors and automated MCQ scoring engines.</p>
                </div>
                <div className="landing-feature-card">
                  <div className="landing-feature-icon">🛡️</div>
                  <h3 className="landing-feature-title">Audit & Backups</h3>
                  <p className="landing-feature-desc">Automatic rotating databases backups, encrypted exports, and compliance security log charts.</p>
                </div>
              </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="landing-pricing-container">
              <div className="landing-section-header">
                <h2>Simple, transparent pricing</h2>
                <p>Select a tier that fits your campus student enrollment.</p>
              </div>
              <div className="landing-pricing-grid">
                <div className="landing-pricing-card">
                  <div>
                    <h3 className="landing-pricing-tier">Basic</h3>
                    <div className="landing-pricing-price">₹4,999<span>/mo</span></div>
                    <ul className="landing-pricing-features">
                      <li className="landing-pricing-feature">Up to 300 students</li>
                      <li className="landing-pricing-feature">Standard academic modules</li>
                      <li className="landing-pricing-feature">Basic attendance logs</li>
                    </ul>
                  </div>
                  <button className="landing-pricing-btn secondary" onClick={() => setShowLogin(true)}>Get Started</button>
                </div>
                <div className="landing-pricing-card popular">
                  <div className="landing-popular-badge">Most Popular</div>
                  <div>
                    <h3 className="landing-pricing-tier">Standard</h3>
                    <div className="landing-pricing-price">₹9,999<span>/mo</span></div>
                    <ul className="landing-pricing-features">
                      <li className="landing-pricing-feature">Up to 1,000 students</li>
                      <li className="landing-pricing-feature">Full LMS video modules</li>
                      <li className="landing-pricing-feature">Local AI Assistant access</li>
                      <li className="landing-pricing-feature">Automated notifications</li>
                    </ul>
                  </div>
                  <button className="landing-pricing-btn primary" onClick={() => setShowLogin(true)}>Get Started</button>
                </div>
                <div className="landing-pricing-card">
                  <div>
                    <h3 className="landing-pricing-tier">Enterprise</h3>
                    <div className="landing-pricing-price">Contact us</div>
                    <ul className="landing-pricing-features">
                      <li className="landing-pricing-feature">Unlimited students</li>
                      <li className="landing-pricing-feature">Multi-campus tracking</li>
                      <li className="landing-pricing-feature">Custom report layouts</li>
                      <li className="landing-pricing-feature">24/7 dedicated assistance</li>
                    </ul>
                  </div>
                  <button className="landing-pricing-btn secondary" onClick={() => setShowLogin(true)}>Contact Sales</button>
                </div>
              </div>
            </section>

            {/* Interactive FAQs Accordion Section */}
            <section id="faq" className="landing-faq-container">
              <div className="landing-section-header">
                <h2>Frequently Asked Questions</h2>
                <p>Everything you need to know about our school ecosystem.</p>
              </div>
              <div className="landing-faq-list">
                {[
                  { q: "Is the software completely free of external dependencies?", a: "Yes. All integrations, including Jitsi Meet WebRTC calls, local TF-IDF plagiarism comparisons, and face descriptor matching calculations, run on your server without requiring paid API subscriptions." },
                  { q: "How does the face-recognition attendance check-in work?", a: "Students align their face using their device camera or an admin portal. The camera extracts a 128-float facial descriptor and matches it securely with our database in real-time." },
                  { q: "Are online payments processed securely?", a: "Absolutely. Payment structures are fully routed via encrypted Stripe and Razorpay gateway webhooks, ensuring compliance and secure transaction tracking." },
                  { q: "Can teachers compute monthly payslips automatically?", a: "Yes. The payroll system syncs directly with attendance sheets to calculate paid leave allowances, deductions, taxes, and outputs print-ready payslip designs." }
                ].map((item, idx) => {
                  const isOpen = expandedFaq === idx;
                  return (
                    <div key={idx} className={`landing-faq-card ${isOpen ? 'open' : ''}`}>
                      <button className="landing-faq-header" onClick={() => setExpandedFaq(isOpen ? null : idx)}>
                        <span className="landing-faq-question">{item.q}</span>
                        <span className="landing-faq-toggle">+</span>
                      </button>
                      <div className="landing-faq-content" style={{ maxHeight: isOpen ? '200px' : '0' }}>
                        <p className="landing-faq-answer">{item.a}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Contact Form Section */}
            <section id="contact" className="landing-contact-container">
              <div className="landing-section-header">
                <h2>Get in touch</h2>
                <p>Have questions about SMS? Let's connect.</p>
              </div>
              <div className="landing-contact-card">
                <form onSubmit={handleContactSubmit}>
                  <div className="form-group">
                    <label style={{ textAlign: 'left', display: 'block' }}>Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Your Name"
                      required
                      value={contactForm.name}
                      onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ textAlign: 'left', display: 'block' }}>Email ID *</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="you@school.com"
                      required
                      value={contactForm.email}
                      onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ textAlign: 'left', display: 'block' }}>Contact Phone</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="+91 98765 43210"
                      value={contactForm.phone}
                      onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ textAlign: 'left', display: 'block' }}>Message *</label>
                    <textarea
                      className="form-input"
                      rows={4}
                      placeholder="How can we help your school?"
                      required
                      style={{ fontFamily: 'inherit' }}
                      value={contactForm.message}
                      onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                    ></textarea>
                  </div>
                  <button type="submit" className="landing-btn-hero-primary" style={{ width: '100%', marginTop: '12px' }} disabled={submitting}>
                    {submitting ? 'Sending Query...' : 'Send Query'}
                  </button>
                </form>
              </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
              <p>© 2026 SMS Multi-Tenant Portal. All rights reserved.</p>
            </footer>
          </div>
        ) : (
          <div className="auth-split-container">
            <div className="auth-sidebar-panel">
              <div className="back-to-landing" onClick={() => setShowLogin(false)}>
                ← Back to landing page
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="logo-icon" style={{ background: 'white', color: '#FF6B35' }}>S</div>
                <h2 style={{ fontSize: '24px', fontWeight: '800' }}>SMS</h2>
              </div>
              <h1>Manage your school with confidence</h1>
              <p>A complete multi-tenant platform for administrators, teachers, students, and parents. Track metrics, assign coursework, collect fees, and communicate instantly with local AI enhancements.</p>

              <div className="auth-metrics-chips">
                <div className="auth-metric-chip">
                  <h4>2,847</h4>
                  <span>Students</span>
                </div>
                <div className="auth-metric-chip">
                  <h4>184</h4>
                  <span>Teachers</span>
                </div>
                <div className="auth-metric-chip">
                  <h4>12</h4>
                  <span>Schools</span>
                </div>
              </div>
            </div>

            <div className="auth-form-panel">
              <div className="auth-form-container">
                <h2>Welcome back</h2>
                <p>Select your portal role and sign in</p>

                <form onSubmit={handleLogin}>
                  <div className="form-group">
                    <label>Portal Role</label>
                    <div className="role-selector-grid">
                      {['Admin', 'Teacher', 'Student', 'Parent'].map(role => (
                        <button
                          key={role}
                          type="button"
                          className={`role-select-btn ${loginRole === role ? 'selected' : ''}`}
                          onClick={() => setLoginRole(role)}
                        >
                          {role === 'Admin' && '🛡️'}
                          {role === 'Teacher' && '🎓'}
                          {role === 'Student' && '👥'}
                          {role === 'Parent' && '👨‍👩‍👧‍👦'}
                          <span style={{ marginLeft: '6px' }}>{role}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Email Address</label>
                    <input type="email" className="form-input" placeholder="name@school.com" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label>Password</label>
                    <input type="password" className="form-input" placeholder="••••••••" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                  </div>

                  <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={submitting}>{submitting ? 'Signing In...' : 'Sign In to Portal'}</button>
                </form>

                <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Want to register a new school tenant?</p>
                  <button className="btn-secondary" style={{ width: '100%', marginTop: '12px' }} onClick={() => setRegisterModal(true)}>Register New School</button>
                </div>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="app-container">
          <div className="sidebar">
            <div className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingLeft: '8px' }}>
              <div className="logo-icon" style={{ width: '38px', height: '38px', background: 'linear-gradient(135deg, #FF9E79 0%, #FF6B35 100%)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
                  <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', lineHeight: '1.2' }}>SMS</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {user.role === 'SuperAdmin' ? 'Super Admin' :
                    user.role === 'Admin' ? 'School Admin' :
                      user.role === 'Teacher' ? 'School Teacher' : user.role}
                </span>
              </div>
            </div>

            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px', padding: '0 8px 12px 8px', textAlign: 'left' }}>
              NAVIGATION
            </div>

            <ul className="nav-list">
              {user.role === 'SuperAdmin' && (
                <>
                  <li className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')}>🎛️ Dashboard</li>
                  <li className={`nav-item ${activeView === 'tenants' || activeView === 'superadmin' ? 'active' : ''}`} onClick={() => setActiveView('tenants')}>🏢 Registered Schools</li>
                  <li className={`nav-item ${activeView === 'inquiries' ? 'active' : ''}`} onClick={() => setActiveView('inquiries')}>📥 Website Inquiries</li>
                </>
              )}
              {user.role === 'Admin' && (
                <>
                  <li className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')}>🎛️ Dashboard</li>
                  <li className={`nav-item ${activeView === 'students' ? 'active' : ''}`} onClick={() => setActiveView('students')}>👥 Students</li>
                  <li className={`nav-item ${activeView === 'teachers' ? 'active' : ''}`} onClick={() => setActiveView('teachers')}>🎓 Teachers</li>
                  <li className={`nav-item ${activeView === 'classes' ? 'active' : ''}`} onClick={() => setActiveView('classes')}>🏫 Classes</li>
                  <li className={`nav-item ${activeView === 'attendance' ? 'active' : ''}`} onClick={() => setActiveView('attendance')}>📅 Attendance</li>
                  <li className={`nav-item ${activeView === 'fees' ? 'active' : ''}`} onClick={() => setActiveView('fees')}>💵 Fees</li>
                  <li className={`nav-item ${activeView === 'homework' ? 'active' : ''}`} onClick={() => setActiveView('homework')}>📖 Homework</li>
                  <li className={`nav-item ${activeView === 'timetable' ? 'active' : ''}`} onClick={() => setActiveView('timetable')}>📅 Timetable</li>
                  <li className={`nav-item ${activeView === 'notices' ? 'active' : ''}`} onClick={() => setActiveView('notices')}>📢 Notice Board</li>
                  <li className={`nav-item ${activeView === 'chat' ? 'active' : ''}`} onClick={() => { setActiveView('chat'); loadBackendData(); }}>💬 Communication</li>
                  <li className={`nav-item ${activeView === 'reports' ? 'active' : ''}`} onClick={() => setActiveView('reports')}>📊 Reports</li>
                  <li className={`nav-item ${activeView === 'ai' ? 'active' : ''}`} onClick={() => setActiveView('ai')}>🤖 AI Assistant</li>
                  <li className={`nav-item ${activeView === 'roles' ? 'active' : ''}`} onClick={() => setActiveView('roles')}>🛡️ Roles & Permissions</li>
                  <li className={`nav-item ${activeView === 'subjectClass' ? 'active' : ''}`} onClick={() => setActiveView('subjectClass')}>🔗 Subject & Class</li>
                  <li className={`nav-item ${activeView === 'exams' ? 'active' : ''}`} onClick={() => setActiveView('exams')}>📝 Tests & Exams</li>
                  <li className={`nav-item ${activeView === 'testQuestions' ? 'active' : ''}`} onClick={() => setActiveView('testQuestions')}>❓ Test/Exam Questions</li>
                </>
              )}
              {user.role === 'Teacher' && (
                <>
                  <li className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')}>🎛️ Dashboard</li>
                  <li className={`nav-item ${activeView === 'attendance' ? 'active' : ''}`} onClick={() => setActiveView('attendance')}>📅 Attendance</li>
                  <li className={`nav-item ${activeView === 'homework' ? 'active' : ''}`} onClick={() => setActiveView('homework')}>📖 Homework</li>
                  <li className={`nav-item ${activeView === 'exams' ? 'active' : ''}`} onClick={() => setActiveView('exams')}>📝 Tests & Exams</li>
                  <li className={`nav-item ${activeView === 'testQuestions' ? 'active' : ''}`} onClick={() => setActiveView('testQuestions')}>❓ Test/Exam Questions</li>
                  <li className={`nav-item ${activeView === 'timetable' ? 'active' : ''}`} onClick={() => setActiveView('timetable')}>📅 Timetable</li>
                  <li className={`nav-item ${activeView === 'notices' ? 'active' : ''}`} onClick={() => setActiveView('notices')}>📢 Notices</li>
                  <li className={`nav-item ${activeView === 'chat' ? 'active' : ''}`} onClick={() => { setActiveView('chat'); loadBackendData(); }}>💬 Communication</li>
                  <li className={`nav-item ${activeView === 'ai' ? 'active' : ''}`} onClick={() => setActiveView('ai')}>🤖 AI Assistant</li>
                  <li className={`nav-item ${activeView === 'materials' ? 'active' : ''}`} onClick={() => setActiveView('materials')}>📚 Study Materials</li>
                </>
              )}
              {user.role === 'Student' && (
                <>
                  <li className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')}>🎛️ Dashboard</li>
                  <li className={`nav-item ${activeView === 'attendance' ? 'active' : ''}`} onClick={() => setActiveView('attendance')}>📅 Attendance</li>
                  <li className={`nav-item ${activeView === 'homework' ? 'active' : ''}`} onClick={() => setActiveView('homework')}>📖 Homework</li>
                  <li className={`nav-item ${activeView === 'exams' ? 'active' : ''}`} onClick={() => setActiveView('exams')}>📝 Tests & Exams</li>
                  <li className={`nav-item ${activeView === 'notices' ? 'active' : ''}`} onClick={() => setActiveView('notices')}>📢 Notices</li>
                  <li className={`nav-item ${activeView === 'chat' ? 'active' : ''}`} onClick={() => { setActiveView('chat'); loadBackendData(); }}>💬 Communication</li>
                  <li className={`nav-item ${activeView === 'reportCard' ? 'active' : ''}`} onClick={() => setActiveView('reportCard')}>📜 Report Card</li>
                  <li className={`nav-item ${activeView === 'progress' ? 'active' : ''}`} onClick={() => setActiveView('progress')}>📈 Progress</li>
                  <li className={`nav-item ${activeView === 'ai' ? 'active' : ''}`} onClick={() => setActiveView('ai')}>🤖 AI Assistant</li>
                  <li className={`nav-item ${activeView === 'materials' ? 'active' : ''}`} onClick={() => setActiveView('materials')}>📚 Study Materials</li>
                </>
              )}
              {user.role === 'Parent' && (
                <>
                  <li className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')}>🎛️ Dashboard</li>
                  <li className={`nav-item ${activeView === 'attendance' ? 'active' : ''}`} onClick={() => setActiveView('attendance')}>📅 Attendance</li>
                  <li className={`nav-item ${activeView === 'results' ? 'active' : ''}`} onClick={() => setActiveView('results')}>📜 Results</li>
                  <li className={`nav-item ${activeView === 'fees' ? 'active' : ''}`} onClick={() => setActiveView('fees')}>💵 Fees</li>
                  <li className={`nav-item ${activeView === 'notices' ? 'active' : ''}`} onClick={() => setActiveView('notices')}>📢 Notices</li>
                </>
              )}
            </ul>

            <div className="logout-container" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', paddingLeft: '8px' }}>
                <div className="avatar-circle" style={{ width: '40px', height: '40px', background: '#FFEFEB', color: '#FF6B35', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '15px' }}>
                  {user.name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase()}
                </div>
                <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user.email}</div>
                </div>
              </div>
              <button onClick={handleLogout} className="btn-secondary" style={{ width: '100%', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px solid #FFEFEB', background: '#FFF5F2', color: '#FF6B35' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                Logout
              </button>
            </div>
          </div>

          <div className="main-content">
            {/* Top Header Bar */}
            <div className="top-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', gap: '20px' }}>
              {/* Left actions: Document link & Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: 'white',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                    <path d="M6 6h10M6 10h10" />
                  </svg>
                </div>
                <div style={{ position: 'relative', width: '240px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search students, classes..."
                    style={{
                      width: '100%',
                      padding: '10px 16px 10px 40px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)',
                      background: 'white',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Center actions: Dashboard Dynamic Orange Pill Banner */}
              <div style={{ display: 'flex', justifyContent: 'center', flex: '1' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #FF9E79 0%, #FF6B35 100%)',
                  color: 'white',
                  padding: '10px 36px',
                  borderRadius: '50px',
                  fontSize: '18px',
                  fontWeight: '800',
                  boxShadow: '0 6px 20px rgba(255, 107, 53, 0.25)',
                  letterSpacing: '0.5px',
                  whiteSpace: 'nowrap'
                }}>
                  {user.role === 'SuperAdmin' ? 'SuperAdmin Dashboard' :
                    user.role === 'Admin' ? 'Admin Dashboard' :
                      user.role === 'Teacher' ? 'Teacher Dashboard' :
                        user.role === 'Student' ? 'Student Dashboard' :
                          user.role === 'Parent' ? 'Parent Dashboard' : 'Dashboard'}
                </div>
              </div>

              {/* Right actions: Bell, Dropdown, Profile */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'flex-end', flex: '1' }}>
                {/* Notification Bell */}
                <div style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                  </svg>
                  <span style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', background: '#FF6B35', borderRadius: '50%', border: '2px solid white' }}></span>
                </div>

                {/* School Badge Dropdown */}
                {user.role !== 'SuperAdmin' && (
                  <div className="school-dropdown-badge" style={{ background: '#FFF5F2', border: 'none', color: '#FF6B35', fontWeight: '600', padding: '10px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    🏫 {user.schoolName || 'School'}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                  </div>
                )}

                {/* Avatar with Dropdown */}
                <div style={{ position: 'relative' }}>
                  <div
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: '#FFEFEB',
                      color: '#FF6B35',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '15px',
                      textTransform: 'uppercase',
                      border: '1px solid #FFEFEB',
                      cursor: 'pointer'
                    }}
                  >
                    {user.name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase()}
                  </div>
                  {profileDropdownOpen && (
                    <div className="glass-panel" style={{
                      position: 'absolute',
                      right: '0',
                      top: '48px',
                      width: '260px',
                      background: 'white',
                      border: '1px solid var(--border-color)',
                      borderRadius: '16px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                      padding: '16px',
                      zIndex: '1000',
                      textAlign: 'left'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#FFEFEB', color: '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
                          {user.name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user.email}</div>
                          <span className="badge badge-admin" style={{ fontSize: '10px', marginTop: '4px', display: 'inline-block' }}>{user.role}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-main)' }} className="profile-dropdown-item" onClick={() => { setProfileDropdownOpen(false); setActiveView('profile'); }}>👤 My Profile</div>
                        <div style={{ padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-main)' }} className="profile-dropdown-item" onClick={() => { setProfileDropdownOpen(false); showError('Account Settings features enabled.'); }}>⚙️ Account Settings</div>
                        <div style={{ padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-main)' }} className="profile-dropdown-item" onClick={() => { setProfileDropdownOpen(false); showError('Security Credentials module.'); }}>🔒 Security & Privacy</div>
                      </div>
                      <div style={{ borderTop: '1px solid #F1F5F9', marginTop: '12px', paddingTop: '12px' }}>
                        <button onClick={handleLogout} className="btn-secondary" style={{ width: '100%', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px solid #FFEFEB', background: '#FFF5F2', color: '#FF6B35', fontSize: '13px' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* View Title */}
            <div style={{ textAlign: 'left', marginBottom: '24px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: '700', textTransform: 'capitalize' }}>
                {activeView === 'tenants' ? 'Registered School Tenants' :
                  activeView === 'inquiries' ? 'Website Inquiries (Get In Touch)' :
                  user.role === 'SuperAdmin' || activeView === 'superadmin' ? 'Super Admin Dashboard' :
                  activeView === 'subjectClass' ? 'Subject & Class Mappings' : activeView === 'roles' ? 'Roles & Permissions Matrix' : activeView}
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                {activeView === 'tenants' ? 'Manage SaaS platform school tenants, activation statuses, and credentials.' :
                  activeView === 'inquiries' ? 'Review and respond to prospective school lead inquiries submitted via the website.' :
                  user.role === 'SuperAdmin' || activeView === 'superadmin' ? 'Welcome to the Super Admin platform control center.' :
                  activeView === 'dashboard' ? "Welcome back! Here's what's happening today." :
                  activeView === 'homework' ? "Manage, assign and view homework statuses." :
                    activeView === 'reports' ? "Analyze academic growth, attendances and financials." :
                      activeView === 'roles' ? "Configure system level user access permissions." :
                        activeView === 'subjectClass' ? "Map subject and class to faculty." :
                          `Workspace control portal for ${activeView}.`}
              </p>
            </div>

            {/* Dashboard View */}
            {activeView === 'dashboard' && (
              <div>
                {/* 1. Admin Dashboard */}
                {user.role === 'Admin' && (
                  <div>
                    <div className="dashboard-grid">
                      <div className="stats-card glass-panel" style={{ background: 'linear-gradient(135deg, #FF9E79 0%, #FF6B35 100%)' }}>
                        <div className="stats-info">
                          <h3>Total Students</h3>
                          <div className="value">{totalStudentsCount || 2}</div>
                        </div>
                        <div className="stats-icon-container">👥</div>
                      </div>

                      <div className="stats-card glass-panel" style={{ background: 'linear-gradient(135deg, #849CFF 0%, #5B7FFF 100%)' }}>
                        <div className="stats-info">
                          <h3>Total Teachers</h3>
                          <div className="value">{totalTeachersCount || 1}</div>
                        </div>
                        <div className="stats-icon-container">🎓</div>
                      </div>

                      <div className="stats-card glass-panel" style={{ background: 'linear-gradient(135deg, #4AF0EC 0%, #12CCD0 100%)' }}>
                        <div className="stats-info">
                          <h3>Attendance Rate</h3>
                          <div className="value">92%</div>
                        </div>
                        <div className="stats-icon-container">📅</div>
                      </div>

                      <div className="stats-card glass-panel" style={{ background: 'linear-gradient(135deg, #FF805D 0%, #FF4D2D 100%)' }}>
                        <div className="stats-info">
                          <h3>Fee Collection</h3>
                          <div className="value">₹500</div>
                        </div>
                        <div className="stats-icon-container">₹</div>
                      </div>
                    </div>

                    <div className="charts-grid">
                      <div className="chart-card">
                        <h3 className="chart-title">Attendance Overview</h3>
                        <div style={{ padding: '10px 0' }}>
                          <svg viewBox="0 0 500 200" style={{ width: '100%', height: '180px' }}>
                            <defs>
                              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#FF6B35" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#FF6B35" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>
                            <path
                              d="M 30 160 Q 100 20 180 150 T 320 60 T 450 130"
                              fill="none"
                              stroke="#FF6B35"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                            />
                            <path
                              d="M 30 160 Q 100 20 180 150 T 320 60 T 450 130 L 450 180 L 30 180 Z"
                              fill="url(#chartGrad)"
                            />
                            <line x1="30" y1="180" x2="470" y2="180" stroke="#E2E8F0" strokeWidth="1" />
                            <text x="30" y="195" fill="#9094A6" fontSize="11" textAnchor="middle">Sat</text>
                            <text x="110" y="195" fill="#9094A6" fontSize="11" textAnchor="middle">Sun</text>
                            <text x="180" y="195" fill="#9094A6" fontSize="11" textAnchor="middle">Mon</text>
                            <text x="250" y="195" fill="#9094A6" fontSize="11" textAnchor="middle">Tue</text>
                            <text x="320" y="195" fill="#9094A6" fontSize="11" textAnchor="middle">Wed</text>
                            <text x="390" y="195" fill="#9094A6" fontSize="11" textAnchor="middle">Thu</text>
                            <text x="450" y="195" fill="#9094A6" fontSize="11" textAnchor="middle">Fri</text>
                          </svg>
                        </div>
                      </div>

                      <div className="chart-card">
                        <h3 className="chart-title">Fee Collection</h3>
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '180px', paddingBottom: '10px', borderBottom: '1px solid #E2E8F0' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: '36px', height: '60px', background: 'linear-gradient(to top, #FF9E79, #FF6B35)', borderRadius: '6px' }}></div>
                            <span style={{ fontSize: '12px', marginTop: '8px', color: 'var(--text-muted)' }}>Feb</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: '36px', height: '90px', background: 'linear-gradient(to top, #FF9E79, #FF6B35)', borderRadius: '6px' }}></div>
                            <span style={{ fontSize: '12px', marginTop: '8px', color: 'var(--text-muted)' }}>Mar</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: '36px', height: '110px', background: 'linear-gradient(to top, #FF9E79, #FF6B35)', borderRadius: '6px' }}></div>
                            <span style={{ fontSize: '12px', marginTop: '8px', color: 'var(--text-muted)' }}>Apr</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: '36px', height: '80px', background: 'linear-gradient(to top, #FF9E79, #FF6B35)', borderRadius: '6px' }}></div>
                            <span style={{ fontSize: '12px', marginTop: '8px', color: 'var(--text-muted)' }}>May</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: '36px', height: '130px', background: 'linear-gradient(to top, #FF9E79, #FF6B35)', borderRadius: '6px' }}></div>
                            <span style={{ fontSize: '12px', marginTop: '8px', color: 'var(--text-muted)' }}>Jun</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: '36px', height: '150px', background: 'linear-gradient(to top, #FF9E79, #FF6B35)', borderRadius: '6px' }}></div>
                            <span style={{ fontSize: '12px', marginTop: '8px', color: 'var(--text-muted)' }}>Jul</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
                      <div className="glass-panel" style={{ padding: '24px', background: 'white', textAlign: 'left' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Class Performance</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Class averages across secondary school sections are fully updated.</p>
                      </div>
                      <div className="glass-panel" style={{ padding: '24px', background: 'white', textAlign: 'left' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Recent Activity</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Fee structure mapping generated for Class 10-A.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Teacher Dashboard */}
                {user.role === 'Teacher' && (
                  <div>
                    <div className="dashboard-grid">
                      <div className="stats-card glass-panel" style={{ background: 'linear-gradient(135deg, #849CFF 0%, #5B7FFF 100%)' }}>
                        <div className="stats-info">
                          <h3>My Classes</h3>
                          <div className="value">1</div>
                        </div>
                        <div className="stats-icon-container">🏫</div>
                      </div>

                      <div className="stats-card glass-panel" style={{ background: 'linear-gradient(135deg, #FF9E79 0%, #FF6B35 100%)' }}>
                        <div className="stats-info">
                          <h3>Total Students</h3>
                          <div className="value">1</div>
                        </div>
                        <div className="stats-icon-container">👥</div>
                      </div>

                      <div className="stats-card glass-panel" style={{ background: 'linear-gradient(135deg, #4AF0EC 0%, #12CCD0 100%)' }}>
                        <div className="stats-info">
                          <h3>Today's Attendance</h3>
                          <div className="value">--</div>
                        </div>
                        <div className="stats-icon-container">📅</div>
                      </div>

                      <div className="stats-card glass-panel" style={{ background: 'linear-gradient(135deg, #FF805D 0%, #FF4D2D 100%)' }}>
                        <div className="stats-info">
                          <h3>Assignments Pending</h3>
                          <div className="value">0</div>
                        </div>
                        <div className="stats-icon-container">📝</div>
                      </div>
                    </div>

                    <div className="charts-grid">
                      <div className="chart-card">
                        <h3 className="chart-title">Weekly Attendance Trend - Jul 2026</h3>
                        <div style={{ padding: '10px 0' }}>
                          <svg viewBox="0 0 500 200" style={{ width: '100%', height: '180px' }}>
                            <path
                              d="M 30 20 L 180 80 L 320 140 L 450 180"
                              fill="none"
                              stroke="#FF6B35"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                            />
                            <circle cx="30" cy="20" r="6" fill="#FF6B35" />
                            <circle cx="180" cy="80" r="6" fill="#FF6B35" />
                            <circle cx="320" cy="140" r="6" fill="#FF6B35" />
                            <circle cx="450" cy="180" r="6" fill="#FF6B35" />
                            <line x1="30" y1="180" x2="470" y2="180" stroke="#E2E8F0" strokeWidth="1" />
                          </svg>
                        </div>
                      </div>

                      <div className="chart-card">
                        <h3 className="chart-title">Class Performance Average</h3>
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '180px', paddingBottom: '10px', borderBottom: '1px solid #E2E8F0' }}>
                          <div style={{ width: '40px', height: '140px', background: 'linear-gradient(to top, #849CFF, #5B7FFF)', borderRadius: '6px' }}></div>
                          <div style={{ width: '40px', height: '110px', background: 'linear-gradient(to top, #849CFF, #5B7FFF)', borderRadius: '6px' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Student Dashboard */}
                {user.role === 'Student' && (
                  <div>
                    <div className="dashboard-grid">
                      <div className="stats-card glass-panel" style={{ background: 'linear-gradient(135deg, #4AF0EC 0%, #12CCD0 100%)' }}>
                        <div className="stats-info">
                          <h3>Attendance</h3>
                          <div className="value">100%</div>
                        </div>
                        <div className="stats-icon-container">📅</div>
                      </div>

                      <div className="stats-card glass-panel" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                        <div className="stats-info">
                          <h3>Total Fees</h3>
                          <div className="value">₹0</div>
                        </div>
                        <div className="stats-icon-container">💵</div>
                      </div>

                      <div className="stats-card glass-panel" style={{ background: 'linear-gradient(135deg, #FF9E79 0%, #FF6B35 100%)' }}>
                        <div className="stats-info">
                          <h3>Fee Pending</h3>
                          <div className="value">₹0</div>
                        </div>
                        <div className="stats-icon-container">💳</div>
                      </div>

                      <div className="stats-card glass-panel" style={{ background: 'linear-gradient(135deg, #849CFF 0%, #5B7FFF 100%)' }}>
                        <div className="stats-info">
                          <h3>Upcoming Exams</h3>
                          <div className="value">0</div>
                        </div>
                        <div className="stats-icon-container">📝</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', marginTop: '24px' }}>
                      <div className="glass-panel" style={{ padding: '24px', background: 'white', textAlign: 'left' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>📅 Today's Timetable</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No classes scheduled today.</p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="glass-panel" style={{ padding: '20px', background: 'white', textAlign: 'left' }}>
                          <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>📝 Upcoming Exams</h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No upcoming exams.</p>
                        </div>
                        <div className="glass-panel" style={{ padding: '20px', background: 'white', textAlign: 'left' }}>
                          <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>📢 Notices</h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>26 Independence day - Celebration scheduled at school ground.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Parent Dashboard */}
                {user.role === 'Parent' && (
                  <div>
                    <div className="dashboard-grid">
                      <div className="stats-card glass-panel" style={{ background: 'linear-gradient(135deg, #4AF0EC 0%, #12CCD0 100%)' }}>
                        <div className="stats-info">
                          <h3>Attendance</h3>
                          <div className="value">100%</div>
                        </div>
                        <div className="stats-icon-container">📅</div>
                      </div>

                      <div className="stats-card glass-panel" style={{ background: 'linear-gradient(135deg, #FF9E79 0%, #FF6B35 100%)' }}>
                        <div className="stats-info">
                          <h3>Pending Fees</h3>
                          <div className="value">Rs.0</div>
                        </div>
                        <div className="stats-icon-container">💵</div>
                      </div>

                      <div className="stats-card glass-panel" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                        <div className="stats-info">
                          <h3>Avg Score</h3>
                          <div className="value">0%</div>
                        </div>
                        <div className="stats-icon-container">📈</div>
                      </div>

                      <div className="stats-card glass-panel" style={{ background: 'linear-gradient(135deg, #849CFF 0%, #5B7FFF 100%)' }}>
                        <div className="stats-info">
                          <h3>Conduct</h3>
                          <div className="value">1</div>
                        </div>
                        <div className="stats-icon-container">⭐</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', marginTop: '24px' }}>
                      <div className="glass-panel" style={{ padding: '24px', background: 'white', textAlign: 'left' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Academic Progress</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No exams results yet.</p>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="glass-panel" style={{ padding: '20px', background: 'white', textAlign: 'left' }}>
                          <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>💳 Fee History</h4>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span>Tuition Fee</span>
                            <strong>Rs. 500</strong>
                          </div>
                        </div>
                        <div className="glass-panel" style={{ padding: '20px', background: 'white', textAlign: 'left' }}>
                          <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>📝 Upcoming Exams</h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No upcoming exams</p>
                        </div>
                        <div className="glass-panel" style={{ padding: '20px', background: 'white', textAlign: 'left' }}>
                          <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>📢 School Notices</h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>26 Independence day celebrations</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Super Admin Dashboard Overview */}
                {user.role === 'SuperAdmin' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                    {/* Summary Stat Cards */}
                    <div className="dashboard-grid">
                      <div className="stats-card glass-panel" style={{ background: 'linear-gradient(135deg, #FF9E79 0%, #FF6B35 100%)', cursor: 'pointer' }} onClick={() => setActiveView('tenants')}>
                        <div className="stats-info">
                          <h3>Total School Tenants</h3>
                          <div className="value">{schools.length}</div>
                        </div>
                        <div className="stats-icon-container">🏢</div>
                      </div>

                      <div className="stats-card glass-panel" style={{ background: 'linear-gradient(135deg, #4AF0EC 0%, #12CCD0 100%)', cursor: 'pointer' }} onClick={() => setActiveView('tenants')}>
                        <div className="stats-info">
                          <h3>Active Tenants</h3>
                          <div className="value">{schools.filter(s => s.isActive).length}</div>
                        </div>
                        <div className="stats-icon-container">✅</div>
                      </div>

                      <div className="stats-card glass-panel" style={{ background: 'linear-gradient(135deg, #849CFF 0%, #5B7FFF 100%)', cursor: 'pointer' }} onClick={() => setActiveView('inquiries')}>
                        <div className="stats-info">
                          <h3>Website Inquiries</h3>
                          <div className="value">{contactInquiries.length}</div>
                        </div>
                        <div className="stats-icon-container">📥</div>
                      </div>

                      <div className="stats-card glass-panel" style={{ background: 'linear-gradient(135deg, #FF805D 0%, #FF4D2D 100%)', cursor: 'pointer' }} onClick={() => setActiveView('inquiries')}>
                        <div className="stats-info">
                          <h3>New Leads</h3>
                          <div className="value" style={{ fontSize: '20px', fontWeight: '700' }}>
                            {contactInquiries.filter(i => i.status === 'New').length}
                          </div>
                        </div>
                        <div className="stats-icon-container">⚡</div>
                      </div>
                    </div>

                    {/* Dashboard Overview Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                      <div className="glass-panel" style={{ padding: '24px', background: 'white', borderRadius: '16px', textAlign: 'left' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>🏢 Registered School Tenants</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                          Manage {schools.length} registered school tenants, activation statuses, and credentials.
                        </p>
                        <button className="btn-primary" onClick={() => setActiveView('tenants')}>View All Registered Schools →</button>
                      </div>
                      <div className="glass-panel" style={{ padding: '24px', background: 'white', borderRadius: '16px', textAlign: 'left' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>📥 Website Inquiries & Leads</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                          You have {contactInquiries.filter(i => i.status === 'New').length} new inquiry lead(s) waiting for response.
                        </p>
                        <button className="btn-primary" onClick={() => setActiveView('inquiries')}>View Website Inquiries →</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. Registered Schools Management View (Active when activeView === 'tenants' or 'superadmin') */}
            {(activeView === 'tenants' || activeView === 'superadmin') && (
              <div className="glass-panel" style={{ padding: '28px', background: 'white', borderRadius: '16px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>🏢 Registered School Tenants</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>Manage SaaS platform school tenants, activation statuses, and credentials.</p>
                  </div>
                  <button className="btn-primary" onClick={() => setRegisterModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    ➕ Register New School
                  </button>
                </div>

                {schools.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: '15px' }}>No registered school tenants found in database.</p>
                    <button className="btn-secondary" onClick={() => setRegisterModal(true)} style={{ marginTop: '12px' }}>Register First School Tenant</button>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>School Name</th>
                          <th>Tenant Email</th>
                          <th>Contact Phone</th>
                          <th>Address</th>
                          <th>Verification</th>
                          <th>Tenant Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schools.map((school, idx) => (
                          <tr key={school._id || idx}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '18px' }}>🏫</span>
                                <strong>{school.name}</strong>
                              </div>
                            </td>
                            <td>{school.email}</td>
                            <td>{school.phone || 'N/A'}</td>
                            <td>{school.address || 'N/A'}</td>
                            <td>
                              <span className={`badge ${school.isVerified ? 'badge-teacher' : 'badge-student'}`}>
                                {school.isVerified ? 'Verified' : 'Pending OTP'}
                              </span>
                            </td>
                            <td>
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: '700',
                                background: school.isActive ? '#E6F4EA' : '#FCE8E6',
                                color: school.isActive ? '#137333' : '#C5221F'
                              }}>
                                {school.isActive ? '● Active' : '● Suspended'}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn-secondary"
                                onClick={() => handleToggleSchoolStatus(school._id)}
                                style={{
                                  padding: '6px 14px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  borderColor: school.isActive ? '#F87171' : '#34D399',
                                  color: school.isActive ? '#DC2626' : '#059669'
                                }}
                              >
                                {school.isActive ? 'Suspend' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 3. Website Inquiries (Get In Touch) View (Active when activeView === 'inquiries') */}
            {activeView === 'inquiries' && (
              <div className="glass-panel" style={{ padding: '28px', background: 'white', borderRadius: '16px', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>📥 Website Inquiries (Get In Touch)</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>Prospective school leads & messages submitted via website contact form.</p>
                  </div>
                  <span className="badge badge-admin">{contactInquiries.length} Total Inquiries</span>
                </div>

                {/* 2 Tabs: List of Inquiries (Active/Pending) vs Solved Inquiries */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
                  <button
                    onClick={() => setInquiryTab('active')}
                    style={{
                      padding: '10px 20px',
                      fontSize: '13px',
                      fontWeight: '700',
                      borderRadius: '10px',
                      background: inquiryTab === 'active' ? 'linear-gradient(135deg, #FF6B35 0%, #FF805D 100%)' : '#F1F5F9',
                      color: inquiryTab === 'active' ? '#FFFFFF' : '#475569',
                      border: inquiryTab === 'active' ? 'none' : '1px solid #CBD5E1',
                      boxShadow: inquiryTab === 'active' ? '0 4px 12px rgba(255, 107, 53, 0.3)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    📋 List of Inquiries ({contactInquiries.filter(i => i.status !== 'Resolved').length})
                  </button>
                  <button
                    onClick={() => setInquiryTab('solved')}
                    style={{
                      padding: '10px 20px',
                      fontSize: '13px',
                      fontWeight: '700',
                      borderRadius: '10px',
                      background: inquiryTab === 'solved' ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : '#F1F5F9',
                      color: inquiryTab === 'solved' ? '#FFFFFF' : '#475569',
                      border: inquiryTab === 'solved' ? 'none' : '1px solid #CBD5E1',
                      boxShadow: inquiryTab === 'solved' ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    ✅ Solved Inquiries ({contactInquiries.filter(i => i.status === 'Resolved').length})
                  </button>
                </div>

                {contactInquiries.filter(inq => inquiryTab === 'solved' ? inq.status === 'Resolved' : inq.status !== 'Resolved').length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: '15px' }}>
                      {inquiryTab === 'solved' ? 'No solved inquiries found.' : 'No active inquiries in list.'}
                    </p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>Sender Name</th>
                          <th>Email & Phone</th>
                          <th>Message / Query</th>
                          <th>Date Received</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contactInquiries
                          .filter(inq => inquiryTab === 'solved' ? inq.status === 'Resolved' : inq.status !== 'Resolved')
                          .map((inq, idx) => (
                            <tr key={inq._id || idx}>
                              <td><strong>{inq.name}</strong></td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '13px' }}>
                                  <span>✉️ {inq.email}</span>
                                  {inq.phone && <span style={{ color: 'var(--text-muted)' }}>📞 {inq.phone}</span>}
                                </div>
                              </td>
                              <td style={{ maxWidth: '280px', whiteSpace: 'normal', wordBreak: 'break-word', fontSize: '13px' }}>
                                {inq.message}
                              </td>
                              <td style={{ whiteSpace: 'nowrap', fontSize: '12px', color: 'var(--text-muted)' }}>
                                {new Date(inq.createdAt).toLocaleString()}
                              </td>
                              <td>
                                <span style={{
                                  padding: '4px 10px',
                                  borderRadius: '20px',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  background: inq.status === 'Resolved' ? '#E6F4EA' : inq.status === 'Contacted' ? '#FEF3C7' : '#E0F2FE',
                                  color: inq.status === 'Resolved' ? '#137333' : inq.status === 'Contacted' ? '#D97706' : '#0369A1'
                                }}>
                                  {inq.status === 'New' ? '● New Inquiry' : inq.status === 'Contacted' ? '● Contacted' : '✔ Resolved'}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  {inq.status !== 'Contacted' && (
                                    <button
                                      className="btn-secondary"
                                      onClick={() => handleUpdateInquiryStatus(inq._id, 'Contacted')}
                                      style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', cursor: 'pointer' }}
                                    >
                                      Mark Contacted
                                    </button>
                                  )}
                                  {inq.status !== 'Resolved' && (
                                    <button
                                      className="btn-secondary"
                                      onClick={() => handleUpdateInquiryStatus(inq._id, 'Resolved')}
                                      style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', cursor: 'pointer', borderColor: '#34D399', color: '#059669' }}
                                    >
                                      Mark Resolved
                                    </button>
                                  )}
                                  <button
                                    className="btn-secondary"
                                    onClick={() => handleDeleteInquiry(inq._id)}
                                    style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', cursor: 'pointer', borderColor: '#F87171', color: '#DC2626' }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Students CRUD View */}
            {activeView === 'students' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <form onSubmit={addStudent} className="glass-panel" style={{ padding: '24px', background: 'white', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Student Name</label>
                    <input type="text" className="form-input" placeholder="Name" value={studentForm.name} onChange={e => setStudentForm({ ...studentForm, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" className="form-input" placeholder="Email" value={studentForm.email} onChange={e => setStudentForm({ ...studentForm, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input type="password" className="form-input" placeholder="Password" value={studentForm.password} onChange={e => setStudentForm({ ...studentForm, password: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Roll Number</label>
                    <input type="text" className="form-input" placeholder="Roll Number" value={studentForm.rollNumber} onChange={e => setStudentForm({ ...studentForm, rollNumber: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Assign Class</label>
                    <select className="form-input" value={studentForm.classId} onChange={e => setStudentForm({ ...studentForm, classId: e.target.value })}>
                      <option value="">Choose Class</option>
                      {classes.map(c => <option key={c._id} value={c._id}>{c.name} - {c.section}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Parent Name</label>
                    <input type="text" className="form-input" placeholder="Parent Name" value={studentForm.parentName} onChange={e => setStudentForm({ ...studentForm, parentName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Parent Email</label>
                    <input type="email" className="form-input" placeholder="Parent Email" value={studentForm.parentEmail} onChange={e => setStudentForm({ ...studentForm, parentEmail: e.target.value })} />
                  </div>
                  <button type="submit" className="btn-primary" style={{ gridColumn: 'span 3', justifySelf: 'end' }} disabled={submitting}>{submitting ? 'Adding...' : 'Add Student Profile'}</button>
                </form>

                {students.length === 0 ? (
                  <div className="glass-panel" style={{ padding: '40px', background: 'white', borderRadius: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: '15px', margin: 0 }}>👥 No student profiles registered under this school tenant yet.</p>
                    <p style={{ fontSize: '13px', marginTop: '6px' }}>Use the form above to add your first student profile.</p>
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Roll Number</th>
                          <th>Class</th>
                          <th>Parent</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student, idx) => (
                          <tr key={idx}>
                            <td><strong>{student.userId ? student.userId.name : student.name}</strong></td>
                            <td>{student.userId ? student.userId.email : student.email}</td>
                            <td><span className="badge badge-teacher">{student.rollNumber}</span></td>
                            <td>{student.classId ? `${student.classId.name} ${student.classId.section}` : 'N/A'}</td>
                            <td>{student.parentId ? student.parentId.name : 'N/A'}</td>
                            <td><span className="badge badge-student">Active</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Teachers View */}
            {activeView === 'teachers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <form onSubmit={addTeacher} className="glass-panel" style={{ padding: '24px', background: 'white', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Teacher Name</label>
                    <input type="text" className="form-input" placeholder="Name" value={teacherForm.name} onChange={e => setTeacherForm({ ...teacherForm, name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" className="form-input" placeholder="Email" value={teacherForm.email} onChange={e => setTeacherForm({ ...teacherForm, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input type="password" className="form-input" placeholder="Password" value={teacherForm.password} onChange={e => setTeacherForm({ ...teacherForm, password: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Qualification</label>
                    <input type="text" className="form-input" placeholder="B.Ed, M.Sc etc" value={teacherForm.qualification} onChange={e => setTeacherForm({ ...teacherForm, qualification: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Experience (Years)</label>
                    <input type="number" className="form-input" value={teacherForm.experience} onChange={e => setTeacherForm({ ...teacherForm, experience: parseInt(e.target.value) })} />
                  </div>
                  <button type="submit" className="btn-primary" style={{ gridColumn: 'span 3', justifySelf: 'end' }} disabled={submitting}>{submitting ? 'Adding...' : 'Add Teacher Profile'}</button>
                </form>

                <div className="table-container">
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Qualification</th>
                        <th>Experience</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teachers.map((teacher, idx) => (
                        <tr key={idx}>
                          <td><strong>{teacher.user ? teacher.user.name : teacher.name}</strong></td>
                          <td>{teacher.user ? teacher.user.email : teacher.email}</td>
                          <td><span className="badge badge-admin">{teacher.profileDetails ? teacher.profileDetails.qualification : teacher.qualification || 'B.Ed'}</span></td>
                          <td>{teacher.profileDetails ? teacher.profileDetails.experience : teacher.experience || 3} Years</td>
                          <td><span className="badge badge-student">Active</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Classes View */}
            {activeView === 'classes' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '32px' }}>
                <div className="glass-panel" style={{ padding: '24px', background: 'white', textAlign: 'left' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>{editingClass ? 'Edit Class Section' : 'Create Class Section'}</h3>
                  <form onSubmit={addClass}>
                    <div className="form-group">
                      <label>Grade Level</label>
                      <input type="text" className="form-input" required placeholder="e.g. 10th, 9th" value={classForm.name} onChange={e => setClassForm({ ...classForm, name: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Section Division</label>
                      <input type="text" className="form-input" required placeholder="e.g. A, B" value={classForm.section} onChange={e => setClassForm({ ...classForm, section: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Room Number</label>
                      <input type="text" className="form-input" placeholder="e.g. Room 102" value={classForm.roomNumber} onChange={e => setClassForm({ ...classForm, roomNumber: e.target.value })} />
                    </div>
                    <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={submitting}>{submitting ? 'Saving...' : (editingClass ? 'Update Class Details' : 'Register Class Section')}</button>
                    {editingClass && (
                      <button type="button" className="btn-secondary" style={{ width: '100%', marginTop: '8px' }} onClick={() => { setEditingClass(null); setClassForm({ name: '', section: '', roomNumber: '' }); }}>Cancel Edit</button>
                    )}
                  </form>
                </div>

                <div className="table-container">
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Class Section Name</th>
                        <th>Room Number Location</th>
                        <th>Student Population</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classes.map((cls, idx) => (
                        <tr key={idx}>
                          <td><strong>Class {cls.name} - {cls.section}</strong></td>
                          <td>{cls.roomNumber || 'TBD'}</td>
                          <td><span className="badge badge-teacher">Active</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => { setEditingClass(cls); setClassForm({ name: cls.name, section: cls.section, roomNumber: cls.roomNumber || '' }); }}>Edit ✏️</button>
                              <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', background: '#FFF5F2', color: '#FF6B35', border: '1px solid #FFEFEB' }} onClick={() => deleteClassSection(cls._id)}>Delete 🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Period-Wise & Subject-Wise Attendance View */}
            {activeView === 'attendance' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {/* Header Control Panel */}
                <div className="glass-panel" style={{ padding: '24px', background: 'white', borderRadius: '16px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>📅 Period-Wise & Subject-Wise Attendance</h2>
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>
                        Mark student attendance period-by-period based on taught subjects according to timetable schedules.
                      </p>
                    </div>
                    {attendanceSheetMeta && (
                      <span className="badge badge-teacher">
                        Sheet Saved (ID: {attendanceSheetMeta.sheetId?.substring(0, 8)})
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 1fr', gap: '16px', background: '#F8FAFC', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0', alignItems: 'end' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: '700', fontSize: '12px' }}>Class Section *</label>
                      <select
                        className="form-input"
                        value={selectedAttendanceClass}
                        onChange={e => {
                          const clsId = e.target.value;
                          setSelectedAttendanceClass(clsId);
                          fetchTeacherPeriods(clsId, selectedAttendanceDate);
                          setAttendanceStudentRecords([]);
                        }}
                      >
                        <option value="">Select Class</option>
                        {classes.map(c => <option key={c._id} value={c._id}>{c.name} - {c.section}</option>)}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: '700', fontSize: '12px' }}>Attendance Date *</label>
                      <input
                        type="date"
                        className="form-input"
                        value={selectedAttendanceDate}
                        onChange={e => {
                          const dStr = e.target.value;
                          setSelectedAttendanceDate(dStr);
                          if (selectedAttendanceClass) {
                            fetchTeacherPeriods(selectedAttendanceClass, dStr);
                          }
                          setAttendanceStudentRecords([]);
                        }}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: '700', fontSize: '12px' }}>Taught Subject & Period Slot *</label>
                      <select
                        className="form-input"
                        value={selectedAttendancePeriod ? `${selectedAttendancePeriod}_${selectedAttendanceSubject}` : ''}
                        onChange={e => {
                          const val = e.target.value;
                          if (!val) {
                            setSelectedAttendancePeriod('');
                            setSelectedAttendanceSubject('');
                            return;
                          }
                          const [pNum, sId] = val.split('_');
                          setSelectedAttendancePeriod(pNum);
                          setSelectedAttendanceSubject(sId || '');
                        }}
                      >
                        <option value="">Full Day Attendance (Default)</option>
                        {teacherPeriodSlots.map((slot, sIdx) => {
                          const subName = slot.subjectId ? slot.subjectId.name : 'Subject';
                          const tchName = slot.teacherId ? slot.teacherId.name : '';
                          return (
                            <option key={sIdx} value={`${slot.periodNumber}_${slot.subjectId?._id || ''}`}>
                              Period {slot.periodNumber}: {subName} ({slot.startTime} - {slot.endTime}) {tchName ? `- ${tchName}` : ''}
                            </option>
                          );
                        })}
                        {teacherPeriodSlots.length === 0 && (
                          <>
                            {subjects
                              .filter(s => {
                                if (!selectedAttendanceClass) return true;
                                const tCId = typeof s.classId === 'object' ? s.classId?._id : s.classId;
                                return !tCId || tCId === selectedAttendanceClass;
                              })
                              .map((s, idx) => (
                                <option key={s._id} value={`${idx + 1}_${s._id}`}>
                                  Period {idx + 1}: {s.name} ({s.code})
                                </option>
                              ))}
                          </>
                        )}
                      </select>
                    </div>

                    <button
                      className="btn-primary"
                      onClick={() => loadAttendanceRegister(selectedAttendanceClass, selectedAttendanceDate, selectedAttendancePeriod, selectedAttendanceSubject)}
                      disabled={loadingAttendance || !selectedAttendanceClass}
                      style={{ height: '42px', fontWeight: '700' }}
                    >
                      {loadingAttendance ? 'Loading...' : '📋 Fetch Attendance Sheet'}
                    </button>
                  </div>
                </div>

                {/* Attendance Records Table */}
                <div className="glass-panel" style={{ padding: '24px', background: 'white', borderRadius: '16px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>
                        Student Attendance Sheet List
                      </h3>
                      {attendanceStudentRecords.length > 0 && (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Total Students: <strong>{attendanceStudentRecords.length}</strong> | Present: <strong style={{ color: '#059669' }}>{attendanceStudentRecords.filter(r => r.status === 'Present').length}</strong> | Absent: <strong style={{ color: '#DC2626' }}>{attendanceStudentRecords.filter(r => r.status === 'Absent').length}</strong> | Late: <strong style={{ color: '#D97706' }}>{attendanceStudentRecords.filter(r => r.status === 'Late').length}</strong>
                        </span>
                      )}
                    </div>

                    {attendanceStudentRecords.length > 0 && (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="button" className="btn-secondary" onClick={() => handleMarkAllAttendance('Present')} style={{ fontSize: '12px', padding: '6px 14px', background: '#ECFDF5', color: '#047857', borderColor: '#A7F3D0', fontWeight: '600' }}>
                          ✅ Mark All Present
                        </button>
                        <button type="button" className="btn-secondary" onClick={() => handleMarkAllAttendance('Absent')} style={{ fontSize: '12px', padding: '6px 14px', background: '#FEF2F2', color: '#DC2626', borderColor: '#FCA5A5', fontWeight: '600' }}>
                          ❌ Mark All Absent
                        </button>
                      </div>
                    )}
                  </div>

                  {attendanceStudentRecords.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      <p style={{ fontSize: '15px', margin: 0 }}>📅 Select a Class Section and click "Fetch Attendance Sheet" to load students.</p>
                    </div>
                  ) : (
                    <>
                      <div className="table-container">
                        <table className="premium-table">
                          <thead>
                            <tr>
                              <th>Roll No</th>
                              <th>Student Name</th>
                              <th>Email ID</th>
                              <th>Attendance Status</th>
                              <th>Remarks / Reason</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendanceStudentRecords.map((rec, idx) => {
                              const stName = rec.studentId?.name || rec.studentId?.email || `Student #${idx + 1}`;
                              const stEmail = rec.studentId?.email || 'N/A';
                              return (
                                <tr key={idx}>
                                  <td><span className="badge badge-teacher">R{1001 + idx}</span></td>
                                  <td><strong>{stName}</strong></td>
                                  <td>{stEmail}</td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      <button
                                        type="button"
                                        onClick={() => handleAttendanceStatusChange(idx, 'Present')}
                                        style={{
                                          padding: '6px 14px',
                                          borderRadius: '8px',
                                          border: 'none',
                                          fontSize: '12px',
                                          fontWeight: '700',
                                          cursor: 'pointer',
                                          background: rec.status === 'Present' ? '#10B981' : '#F1F5F9',
                                          color: rec.status === 'Present' ? 'white' : '#64748B'
                                        }}
                                      >
                                        Present
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleAttendanceStatusChange(idx, 'Absent')}
                                        style={{
                                          padding: '6px 14px',
                                          borderRadius: '8px',
                                          border: 'none',
                                          fontSize: '12px',
                                          fontWeight: '700',
                                          cursor: 'pointer',
                                          background: rec.status === 'Absent' ? '#EF4444' : '#F1F5F9',
                                          color: rec.status === 'Absent' ? 'white' : '#64748B'
                                        }}
                                      >
                                        Absent
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleAttendanceStatusChange(idx, 'Late')}
                                        style={{
                                          padding: '6px 14px',
                                          borderRadius: '8px',
                                          border: 'none',
                                          fontSize: '12px',
                                          fontWeight: '700',
                                          cursor: 'pointer',
                                          background: rec.status === 'Late' ? '#F59E0B' : '#F1F5F9',
                                          color: rec.status === 'Late' ? 'white' : '#64748B'
                                        }}
                                      >
                                        Late
                                      </button>
                                    </div>
                                  </td>
                                  <td>
                                    <input
                                      type="text"
                                      className="form-input"
                                      placeholder="Optional remarks..."
                                      value={rec.remarks || ''}
                                      onChange={e => handleAttendanceRemarksChange(idx, e.target.value)}
                                      style={{ padding: '6px 10px', fontSize: '12px' }}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          className="btn-primary"
                          onClick={handleSaveAttendanceRegister}
                          disabled={submitting}
                          style={{ padding: '12px 28px', fontSize: '15px', fontWeight: '700' }}
                        >
                          {submitting ? 'Saving Register...' : '💾 Save Attendance Register'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Fees View */}
            {activeView === 'fees' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '32px' }}>
                <div className="glass-panel" style={{ padding: '24px', background: 'white', textAlign: 'left' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>Setup Fee Structure Head</h3>
                  <form onSubmit={e => { e.preventDefault(); showError('Fee Structure registered!'); }}>
                    <div className="form-group">
                      <label>Class/Grade Scope</label>
                      <select className="form-input" value={feeForm.classId} onChange={e => setFeeForm({ ...feeForm, classId: e.target.value })}>
                        <option value="">Apply to all classes</option>
                        {classes.map(c => <option key={c._id} value={c._id}>{c.name} - {c.section}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Fee Head Name</label>
                      <input type="text" className="form-input" required placeholder="e.g. Monthly Tuition Fee" value={feeForm.feeType} onChange={e => setFeeForm({ ...feeForm, feeType: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Structure Amount (₹)</label>
                      <input type="number" className="form-input" required value={feeForm.amount} onChange={e => setFeeForm({ ...feeForm, amount: parseInt(e.target.value) })} />
                    </div>
                    <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px' }}>Publish Fee Structure</button>
                  </form>
                </div>

                <div className="table-container">
                  <div style={{ padding: '16px', background: '#FAFAFB', borderBottom: '1px solid var(--border-color)' }}>
                    <strong>Active Billing Structures</strong>
                  </div>
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Fee Head</th>
                        <th>Cycle Frequency</th>
                        <th>Structure Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fees.map((fe, idx) => (
                        <tr key={idx}>
                          <td><strong>{fe.feeType}</strong></td>
                          <td><span className="badge badge-parent">{fe.frequency}</span></td>
                          <td><strong>₹{fe.amount}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Timetable View */}
            {activeView === 'timetable' && (
              <div className="timetable-grid-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <select className="form-input" style={{ width: '200px' }}>
                      <option>Class Class 10-A</option>
                    </select>
                    {['Admin', 'Teacher'].includes(user.role) && (
                      <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setManagePeriodModal(true)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                        Manage Periods
                      </button>
                    )}
                  </div>
                  <div className="timetable-filters">
                    {['All', 'English', 'Mathematics', 'Physics'].map(subject => (
                      <button
                        key={subject}
                        className={`timetable-filter-pill ${timetableFilter === subject ? 'active' : ''}`}
                        onClick={() => setTimetableFilter(subject)}
                      >
                        {subject}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="timetable-grid">
                  <div className="timetable-grid-header">TIME</div>
                  <div className="timetable-grid-header">MONDAY</div>
                  <div className="timetable-grid-header">TUESDAY</div>
                  <div className="timetable-grid-header">WEDNESDAY</div>
                  <div className="timetable-grid-header">THURSDAY</div>
                  <div className="timetable-grid-header">FRIDAY</div>
                  <div className="timetable-grid-header">SATURDAY</div>

                  {[1, 2, 3, 4, 5, 6].map(periodNum => {
                    const timeStr = periodNum === 1 ? '01:21-02:23' :
                      periodNum === 2 ? '03:24-04:25' :
                        periodNum === 3 ? '03:25-04:25' :
                          periodNum === 4 ? '04:25-05:26' :
                            periodNum === 5 ? '05:27-05:57' : '05:58-06:58';

                    return (
                      <React.Fragment key={periodNum}>
                        <div className="timetable-grid-cell period-time-col">
                          <strong>Period-{periodNum}</strong><br />
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{timeStr}</span>
                        </div>
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                          const slot = timetableSlots.find(s => s.day === day && s.periodNumber === periodNum);
                          const matchesFilter = timetableFilter === 'All' || (slot && slot.subjectName.toLowerCase() === timetableFilter.toLowerCase());
                          return (
                            <div key={day} className="timetable-grid-cell" style={{ background: matchesFilter && slot ? '#FFF5F2' : 'white' }}>
                              {slot && matchesFilter ? (
                                <div className={`timetable-subject-card ${slot.subjectName.toLowerCase().includes('math') ? 'math' : slot.subjectName.toLowerCase().includes('physic') ? 'physics' : 'english'}`}>
                                  <strong>{slot.subjectName}</strong><br />
                                  <span style={{ fontSize: '10px', opacity: 0.8 }}>{slot.teacherName}</span>
                                </div>
                              ) : slot ? (
                                <span style={{ fontSize: '11px', color: '#CBD5E1' }}>Filtered</span>
                              ) : (
                                <span style={{ fontSize: '11px', color: '#E2E8F0' }}>{periodNum === 6 ? 'period-6' : '--'}</span>
                              )}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </div>

                <div className="timetable-metrics-row">
                  <div className="timetable-metric-card">
                    <span style={{ fontSize: '24px' }}>📅</span>
                    <div style={{ textAlign: 'left' }}>
                      <strong style={{ fontSize: '20px', display: 'block' }}>3</strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Periods</span>
                    </div>
                  </div>
                  <div className="timetable-metric-card">
                    <span style={{ fontSize: '24px' }}>📖</span>
                    <div style={{ textAlign: 'left' }}>
                      <strong style={{ fontSize: '20px', display: 'block' }}>3</strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Subjects</span>
                    </div>
                  </div>
                  <div className="timetable-metric-card">
                    <span style={{ fontSize: '24px' }}>🎓</span>
                    <div style={{ textAlign: 'left' }}>
                      <strong style={{ fontSize: '20px', display: 'block' }}>1</strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Teachers</span>
                    </div>
                  </div>
                  <div className="timetable-metric-card">
                    <span style={{ fontSize: '24px' }}>📊</span>
                    <div style={{ textAlign: 'left' }}>
                      <strong style={{ fontSize: '20px', display: 'block' }}>4</strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Period Rows</span>
                    </div>
                  </div>
                </div>

                {/* Manage Period Modal Popup */}
                {managePeriodModal && (
                  <div className="modal-overlay">
                    <div className="modal-content">
                      <div className="modal-header">
                        <h3>Map New Weekly Period</h3>
                        <button className="close-btn" onClick={() => setManagePeriodModal(false)}>×</button>
                      </div>
                      <form onSubmit={saveTimetablePeriod}>
                        <div className="form-group">
                          <label>Day of Week</label>
                          <select className="form-input" value={newPeriodForm.day} onChange={e => setNewPeriodForm({ ...newPeriodForm, day: e.target.value })}>
                            <option>Monday</option>
                            <option>Tuesday</option>
                            <option>Wednesday</option>
                            <option>Thursday</option>
                            <option>Friday</option>
                            <option>Saturday</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Period Number</label>
                          <select className="form-input" value={newPeriodForm.periodNumber} onChange={e => setNewPeriodForm({ ...newPeriodForm, periodNumber: e.target.value })}>
                            <option>1</option>
                            <option>2</option>
                            <option>3</option>
                            <option>4</option>
                            <option>5</option>
                            <option>6</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Start Time</label>
                          <input type="text" className="form-input" value={newPeriodForm.startTime} onChange={e => setNewPeriodForm({ ...newPeriodForm, startTime: e.target.value })} placeholder="e.g. 01:21" />
                        </div>
                        <div className="form-group">
                          <label>End Time</label>
                          <input type="text" className="form-input" value={newPeriodForm.endTime} onChange={e => setNewPeriodForm({ ...newPeriodForm, endTime: e.target.value })} placeholder="e.g. 02:23" />
                        </div>
                        <div className="form-group">
                          <label>Subject Name</label>
                          <input type="text" className="form-input" value={newPeriodForm.subjectName} onChange={e => setNewPeriodForm({ ...newPeriodForm, subjectName: e.target.value })} placeholder="e.g. Physics" />
                        </div>
                        <div className="form-group">
                          <label>Faculty Teacher Name</label>
                          <input type="text" className="form-input" value={newPeriodForm.teacherName} onChange={e => setNewPeriodForm({ ...newPeriodForm, teacherName: e.target.value })} placeholder="e.g. Shekhar Sharma" />
                        </div>
                        <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={submitting}>{submitting ? 'Saving...' : 'Save Period Configuration'}</button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notice Board View */}
            {activeView === 'notices' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {user.role === 'Admin' && (
                  <form onSubmit={e => { e.preventDefault(); showError('Notice published!'); }} className="glass-panel" style={{ padding: '24px', background: 'white', display: 'flex', gap: '16px', flexDirection: 'column' }}>
                    <h3>Publish Board Notice</h3>
                    <div className="form-group">
                      <label>Notice Title</label>
                      <input type="text" className="form-input" value={noticeForm.title} onChange={e => setNoticeForm({ ...noticeForm, title: e.target.value })} placeholder="e.g. Independence Day celebrations" />
                    </div>
                    <div className="form-group">
                      <label>Notice Content Details</label>
                      <textarea className="form-input" rows="4" value={noticeForm.content} onChange={e => setNoticeForm({ ...noticeForm, content: e.target.value })} placeholder="Write notice details here..." />
                    </div>
                    <div className="form-group">
                      <label>Announcement Priority</label>
                      <select className="form-input" value={noticeForm.priority} onChange={e => setNoticeForm({ ...noticeForm, priority: e.target.value })}>
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                      </select>
                    </div>
                    <button type="submit" className="btn-primary" style={{ alignSelf: 'end' }}>Publish Notice Board</button>
                  </form>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {notices.map((n, idx) => (
                    <div key={idx} className="glass-panel" style={{ padding: '24px', background: 'white', textAlign: 'left' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span className={`badge ${n.priority === 'High' ? 'badge-admin' : 'badge-teacher'}`}>{n.priority} Priority</span>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{n.createdAt}</span>
                      </div>
                      <h4 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>{n.title}</h4>
                      <p style={{ color: 'var(--text-main)', fontSize: '14px', lineHeight: '1.6' }}>{n.content}</p>
                      <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                        Published by: <strong>{n.authorName}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Room (Communication) View */}
            {activeView === 'chat' && (
              <div className="chat-split-view">
                <div className="chat-contacts-pane">
                  <div className="contacts-header">Conversations</div>
                  <div className="contacts-search-box">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ position: 'absolute', left: '26px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                    <input
                      type="text"
                      className="contacts-search-input"
                      placeholder="Search conversations..."
                      value={chatSearchQuery}
                      onChange={e => setChatSearchQuery(e.target.value)}
                    />
                  </div>
                  <ul className="contacts-list">
                    {chatContacts.filter(c => c.name.toLowerCase().includes(chatSearchQuery.toLowerCase())).map(contact => (
                      <li
                        key={contact._id}
                        className={`contact-item ${selectedContact?._id === contact._id ? 'active' : ''}`}
                        onClick={() => selectContactChat(contact)}
                      >
                        <div className="contact-avatar">{contact.name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase()}</div>
                        <div className="contact-info">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="contact-name">{contact.name}</span>
                          </div>
                          <span className="contact-role" style={{ textAlign: 'left', display: 'block' }}>{contact.role === 'Admin' ? 'School Admin' : contact.role}</span>
                          <span className="contact-last-msg">hlo guys</span>
                        </div>
                        <span className="contact-time">01:03 AM</span>
                      </li>
                    ))}
                    {chatContacts.length === 0 && (
                      <li style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>No active chat contacts.</li>
                    )}
                  </ul>
                </div>

                <div className="chat-conversation-pane">
                  {selectedContact ? (
                    <>
                      <div className="conversation-header">
                        <div className="contact-avatar" style={{ background: 'var(--primary)', color: 'white' }}>
                          {selectedContact.name.charAt(0)}
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <h4 style={{ fontSize: '15px', fontWeight: '600' }}>{selectedContact.name}</h4>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{selectedContact.role === 'Admin' ? 'School Admin' : selectedContact.role}</span>
                        </div>
                      </div>

                      <div className="conversation-messages">

                        {chatHistory.map((chat, idx) => {
                          const isMe = chat.senderId === 'me' ||
                            chat.senderId === user.id ||
                            chat.senderId === user._id ||
                            (chat.senderId && typeof chat.senderId === 'object' && (chat.senderId._id === user.id || chat.senderId._id === user._id));
                          return (
                            <div key={idx} className={`chat-bubble-container ${isMe ? 'me' : 'other'}`}>
                              <div className="chat-bubble">{chat.message}</div>
                              <div className="chat-meta">
                                <span className="chat-timestamp">
                                  {chat.timestamp ? new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                </span>
                                {isMe && <span className="chat-status-ticks" style={{ marginLeft: '4px', color: '#FF6B35', fontWeight: 'bold' }}>✓✓</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="conversation-input-bar">
                        <button className="chat-attach-btn" onClick={() => showError('Attachment simulator: Choose file upload')}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                        </button>
                        <input
                          type="text"
                          className="chat-input"
                          placeholder="Type a message..."
                          value={chatMessageInput}
                          onChange={e => setChatMessageInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                        />
                        <button className="chat-send-btn" onClick={sendChatMessage}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, color: 'var(--text-muted)' }}>
                      💬 Select a contact room to start messaging
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI Assistant panel */}
            {activeView === 'ai' && (
              <div className="ai-assistant-container">
                <div className="ai-tools-list">
                  <h4 style={{ fontSize: '12px', fontWeight: '700', padding: '8px 10px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', textAlign: 'left' }}>AI Tools</h4>
                  <button className={`ai-tool-btn ${aiActiveTool === 'insights' ? 'active' : ''}`} onClick={() => { setAiActiveTool('insights'); setAiPrompt('How many students are registered?'); }}>🔍 School Insights</button>
                  <button className={`ai-tool-btn ${aiActiveTool === 'comment' ? 'active' : ''}`} onClick={() => { setAiActiveTool('comment'); setAiPrompt('Rohan Verma'); }}>📝 Report Card Comments</button>
                  <button className={`ai-tool-btn ${aiActiveTool === 'reminder' ? 'active' : ''}`} onClick={() => { setAiActiveTool('reminder'); setAiPrompt(''); }}>💵 Fee Reminder Letter</button>
                  <button className={`ai-tool-btn ${aiActiveTool === 'event' ? 'active' : ''}`} onClick={() => { setAiActiveTool('event'); setAiPrompt(''); }}>📅 Event Planner</button>
                  <button className={`ai-tool-btn ${aiActiveTool === 'notice' ? 'active' : ''}`} onClick={() => { setAiActiveTool('notice'); setAiPrompt('Independence Day Celebration scheduled on Tuesday.'); }}>📢 Notice Generator</button>
                </div>

                <div className="ai-workspace-pane">
                  {aiActiveTool === 'insights' && (
                    <div style={{ textAlign: 'left' }}>
                      <h3>School AI Insights</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>Query school data metrics in English or Hindi. Powered by local Ollama.</p>

                      <div className="form-group">
                        <label>Ask Assistant</label>
                        <input
                          type="text"
                          className="form-input"
                          value={aiPrompt}
                          onChange={e => setAiPrompt(e.target.value)}
                          placeholder="e.g. How many teachers in our school?"
                        />
                      </div>
                      <button className="btn-primary" onClick={askAIAssistant}>Query Database Statistics</button>
                    </div>
                  )}

                  {aiActiveTool === 'reminder' && (
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ width: '40px', height: '40px', background: '#FFF5F2', borderRadius: '50%', color: '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>$</div>
                        <div>
                          <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Fee Reminder Letter</h3>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Generate professional fee reminder letters instantly</span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div className="form-group">
                          <label>Parent Name *</label>
                          <input type="text" className="form-input" placeholder="Parent Name" value={aiReminderForm.parentName} onChange={e => setAiReminderForm({ ...aiReminderForm, parentName: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label>Student Name *</label>
                          <input type="text" className="form-input" placeholder="Student full name" value={aiReminderForm.studentName} onChange={e => setAiReminderForm({ ...aiReminderForm, studentName: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label>Class</label>
                          <input type="text" className="form-input" placeholder="e.g. Class 9-B" value={aiReminderForm.className} onChange={e => setAiReminderForm({ ...aiReminderForm, className: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label>Fee Type</label>
                          <input type="text" className="form-input" placeholder="e.g. Monthly Tuition, Annual Fee" value={aiReminderForm.feeType} onChange={e => setAiReminderForm({ ...aiReminderForm, feeType: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label>Amount Due (₹) *</label>
                          <input type="text" className="form-input" placeholder="e.g. 5000" value={aiReminderForm.amountDue} onChange={e => setAiReminderForm({ ...aiReminderForm, amountDue: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label>Due Date</label>
                          <input type="date" className="form-input" value={aiReminderForm.dueDate} onChange={e => setAiReminderForm({ ...aiReminderForm, dueDate: e.target.value })} />
                        </div>
                      </div>

                      <div className="form-group" style={{ marginBottom: '24px' }}>
                        <label>Letter Tone</label>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button
                            type="button"
                            className={`tone-btn ${aiReminderForm.tone === 'Polite' ? 'active' : ''}`}
                            onClick={() => setAiReminderForm({ ...aiReminderForm, tone: 'Polite' })}
                          >
                            <strong>Polite</strong><br />
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>First reminder, friendly</span>
                          </button>
                          <button
                            type="button"
                            className={`tone-btn ${aiReminderForm.tone === 'Firm' ? 'active' : ''}`}
                            onClick={() => setAiReminderForm({ ...aiReminderForm, tone: 'Firm' })}
                          >
                            <strong>Firm</strong><br />
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Second reminder, assertive</span>
                          </button>
                          <button
                            type="button"
                            className={`tone-btn ${aiReminderForm.tone === 'Final Notice' ? 'active' : ''}`}
                            onClick={() => setAiReminderForm({ ...aiReminderForm, tone: 'Final Notice' })}
                          >
                            <strong>Final Notice</strong><br />
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Urgent, last warning</span>
                          </button>
                        </div>
                      </div>

                      <button className="btn-primary" onClick={askAIAssistant} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>$</span> Generate Fee Reminder Letter
                      </button>
                    </div>
                  )}

                  {aiActiveTool === 'comment' && (
                    <div style={{ textAlign: 'left' }}>
                      <h3>Generate Report Card Comments</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>Creates constructive feedback comments for grade book cards.</p>

                      <div className="form-group">
                        <label>Student Name</label>
                        <input type="text" className="form-input" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} />
                      </div>
                      <button className="btn-primary" onClick={askAIAssistant}>Generate Comment Draft</button>
                    </div>
                  )}

                  {aiActiveTool === 'event' && (
                    <div style={{ textAlign: 'left' }}>
                      <h3>AI Event Planner</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>Generate detailed event schedules and preparation lists.</p>

                      <div className="form-group">
                        <label>Event Topic Name</label>
                        <input type="text" className="form-input" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="e.g. Science Fair 2026" />
                      </div>
                      <button className="btn-primary" onClick={askAIAssistant}>Plan Event Program</button>
                    </div>
                  )}

                  {aiActiveTool === 'notice' && (
                    <div style={{ textAlign: 'left' }}>
                      <h3>Generate School notices</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>Write outlines and let AI build circular announcements.</p>

                      <div className="form-group">
                        <label>Draft Description</label>
                        <textarea className="form-input" rows="3" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} />
                      </div>
                      <button className="btn-primary" onClick={askAIAssistant}>Generate Notice Outline</button>
                    </div>
                  )}

                  {aiResponse && (
                    <div className="ai-response-box" style={{ textAlign: 'left' }}>
                      <strong style={{ fontSize: '15px', color: 'var(--primary)', display: 'block', marginBottom: '12px' }}>Generated Assistant Response:</strong>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{aiResponse}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Reports View */}
            {activeView === 'reports' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div className="glass-panel" style={{ padding: '24px', background: 'white', textAlign: 'left' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>Academic Performance (Subject Averages)</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {[
                        { subject: 'Mathematics', average: 88, color: '#FF6B35' },
                        { subject: 'Science', average: 82, color: '#5B7FFF' },
                        { subject: 'English', average: 91, color: '#12CCD0' },
                        { subject: 'Social Studies', average: 79, color: '#FF805D' }
                      ].map((item, idx) => (
                        <div key={idx}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                            <span>{item.subject}</span>
                            <strong>{item.average}%</strong>
                          </div>
                          <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${item.average}%`, height: '100%', background: item.color, borderRadius: '4px' }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="glass-panel" style={{ padding: '24px', background: 'white', textAlign: 'left' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px' }}>Financial Report (Fee Collection Tracker)</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '160px' }}>
                      <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '100px', height: '100px', borderRadius: '50%', border: '12px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                          <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary)' }}>₹500</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Collected</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '13px', marginTop: '12px', color: 'var(--text-muted)' }}>
                        Target: <strong>₹10,000</strong> | Progress: <strong>5%</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="table-container">
                  <div style={{ padding: '16px', background: '#FAFAFB', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '16px' }}>Class-wise Metrics Summary</strong>
                    <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => showError('Report exported successfully!')}>Export PDF Summary</button>
                  </div>
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Class Section</th>
                        <th>Enrolled Students</th>
                        <th>Attendance Rate</th>
                        <th>Homework Submit Rate</th>
                        <th>Fee Dues</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Class 10th - A</strong></td>
                        <td>2 Students</td>
                        <td>98%</td>
                        <td>100%</td>
                        <td>₹9,500 pending</td>
                      </tr>
                      <tr>
                        <td><strong>Class 9th - B</strong></td>
                        <td>0 Students</td>
                        <td>--</td>
                        <td>--</td>
                        <td>₹0 pending</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Roles & Permissions View */}
            {activeView === 'roles' && (
              <div className="roles-split-view">
                <div className="roles-teachers-list-pane">
                  <div className="contacts-header">Teachers</div>
                  <ul className="contacts-list">
                    {teachers.map((teacher, idx) => {
                      const tId = teacher.user ? teacher.user._id : teacher._id;
                      const selId = selectedTeacherForPermissions ? (selectedTeacherForPermissions.user ? selectedTeacherForPermissions.user._id : selectedTeacherForPermissions._id) : '';
                      const tName = teacher.user ? teacher.user.name : teacher.name;
                      return (
                        <li
                          key={idx}
                          className={`contact-item ${selId === tId ? 'active' : ''}`}
                          onClick={() => setSelectedTeacherForPermissions(teacher)}
                        >
                          <div className="contact-avatar">{tName.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase()}</div>
                          <div className="contact-info">
                            <span className="contact-name">{tName}</span>
                            <span className="contact-role" style={{ textAlign: 'left', display: 'block' }}>TCH-2026-{String(idx + 1).padStart(4, '0')}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="roles-config-matrix-pane">
                  {selectedTeacherForPermissions ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                        <div style={{ textAlign: 'left' }}>
                          <h3 style={{ fontSize: '18px', fontWeight: '700' }}>{selectedTeacherForPermissions.user ? selectedTeacherForPermissions.user.name : selectedTeacherForPermissions.name}</h3>
                          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{selectedTeacherForPermissions.user ? selectedTeacherForPermissions.user.email : selectedTeacherForPermissions.email}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <span className="badge badge-student" style={{ padding: '6px 12px' }}>
                            {selectedTeacherForPermissions.user ? (selectedTeacherForPermissions.user.isActive ? 'Active' : 'Inactive') : (selectedTeacherForPermissions.isActive ? 'Active' : 'Inactive')}
                          </span>
                          <button className="btn-primary" onClick={saveTeacherPermissions}>Save Changes</button>
                        </div>
                      </div>

                      {/* Permission Nodes list */}
                      <div className="permission-group-card" style={{ textAlign: 'left' }}>
                        <div className="permission-group-title">STUDENTS</div>
                        <div className="permission-grid">
                          {[
                            { key: 'view_students', label: 'View All Students' },
                            { key: 'create_student', label: 'Create Student' },
                            { key: 'edit_student', label: 'Edit Student' },
                            { key: 'delete_student', label: 'Delete Student' }
                          ].map(node => {
                            const perms = selectedTeacherForPermissions.user ? selectedTeacherForPermissions.user.permissions : selectedTeacherForPermissions.permissions;
                            const isChecked = perms && perms.includes(node.key);
                            return (
                              <div key={node.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                                <span style={{ fontSize: '14px', color: 'var(--text-main)' }}>{node.label}</span>
                                <label className="switch">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      const permsList = perms || [];
                                      let newPerms;
                                      if (permsList.includes(node.key)) {
                                        newPerms = permsList.filter(p => p !== node.key);
                                      } else {
                                        newPerms = [...permsList, node.key];
                                      }
                                      const updated = { ...selectedTeacherForPermissions };
                                      if (updated.user) updated.user.permissions = newPerms;
                                      else updated.permissions = newPerms;
                                      setSelectedTeacherForPermissions(updated);
                                    }}
                                  />
                                  <span className="slider"></span>
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="permission-group-card" style={{ textAlign: 'left' }}>
                        <div className="permission-group-title">ATTENDANCE</div>
                        <div className="permission-grid">
                          {[
                            { key: 'view_attendance', label: 'View Attendance' },
                            { key: 'mark_attendance', label: 'Mark Attendance' }
                          ].map(node => {
                            const perms = selectedTeacherForPermissions.user ? selectedTeacherForPermissions.user.permissions : selectedTeacherForPermissions.permissions;
                            const isChecked = perms && perms.includes(node.key);
                            return (
                              <div key={node.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                                <span style={{ fontSize: '14px', color: 'var(--text-main)' }}>{node.label}</span>
                                <label className="switch">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      const permsList = perms || [];
                                      let newPerms;
                                      if (permsList.includes(node.key)) {
                                        newPerms = permsList.filter(p => p !== node.key);
                                      } else {
                                        newPerms = [...permsList, node.key];
                                      }
                                      const updated = { ...selectedTeacherForPermissions };
                                      if (updated.user) updated.user.permissions = newPerms;
                                      else updated.permissions = newPerms;
                                      setSelectedTeacherForPermissions(updated);
                                    }}
                                  />
                                  <span className="slider"></span>
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="permission-group-card" style={{ textAlign: 'left' }}>
                        <div className="permission-group-title">EXAMS & RESULTS</div>
                        <div className="permission-grid">
                          {[
                            { key: 'view_exams', label: 'View Exams' },
                            { key: 'create_exam', label: 'Create Exam' },
                            { key: 'publish_exams', label: 'Enter Marks' }
                          ].map(node => {
                            const perms = selectedTeacherForPermissions.user ? selectedTeacherForPermissions.user.permissions : selectedTeacherForPermissions.permissions;
                            const isChecked = perms && perms.includes(node.key);
                            return (
                              <div key={node.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                                <span style={{ fontSize: '14px', color: 'var(--text-main)' }}>{node.label}</span>
                                <label className="switch">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      const permsList = perms || [];
                                      let newPerms;
                                      if (permsList.includes(node.key)) {
                                        newPerms = permsList.filter(p => p !== node.key);
                                      } else {
                                        newPerms = [...permsList, node.key];
                                      }
                                      const updated = { ...selectedTeacherForPermissions };
                                      if (updated.user) updated.user.permissions = newPerms;
                                      else updated.permissions = newPerms;
                                      setSelectedTeacherForPermissions(updated);
                                    }}
                                  />
                                  <span className="slider"></span>
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="permission-group-card" style={{ textAlign: 'left' }}>
                        <div className="permission-group-title">HOMEWORK</div>
                        <div className="permission-grid">
                          {[
                            { key: 'view_homework', label: 'View Homework' },
                            { key: 'create_homework', label: 'Assign Homework' }
                          ].map(node => {
                            const perms = selectedTeacherForPermissions.user ? selectedTeacherForPermissions.user.permissions : selectedTeacherForPermissions.permissions;
                            const isChecked = perms && perms.includes(node.key);
                            return (
                              <div key={node.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                                <span style={{ fontSize: '14px', color: 'var(--text-main)' }}>{node.label}</span>
                                <label className="switch">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      const permsList = perms || [];
                                      let newPerms;
                                      if (permsList.includes(node.key)) {
                                        newPerms = permsList.filter(p => p !== node.key);
                                      } else {
                                        newPerms = [...permsList, node.key];
                                      }
                                      const updated = { ...selectedTeacherForPermissions };
                                      if (updated.user) updated.user.permissions = newPerms;
                                      else updated.permissions = newPerms;
                                      setSelectedTeacherForPermissions(updated);
                                    }}
                                  />
                                  <span className="slider"></span>
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="permission-group-card" style={{ textAlign: 'left' }}>
                        <div className="permission-group-title">NOTICE BOARD</div>
                        <div className="permission-grid">
                          {[
                            { key: 'view_notices', label: 'View Notices' },
                            { key: 'post_notice', label: 'Post Notice' }
                          ].map(node => {
                            const perms = selectedTeacherForPermissions.user ? selectedTeacherForPermissions.user.permissions : selectedTeacherForPermissions.permissions;
                            const isChecked = perms && perms.includes(node.key);
                            return (
                              <div key={node.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                                <span style={{ fontSize: '14px', color: 'var(--text-main)' }}>{node.label}</span>
                                <label className="switch">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      const permsList = perms || [];
                                      let newPerms;
                                      if (permsList.includes(node.key)) {
                                        newPerms = permsList.filter(p => p !== node.key);
                                      } else {
                                        newPerms = [...permsList, node.key];
                                      }
                                      const updated = { ...selectedTeacherForPermissions };
                                      if (updated.user) updated.user.permissions = newPerms;
                                      else updated.permissions = newPerms;
                                      setSelectedTeacherForPermissions(updated);
                                    }}
                                  />
                                  <span className="slider"></span>
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexGrow: 1, color: 'var(--text-muted)' }}>
                      🔒 Select a teacher to configure granular permissions
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Subject & Class View */}
            {activeView === 'subjectClass' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {/* 1. Subjects CRUD Management Panel */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
                  {/* Create Subject Form */}
                  <div className="glass-panel" style={{ padding: '24px', background: 'white', textAlign: 'left', borderRadius: '16px' }}>
                    <h3 style={{ marginBottom: '8px', fontSize: '18px', fontWeight: '700' }}>➕ Create Subject for Class Level</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>Define new academic subjects assigned to specific class levels.</p>
                    <form onSubmit={addSubject}>
                      <div className="form-group">
                        <label>Select Class Level</label>
                        <select
                          className="form-input"
                          required
                          value={subjectForm.classId}
                          onChange={e => setSubjectForm({ ...subjectForm, classId: e.target.value })}
                        >
                          <option value="">Choose Class Level</option>
                          {classes.map(c => (
                            <option key={c._id} value={c._id}>{c.name} - {c.section}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Subject Name</label>
                        <input
                          type="text"
                          className="form-input"
                          required
                          placeholder="e.g. Mathematics, Physics, English"
                          value={subjectForm.name}
                          onChange={e => setSubjectForm({ ...subjectForm, name: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Subject Code</label>
                        <input
                          type="text"
                          className="form-input"
                          required
                          placeholder="e.g. MATH101, PHY201"
                          value={subjectForm.code}
                          onChange={e => setSubjectForm({ ...subjectForm, code: e.target.value })}
                        />
                      </div>
                      <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={submitting}>
                        {submitting ? 'Creating...' : 'Create Class Subject'}
                      </button>
                    </form>
                  </div>

                  {/* Subjects Directory Table (Read, Update, Delete) */}
                  <div className="glass-panel" style={{ padding: '24px', background: 'white', display: 'flex', flexDirection: 'column', borderRadius: '16px', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>📚 Class Level Subjects Directory</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>Manage, edit, or delete existing subjects per class level.</p>
                      </div>
                      <span className="badge badge-admin">{subjects.length} Subjects Total</span>
                    </div>

                    <div className="table-container" style={{ flexGrow: 1 }}>
                      <table className="premium-table">
                        <thead>
                          <tr>
                            <th>Subject Name</th>
                            <th>Subject Code</th>
                            <th>Assigned Class Level</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subjects.length === 0 ? (
                            <tr>
                              <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                                No subjects created yet. Use the form on the left to add a subject.
                              </td>
                            </tr>
                          ) : (
                            subjects.map((sub, idx) => (
                              <tr key={sub._id || idx}>
                                <td><strong>{sub.name}</strong></td>
                                <td><span className="badge badge-teacher">{sub.code}</span></td>
                                <td>
                                  {sub.classId && typeof sub.classId === 'object'
                                    ? `${sub.classId.name} - ${sub.classId.section}`
                                    : (classes.find(c => c._id === sub.classId) ? `${classes.find(c => c._id === sub.classId).name} - ${classes.find(c => c._id === sub.classId).section}` : 'General')}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                      className="btn-secondary"
                                      onClick={() => setEditingSubject(sub)}
                                      style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer' }}
                                    >
                                      ✏️ Edit
                                    </button>
                                    <button
                                      className="btn-secondary"
                                      onClick={() => handleDeleteSubject(sub._id)}
                                      style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer', borderColor: '#F87171', color: '#DC2626' }}
                                    >
                                      🗑️ Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* 2. Faculty & Subject Mappings Panel */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div className="glass-panel" style={{ padding: '24px', background: 'white', textAlign: 'left', borderRadius: '16px' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>🔗 Link Subject to Class & Teacher</h3>
                    <form onSubmit={addMapping}>
                      <div className="form-group">
                        <label>Class Section</label>
                        <select className="form-input" value={mappingForm.classId} onChange={e => setMappingForm({ ...mappingForm, classId: e.target.value })}>
                          <option value="">Select Class</option>
                          {classes.map(c => <option key={c._id} value={c._id}>{c.name} - {c.section}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Subject</label>
                        <select className="form-input" value={mappingForm.subjectId} onChange={e => setMappingForm({ ...mappingForm, subjectId: e.target.value })}>
                          <option value="">Select Subject</option>
                          {subjects
                            .filter(s => {
                              if (!mappingForm.classId) return true;
                              const targetCId = typeof s.classId === 'object' ? s.classId?._id : s.classId;
                              return !targetCId || targetCId === mappingForm.classId;
                            })
                            .map(s => {
                              const classLabel = s.classId && typeof s.classId === 'object'
                                ? ` - Class ${s.classId.name} ${s.classId.section}`
                                : (classes.find(c => c._id === s.classId) ? ` - Class ${classes.find(c => c._id === s.classId).name} ${classes.find(c => c._id === s.classId).section}` : '');
                              return (
                                <option key={s._id} value={s._id}>
                                  {s.name} ({s.code}){classLabel}
                                </option>
                              );
                            })}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Assign Faculty/Teacher</label>
                        <select className="form-input" value={mappingForm.teacherId} onChange={e => setMappingForm({ ...mappingForm, teacherId: e.target.value })}>
                          <option value="">Select Faculty</option>
                          {teachers.map((t, idx) => (
                            <option key={idx} value={t._id || t.user?._id}>
                              {t.user ? t.user.name : t.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={submitting}>{submitting ? 'Saving...' : 'Save Assignment Map'}</button>
                    </form>
                  </div>

                  <div className="glass-panel" style={{ padding: '24px', background: 'white', display: 'flex', flexDirection: 'column', borderRadius: '16px' }}>
                    <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700', textAlign: 'left' }}>Active Mapping Configurations</h3>
                    <div className="table-container" style={{ flexGrow: 1 }}>
                      <table className="premium-table">
                        <thead>
                          <tr>
                            <th>Class Section</th>
                            <th>Subject Mapping</th>
                            <th>Faculty Assigned</th>
                          </tr>
                        </thead>
                        <tbody>
                          {classSubjectMappings.map((map, idx) => (
                            <tr key={idx}>
                              <td>Class {map.classSection}</td>
                              <td><span className="badge badge-admin">{map.subjectName}</span></td>
                              <td><strong>{map.teacherName}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tests & Exams View */}
            {activeView === 'exams' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {/* 1. Create Test/Exam Header Card */}
                <div className="glass-panel" style={{ padding: '24px', background: 'white', borderRadius: '16px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>📝 Create Test / Exam & Question Paper</h2>
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>Assign test dates, configure class & subject mappings, and build custom Question Papers with Answer Keys.</p>
                    </div>
                    <span className="badge badge-admin">{examsList.length} Total Scheduled Exams</span>
                  </div>

                  <form onSubmit={addExam} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Basic Exam Meta Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', background: '#F8FAFC', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontWeight: '700', fontSize: '12px' }}>Test / Exam Title *</label>
                        <input type="text" className="form-input" required placeholder="e.g. Unit Test 1 - Physics" value={examForm.name} onChange={e => setExamForm({ ...examForm, name: e.target.value })} />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontWeight: '700', fontSize: '12px' }}>Class Section *</label>
                        <select className="form-input" required value={examForm.classId} onChange={e => setExamForm({ ...examForm, classId: e.target.value })}>
                          <option value="">Select Class</option>
                          {classes.map(c => <option key={c._id} value={c._id}>{c.name} - {c.section}</option>)}
                        </select>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontWeight: '700', fontSize: '12px' }}>Subject *</label>
                        <select className="form-input" required value={examForm.subjectId} onChange={e => setExamForm({ ...examForm, subjectId: e.target.value })}>
                          <option value="">Select Subject</option>
                          {subjects
                            .filter(s => {
                              if (!examForm.classId) return true;
                              const targetCId = typeof s.classId === 'object' ? s.classId?._id : s.classId;
                              return !targetCId || targetCId === examForm.classId;
                            })
                            .map(s => {
                              const classLabel = s.classId && typeof s.classId === 'object'
                                ? ` - Class ${s.classId.name} ${s.classId.section}`
                                : (classes.find(c => c._id === s.classId) ? ` - Class ${classes.find(c => c._id === s.classId).name} ${classes.find(c => c._id === s.classId).section}` : '');
                              return (
                                <option key={s._id} value={s._id}>
                                  {s.name} ({s.code}){classLabel}
                                </option>
                              );
                            })}
                        </select>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontWeight: '700', fontSize: '12px' }}>Scheduled Test Date *</label>
                        <input type="date" className="form-input" required value={examForm.examDate} onChange={e => setExamForm({ ...examForm, examDate: e.target.value })} />
                      </div>
                    </div>

                    {/* Question & Answer Builder Section */}
                    <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px', background: '#FFFFFF' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>❓ Question Paper & Answer Key Builder</h4>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Total Questions: <strong>{examQuestions.length}</strong> | Total Calculated Marks: <strong>{examQuestions.reduce((sum, q) => sum + (parseInt(q.marks) || 0), 0)} Marks</strong>
                          </span>
                        </div>
                        <button type="button" className="btn-secondary" onClick={handleAddExamQuestion} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', background: '#F1F5F9', color: '#1E293B', fontWeight: '600' }}>
                          ➕ Add Question
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {examQuestions.map((q, qIdx) => (
                          <div key={qIdx} style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #CBD5E1', textAlign: 'left' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                              <strong style={{ fontSize: '13px', color: 'var(--primary-color)' }}>Question #{qIdx + 1}</strong>
                              {examQuestions.length > 1 && (
                                <button type="button" onClick={() => handleRemoveExamQuestion(qIdx)} style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                                  🗑️ Delete Question
                                </button>
                              )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                              <div>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Question Text *</label>
                                <input type="text" className="form-input" required placeholder="Enter Question text..." value={q.questionText} onChange={e => handleExamQuestionChange(qIdx, 'questionText', e.target.value)} style={{ padding: '8px 12px', fontSize: '13px' }} />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Question Type</label>
                                <select className="form-input" value={q.type} onChange={e => handleExamQuestionChange(qIdx, 'type', e.target.value)} style={{ padding: '8px 12px', fontSize: '13px' }}>
                                  <option value="ShortAnswer">Short / Detailed Answer</option>
                                  <option value="MCQ">Multiple Choice (MCQ)</option>
                                  <option value="TrueFalse">True / False</option>
                                </select>
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Marks</label>
                                <input type="number" className="form-input" value={q.marks} onChange={e => handleExamQuestionChange(qIdx, 'marks', parseInt(e.target.value))} style={{ padding: '8px 12px', fontSize: '13px' }} />
                              </div>
                            </div>

                            {/* MCQ Options Inputs */}
                            {q.type === 'MCQ' && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '12px', background: '#FFFFFF', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                {['Option A', 'Option B', 'Option C', 'Option D'].map((optLabel, optIdx) => (
                                  <div key={optIdx}>
                                    <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{optLabel}</label>
                                    <input type="text" className="form-input" placeholder={optLabel} value={q.options[optIdx] || ''} onChange={e => handleExamQuestionOptionChange(qIdx, optIdx, e.target.value)} style={{ padding: '6px 8px', fontSize: '12px' }} />
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Correct Answer / Solution Key */}
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: '700', color: '#059669', display: 'block', marginBottom: '4px' }}>🎯 Correct Answer / Solution Key *</label>
                              <input type="text" className="form-input" required placeholder="Enter correct solution / answer key..." value={q.correctAnswer} onChange={e => handleExamQuestionChange(qIdx, 'correctAnswer', e.target.value)} style={{ padding: '8px 12px', fontSize: '13px', borderColor: '#34D399', background: '#F0FDF4' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button type="submit" className="btn-primary" style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '700', alignSelf: 'flex-end' }} disabled={submitting}>
                      {submitting ? 'Publishing Test...' : '🚀 Create & Assign Test / Exam'}
                    </button>
                  </form>
                </div>

                {/* 2. Published Tests & Exams Table Panel */}
                <div className="glass-panel" style={{ padding: '24px', background: 'white', borderRadius: '16px', textAlign: 'left' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-main)' }}>📚 Published Tests & Scheduled Exams</h3>

                  {examsList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      <p style={{ fontSize: '15px', margin: 0 }}>📝 No scheduled tests or exams published yet.</p>
                      <p style={{ fontSize: '13px', marginTop: '6px' }}>Use the builder form above to create your first test with questions and answer keys.</p>
                    </div>
                  ) : (
                    <div className="table-container">
                      <table className="premium-table">
                        <thead>
                          <tr>
                            <th>Test / Exam Title</th>
                            <th>Class Section</th>
                            <th>Subject</th>
                            <th>Scheduled Date</th>
                            <th>Questions Count</th>
                            <th>Total Marks</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {examsList.map((exam, idx) => (
                            <tr key={exam._id || idx}>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <strong>{exam.name}</strong>
                                  {exam.createdBy && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>By: {exam.createdBy.name || 'Faculty'}</span>}
                                </div>
                              </td>
                              <td>
                                <span className="badge badge-teacher">
                                  {exam.classId ? `${exam.classId.name} ${exam.classId.section || ''}` : 'Class Section'}
                                </span>
                              </td>
                              <td>
                                <span className="badge badge-admin">
                                  {exam.subjectId ? exam.subjectId.name : 'Subject'}
                                </span>
                              </td>
                              <td>
                                <strong style={{ color: '#2563EB' }}>
                                  📅 {exam.examDate ? new Date(exam.examDate).toLocaleDateString() : 'N/A'}
                                </strong>
                              </td>
                              <td>
                                <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}>
                                  {exam.questions && exam.questions.length > 0 ? `${exam.questions.length} Questions` : 'Paper Assigned'}
                                </span>
                              </td>
                              <td>
                                <strong>{exam.maxMarks} Marks</strong>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Pass: {exam.passingMarks}</span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    className="btn-secondary"
                                    onClick={() => setViewingExamModal(exam)}
                                    style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', borderRadius: '8px', cursor: 'pointer', background: '#F1F5F9', color: '#1E293B' }}
                                  >
                                    👁️ View Q&A Paper
                                  </button>
                                  {(user.role === 'Admin' || user.role === 'SuperAdmin' || user.role === 'Teacher') && (
                                    <button
                                      className="btn-secondary"
                                      onClick={() => handleDeleteExam(exam._id)}
                                      style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', borderRadius: '8px', cursor: 'pointer', borderColor: '#F87171', color: '#DC2626' }}
                                    >
                                      🗑️ Delete
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Subject-Wise Test / Exam Question Bank View */}
            {activeView === 'testQuestions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                {/* 1. Header & Create Question Form */}
                <div className="glass-panel" style={{ padding: '24px', background: 'white', borderRadius: '16px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>❓ Subject-Wise Test/Exam Question Bank</h2>
                      <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>Create and manage bilingual (Hindi & English) subject-wise test questions with 4 options & correct answer keys.</p>
                    </div>
                    <span className="badge badge-admin">{questionsBank.length} Total Saved Questions</span>
                  </div>

                  <form onSubmit={handleAddQuestionBank} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Class and Subject selection grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontWeight: '700', fontSize: '12px' }}>Class Section *</label>
                        <select
                          className="form-input"
                          required
                          value={questionBankForm.classId}
                          onChange={e => setQuestionBankForm({ ...questionBankForm, classId: e.target.value, subjectId: '' })}
                        >
                          <option value="">Select Class</option>
                          {classes.map(c => <option key={c._id} value={c._id}>{c.name} - {c.section}</option>)}
                        </select>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontWeight: '700', fontSize: '12px' }}>Subject *</label>
                        <select
                          className="form-input"
                          required
                          value={questionBankForm.subjectId}
                          onChange={e => setQuestionBankForm({ ...questionBankForm, subjectId: e.target.value })}
                        >
                          <option value="">Select Subject</option>
                          {subjects
                            .filter(s => {
                              if (!questionBankForm.classId) return true;
                              const targetCId = typeof s.classId === 'object' ? s.classId?._id : s.classId;
                              return !targetCId || targetCId === questionBankForm.classId;
                            })
                            .map(s => {
                              const classLabel = s.classId && typeof s.classId === 'object'
                                ? ` - Class ${s.classId.name} ${s.classId.section}`
                                : (classes.find(c => c._id === s.classId) ? ` - Class ${classes.find(c => c._id === s.classId).name} ${classes.find(c => c._id === s.classId).section}` : '');
                              return (
                                <option key={s._id} value={s._id}>
                                  {s.name} ({s.code}){classLabel}
                                </option>
                              );
                            })}
                        </select>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontWeight: '700', fontSize: '12px' }}>Question Marks</label>
                        <input
                          type="number"
                          className="form-input"
                          value={questionBankForm.marks}
                          onChange={e => setQuestionBankForm({ ...questionBankForm, marks: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                    </div>

                    {/* Bilingual Question Text Inputs */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontWeight: '700', fontSize: '12px', color: '#D97706' }}>🇮🇳 Question (Hindi / Hinglish) *</label>
                        <input
                          type="text"
                          className="form-input"
                          required
                          placeholder="e.g. 23 aur 47 ka yog kya hoga"
                          value={questionBankForm.questionHindi}
                          onChange={e => setQuestionBankForm({ ...questionBankForm, questionHindi: e.target.value })}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontWeight: '700', fontSize: '12px', color: '#2563EB' }}>🇬🇧 Question (English) *</label>
                        <input
                          type="text"
                          className="form-input"
                          required
                          placeholder="e.g. What is the sum of 23 and 47"
                          value={questionBankForm.questionEnglish}
                          onChange={e => setQuestionBankForm({ ...questionBankForm, questionEnglish: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* 4 Options Grid */}
                    <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #CBD5E1' }}>
                      <label style={{ fontWeight: '700', fontSize: '13px', display: 'block', marginBottom: '12px', color: 'var(--text-main)' }}>🔢 Multiple Choice Options (Option 1 to Option 4)</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11px', fontWeight: '600' }}>Option 1 *</label>
                          <input
                            type="text"
                            className="form-input"
                            required
                            placeholder="e.g. 35"
                            value={questionBankForm.option1}
                            onChange={e => setQuestionBankForm({ ...questionBankForm, option1: e.target.value })}
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11px', fontWeight: '600' }}>Option 2 *</label>
                          <input
                            type="text"
                            className="form-input"
                            required
                            placeholder="e.g. 40"
                            value={questionBankForm.option2}
                            onChange={e => setQuestionBankForm({ ...questionBankForm, option2: e.target.value })}
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11px', fontWeight: '600' }}>Option 3 *</label>
                          <input
                            type="text"
                            className="form-input"
                            required
                            placeholder="e.g. 45"
                            value={questionBankForm.option3}
                            onChange={e => setQuestionBankForm({ ...questionBankForm, option3: e.target.value })}
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11px', fontWeight: '600' }}>Option 4 *</label>
                          <input
                            type="text"
                            className="form-input"
                            required
                            placeholder="e.g. 70"
                            value={questionBankForm.option4}
                            onChange={e => setQuestionBankForm({ ...questionBankForm, option4: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Correct Answer Selection */}
                    <div className="form-group" style={{ margin: 0, background: '#F0FDF4', padding: '16px', borderRadius: '12px', border: '1px solid #86EFAC' }}>
                      <label style={{ fontWeight: '700', fontSize: '13px', color: '#047857', display: 'block', marginBottom: '8px' }}>🎯 Correct Answer / Solution Key *</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                        <select
                          className="form-input"
                          required
                          value={questionBankForm.answer}
                          onChange={e => setQuestionBankForm({ ...questionBankForm, answer: e.target.value })}
                          style={{ background: 'white', borderColor: '#34D399', fontWeight: '600' }}
                        >
                          <option value="">Choose Correct Option</option>
                          <option value={questionBankForm.option1 ? `Option 1: ${questionBankForm.option1}` : 'Option 1'}>Option 1 ({questionBankForm.option1 || '35'})</option>
                          <option value={questionBankForm.option2 ? `Option 2: ${questionBankForm.option2}` : 'Option 2'}>Option 2 ({questionBankForm.option2 || '40'})</option>
                          <option value={questionBankForm.option3 ? `Option 3: ${questionBankForm.option3}` : 'Option 3'}>Option 3 ({questionBankForm.option3 || '45'})</option>
                          <option value={questionBankForm.option4 ? `Option 4: ${questionBankForm.option4}` : 'Option 4'}>Option 4 ({questionBankForm.option4 || '70'})</option>
                        </select>

                        <input
                          type="text"
                          className="form-input"
                          placeholder="Or enter custom answer text (e.g. 70 or Option 4)"
                          value={questionBankForm.answer}
                          onChange={e => setQuestionBankForm({ ...questionBankForm, answer: e.target.value })}
                          style={{ background: 'white', borderColor: '#34D399' }}
                        />
                      </div>
                    </div>

                    <button type="submit" className="btn-primary" style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '700', alignSelf: 'flex-end' }} disabled={submitting}>
                      {submitting ? 'Saving Question...' : '➕ Save Question to Subject Bank'}
                    </button>
                  </form>
                </div>

                {/* 2. Questions Bank List Table Panel */}
                <div className="glass-panel" style={{ padding: '24px', background: 'white', borderRadius: '16px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: 'var(--text-main)' }}>📚 Subject Question Bank List</h3>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <select
                        className="form-input"
                        value={questionFilterClass}
                        onChange={e => setQuestionFilterClass(e.target.value)}
                        style={{ fontSize: '13px', padding: '6px 12px' }}
                      >
                        <option value="">All Classes</option>
                        {classes.map(c => <option key={c._id} value={c._id}>{c.name} - {c.section}</option>)}
                      </select>

                      <select
                        className="form-input"
                        value={questionFilterSubject}
                        onChange={e => setQuestionFilterSubject(e.target.value)}
                        style={{ fontSize: '13px', padding: '6px 12px' }}
                      >
                        <option value="">All Subjects</option>
                        {subjects.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
                      </select>
                    </div>
                  </div>

                  {questionsBank.filter(q => {
                    if (questionFilterClass && q.classId && (q.classId._id || q.classId) !== questionFilterClass) return false;
                    if (questionFilterSubject && q.subjectId && (q.subjectId._id || q.subjectId) !== questionFilterSubject) return false;
                    return true;
                  }).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      <p style={{ fontSize: '15px', margin: 0 }}>❓ No questions found in the subject question bank.</p>
                      <p style={{ fontSize: '13px', marginTop: '6px' }}>Use the form above to add subject questions with Hindi/English text, options, and answer keys.</p>
                    </div>
                  ) : (
                    <div className="table-container">
                      <table className="premium-table">
                        <thead>
                          <tr>
                            <th>Subject & Class</th>
                            <th>Question (Hindi)</th>
                            <th>Question (English)</th>
                            <th>Options (1 - 4)</th>
                            <th>Correct Answer</th>
                            <th>Marks</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {questionsBank
                            .filter(q => {
                              if (questionFilterClass && q.classId && (q.classId._id || q.classId) !== questionFilterClass) return false;
                              if (questionFilterSubject && q.subjectId && (q.subjectId._id || q.subjectId) !== questionFilterSubject) return false;
                              return true;
                            })
                            .map((q, idx) => (
                              <tr key={q._id || idx}>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span className="badge badge-admin">{q.subjectId ? q.subjectId.name : 'Subject'}</span>
                                    <span className="badge badge-teacher" style={{ width: 'fit-content' }}>
                                      {q.classId ? `${q.classId.name} ${q.classId.section || ''}` : 'Class'}
                                    </span>
                                  </div>
                                </td>
                                <td style={{ maxWidth: '200px', whiteSpace: 'normal', fontSize: '13px' }}>
                                  <strong style={{ color: '#D97706' }}>{q.questionHindi}</strong>
                                </td>
                                <td style={{ maxWidth: '200px', whiteSpace: 'normal', fontSize: '13px' }}>
                                  <strong style={{ color: '#2563EB' }}>{q.questionEnglish}</strong>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
                                    <span>1: {q.option1}</span>
                                    <span>2: {q.option2}</span>
                                    <span>3: {q.option3}</span>
                                    <span>4: {q.option4}</span>
                                  </div>
                                </td>
                                <td>
                                  <span style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700' }}>
                                    🎯 {q.answer}
                                  </span>
                                </td>
                                <td><strong>{q.marks || 1} Marks</strong></td>
                                <td>
                                  <button
                                    className="btn-secondary"
                                    onClick={() => handleDeleteQuestionBank(q._id)}
                                    style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', borderRadius: '8px', cursor: 'pointer', borderColor: '#F87171', color: '#DC2626' }}
                                  >
                                    🗑️ Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Study Materials View */}
            {activeView === 'materials' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '32px' }}>
                <div className="glass-panel" style={{ padding: '24px', background: 'white', textAlign: 'left' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>Upload Reference Study Material</h3>
                  <form onSubmit={addStudyMaterial}>
                    <div className="form-group">
                      <label>Document Title *</label>
                      <input type="text" className="form-input" required placeholder="e.g. Calculus Notes PDF" value={materialForm.title} onChange={e => setMaterialForm({ ...materialForm, title: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Description Details</label>
                      <input type="text" className="form-input" placeholder="Notes outline details..." value={materialForm.description} onChange={e => setMaterialForm({ ...materialForm, description: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Class Scope *</label>
                      <select className="form-input" required value={materialForm.classId} onChange={e => setMaterialForm({ ...materialForm, classId: e.target.value })}>
                        <option value="">Select Class</option>
                        {classes.map(c => <option key={c._id} value={c._id}>{c.name} - {c.section}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Subject *</label>
                      <select className="form-input" required value={materialForm.subjectId} onChange={e => setMaterialForm({ ...materialForm, subjectId: e.target.value })}>
                        <option value="">Select Subject</option>
                        {subjects
                          .filter(s => {
                            if (!materialForm.classId) return true;
                            const targetCId = typeof s.classId === 'object' ? s.classId?._id : s.classId;
                            return !targetCId || targetCId === materialForm.classId;
                          })
                          .map(s => {
                            const classLabel = s.classId && typeof s.classId === 'object'
                              ? ` - Class ${s.classId.name} ${s.classId.section}`
                              : (classes.find(c => c._id === s.classId) ? ` - Class ${classes.find(c => c._id === s.classId).name} ${classes.find(c => c._id === s.classId).section}` : '');
                            return (
                              <option key={s._id} value={s._id}>
                                {s.name} ({s.code}){classLabel}
                              </option>
                            );
                          })}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Reference Document URL</label>
                      <input type="text" className="form-input" placeholder="e.g. Cloudinary file path link" value={materialForm.fileUrl} onChange={e => setMaterialForm({ ...materialForm, fileUrl: e.target.value })} />
                    </div>
                    <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={submitting}>{submitting ? 'Uploading...' : 'Upload Document Material'}</button>
                  </form>
                </div>

                <div className="table-container">
                  <div style={{ padding: '16px', background: '#FAFAFB', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <strong>Available Reference Guides & Materials</strong>
                  </div>
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Material Document</th>
                        <th>Class & Subject</th>
                        <th>Uploaded By</th>
                        <th>Download Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studyMaterials.map((mat, idx) => (
                        <tr key={idx}>
                          <td style={{ textAlign: 'left' }}>
                            <strong>{mat.title}</strong>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{mat.description || 'N/A'}</div>
                          </td>
                          <td>
                            <span className="badge badge-teacher">{mat.classId ? `${mat.classId.name} ${mat.classId.section || ''}` : '10th A'}</span>
                            <span className="badge badge-admin" style={{ marginLeft: '6px' }}>{mat.subjectId ? mat.subjectId.name : 'Mathematics'}</span>
                          </td>
                          <td>{mat.uploadedBy ? mat.uploadedBy.name : 'Faculty'}</td>
                          <td><a href={mat.fileUrl || '#'} className="badge badge-student" target="_blank" rel="noopener noreferrer">Download PDF</a></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Student/Parent-specific view placeholders */}
            {activeView === 'reportCard' && (
              <div className="glass-panel" style={{ padding: '24px', background: 'white', textAlign: 'left' }}>
                <h3>Academic Report Card</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>Your school report cards averages are listed below.</p>
                <div className="table-container">
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Exam Term</th>
                        <th>Subject Name</th>
                        <th>Scored Marks</th>
                        <th>Out of</th>
                        <th>Status Passed</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Unit Test 1</strong></td>
                        <td>Mathematics</td>
                        <td>42</td>
                        <td>50</td>
                        <td><span className="badge badge-student">Passed</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeView === 'progress' && (
              <div className="glass-panel" style={{ padding: '24px', background: 'white', textAlign: 'left' }}>
                <h3>My Academic Progress Dashboard</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Track term performance indexes and grades logs.</p>
              </div>
            )}

            {activeView === 'results' && (
              <div className="glass-panel" style={{ padding: '24px', background: 'white', textAlign: 'left' }}>
                <h3>Child Exam Result Cards</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Term progress records are generated upon review.</p>
              </div>
            )}

            {activeView === 'profile' && (
              <div className="glass-panel" style={{ padding: '32px', background: 'white', textAlign: 'left', borderRadius: '16px', boxShadow: '0 8px 30px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px', borderBottom: '1px solid #F1F5F9', paddingBottom: '24px' }}>
                  <div style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: '#FFEFEB',
                    color: '#FF6B35',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '28px',
                    textTransform: 'uppercase',
                    boxShadow: '0 4px 15px rgba(255, 107, 53, 0.15)'
                  }}>
                    {user.name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)' }}>{user.name}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>{user.email}</p>
                    <span className="badge badge-admin" style={{ fontSize: '11px', marginTop: '8px', display: 'inline-block', padding: '6px 12px' }}>{user.role}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                  {/* Left Column: Personal info */}
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-main)', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>👤 Personal Information</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>FULL NAME</span>
                        <strong style={{ fontSize: '15px', color: 'var(--text-main)' }}>{user.name}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>EMAIL ADDRESS</span>
                        <strong style={{ fontSize: '15px', color: 'var(--text-main)' }}>{user.email}</strong>
                      </div>
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>TELEPHONE CONTACT</span>
                        <strong style={{ fontSize: '15px', color: 'var(--text-main)' }}>{user.phone || '+91 98765 43210'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Organization Info */}
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-main)', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>🏢 Organization & Role Details</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {user.role !== 'SuperAdmin' && (
                        <div>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>ASSOCIATED SCHOOL TENANT</span>
                          <strong style={{ fontSize: '15px', color: 'var(--text-main)' }}>{user.schoolName || 'School'}</strong>
                        </div>
                      )}
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>SYSTEM LEVEL PRIVILEGES</span>
                        <strong style={{ fontSize: '15px', color: 'var(--text-main)' }}>{user.role}</strong>
                      </div>
                      {user.role === 'Teacher' && (
                        <>
                          <div>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>PROFESSIONAL QUALIFICATION</span>
                            <strong style={{ fontSize: '15px', color: 'var(--text-main)' }}>B.Ed, Master of Science (Physics)</strong>
                          </div>
                          <div>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>TEACHING EXPERIENCE</span>
                            <strong style={{ fontSize: '15px', color: 'var(--text-main)' }}>3+ Years Active Faculty</strong>
                          </div>
                        </>
                      )}
                      {user.role === 'Student' && (
                        <>
                          <div>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>ASSIGNED GRADE CLASS</span>
                            <strong style={{ fontSize: '15px', color: 'var(--text-main)' }}>Class 10th - A Section</strong>
                          </div>
                          <div>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>ROLL NUMBER ID</span>
                            <strong style={{ fontSize: '15px', color: 'var(--text-main)' }}>R1001</strong>
                          </div>
                          <div>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>PARENT GUARDIAN NAME</span>
                            <strong style={{ fontSize: '15px', color: 'var(--text-main)' }}>Juned Ahmad</strong>
                          </div>
                        </>
                      )}
                      {user.role === 'Parent' && (
                        <>
                          <div>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block' }}>REGISTERED CHILDREN</span>
                            <strong style={{ fontSize: '15px', color: 'var(--text-main)' }}>Rohan Verma (Class 10th - A)</strong>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', marginTop: '40px', borderTop: '1px solid #F1F5F9', paddingTop: '24px' }}>
                  <button className="btn-primary" onClick={() => showError('Profile information update simulator')}>Edit Profile Settings</button>
                  <button className="btn-secondary" onClick={() => showError('Secure password reset link transmitted via SMTP!')}>Reset Account Password</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Question Paper & Solution Modal */}
      {viewingExamModal && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '750px', width: '90%', maxHeight: '85vh', overflowY: 'auto', padding: '28px', borderRadius: '16px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--text-main)' }}>📝 Question Paper & Answer Key</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  {viewingExamModal.name} | Class: {viewingExamModal.classId?.name} {viewingExamModal.classId?.section} | Subject: {viewingExamModal.subjectId?.name}
                </p>
              </div>
              <button className="close-btn" onClick={() => setViewingExamModal(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', background: '#F8FAFC', padding: '12px 16px', borderRadius: '10px', marginBottom: '20px', fontSize: '13px' }}>
              <div>📅 <strong>Scheduled Date:</strong> {new Date(viewingExamModal.examDate).toLocaleDateString()}</div>
              <div>💯 <strong>Total Marks:</strong> {viewingExamModal.maxMarks}</div>
              <div>🎯 <strong>Passing Marks:</strong> {viewingExamModal.passingMarks}</div>
            </div>

            {(!viewingExamModal.questions || viewingExamModal.questions.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '14px' }}>No detailed question items specified for this exam schedule.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
                {viewingExamModal.questions.map((q, idx) => (
                  <div key={idx} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '18px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <strong style={{ fontSize: '14px', color: 'var(--text-main)' }}>Q{idx + 1}. {q.questionText}</strong>
                      <span className="badge badge-admin">{q.marks} Marks ({q.type})</span>
                    </div>

                    {q.type === 'MCQ' && q.options && q.options.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px', padding: '10px', background: '#F8FAFC', borderRadius: '8px', fontSize: '13px' }}>
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx}>• Option {String.fromCharCode(65 + oIdx)}: {opt}</div>
                        ))}
                      </div>
                    )}

                    <div style={{ background: '#F0FDF4', border: '1px solid #6EE7B7', padding: '10px 14px', borderRadius: '8px', marginTop: '10px' }}>
                      <strong style={{ color: '#047857', fontSize: '12px', display: 'block', marginBottom: '2px' }}>✅ Solution / Answer Key:</strong>
                      <span style={{ color: '#065F46', fontSize: '13px', fontWeight: '600' }}>{q.correctAnswer || 'Answer key available'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button className="btn-secondary" onClick={() => setViewingExamModal(null)} style={{ width: '100%', marginTop: '24px', padding: '10px', fontSize: '14px', fontWeight: '600' }}>
              Close Question Paper
            </button>
          </div>
        </div>
      )}

      {/* Register School Modal */}
      {registerModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Onboard New School Tenant</h3>
              <button className="close-btn" onClick={() => setRegisterModal(false)}>×</button>
            </div>
            <form onSubmit={handleRegisterSchool}>
              <div className="form-group">
                <label>School Name</label>
                <input type="text" className="form-input" required value={regSchoolName} onChange={e => setRegSchoolName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Office Address</label>
                <input type="text" className="form-input" required value={regAddress} onChange={e => setRegAddress(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Email ID</label>
                <input type="email" className="form-input" required value={regEmail} onChange={e => setRegEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Contact Phone</label>
                <input type="text" className="form-input" value={regPhone} onChange={e => setRegPhone(e.target.value)} />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={submitting}>{submitting ? 'Sending...' : 'Send Verification OTP Code'}</button>
            </form>
          </div>
        </div>
      )}

      {/* OTP Verification Modal */}
      {otpModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>OTP Code & Admin Account Setup</h3>
              <button className="close-btn" onClick={() => setOtpModal(false)}>×</button>
            </div>
            <form onSubmit={handleVerifyOtp}>
              <div className="form-group">
                <label>Enter 6-Digit OTP</label>
                <input type="text" className="form-input" required placeholder="123456" value={regOtp} onChange={e => setRegOtp(e.target.value)} />
              </div>
              <div className="form-group" style={{ borderTop: '1px solid #EEE', paddingTop: '16px', marginTop: '16px' }}>
                <label>School Admin Name</label>
                <input type="text" className="form-input" required placeholder="Admin Full Name" value={regAdminName} onChange={e => setRegAdminName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Admin Login Email</label>
                <input type="email" className="form-input" required placeholder="admin@school.com" value={regAdminEmail} onChange={e => setRegAdminEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Admin Password</label>
                <input type="password" className="form-input" required placeholder="Password" value={regAdminPass} onChange={e => setRegAdminPass(e.target.value)} />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={submitting}>{submitting ? 'Activating...' : 'Verify Code & Activate Portal'}</button>
            </form>
          </div>
        </div>
      )}
      {/* Edit Subject Modal */}
      {editingSubject && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px', width: '90%', padding: '28px' }}>
            <div className="modal-header">
              <h3>✏️ Edit Class Level Subject</h3>
              <button className="close-btn" onClick={() => setEditingSubject(null)}>×</button>
            </div>
            <form onSubmit={handleUpdateSubject}>
              <div className="form-group">
                <label>Target Class Level</label>
                <select
                  className="form-input"
                  required
                  value={typeof editingSubject.classId === 'object' ? editingSubject.classId?._id : editingSubject.classId}
                  onChange={e => setEditingSubject({ ...editingSubject, classId: e.target.value })}
                >
                  <option value="">Select Class Level</option>
                  {classes.map(c => (
                    <option key={c._id} value={c._id}>{c.name} - {c.section}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Subject Name</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Advanced Physics"
                  value={editingSubject.name}
                  onChange={e => setEditingSubject({ ...editingSubject, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Subject Code</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. PHY101"
                  value={editingSubject.code}
                  onChange={e => setEditingSubject({ ...editingSubject, code: e.target.value })}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn-secondary" onClick={() => setEditingSubject(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Updating...' : 'Update Subject'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
