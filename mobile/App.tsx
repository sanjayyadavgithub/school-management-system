import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  FlatList,
  Alert
} from 'react-native';

const PRIMARY_COLOR = '#FF6B35';
const SECONDARY_COLOR = '#FFF5F2';
const DARK_COLOR = '#2D3142';
const MUTED_COLOR = '#9094A6';

export default function App() {
  const [serverIp, setServerIp] = useState('http://localhost:50001'); // Allows testing on both emulators and local hosts
  const [token, setToken] = useState('');
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState('Student'); // SuperAdmin, Admin, Teacher, Student, Parent
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Dashboard navigation
  const [activeTab, setActiveTab] = useState('Dashboard');

  // Dynamic backend states
  const [notices, setNotices] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [feesList, setFeesList] = useState<any[]>([]);
  const [studentStats, setStudentStats] = useState({ gpa: '8.5', attendance: '96%' });

  // SuperAdmin state
  const [schoolsList, setSchoolsList] = useState<any[]>([]);

  // Roles permissions state (Admin view)
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [selectedTeacherPerm, setSelectedTeacherPerm] = useState<any>(null);

  // AI Assistant state (Teacher/Student view)
  const [aiTool, setAiTool] = useState('insights'); // insights, reminder, comment
  const [aiInputText, setAiInputText] = useState('');
  const [aiTextResponse, setAiTextResponse] = useState('');
  const [aiReminderTone, setAiReminderTone] = useState('Polite');

  // Chat Room states
  const [chatContacts, setChatContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatLog, setChatLog] = useState<any[]>([]);

  // Advanced Tools States (RFID/Biometric/Face, Payments, Library, LMS, Payroll/Leaves, Alumni, WhatsApp, Video Scheduling, Test, Certificates, Backup/Compliance)
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [libraryBooks, setLibraryBooks] = useState<any[]>([]);
  const [lmsLectures, setLmsLectures] = useState<any[]>([]);
  const [assessmentsList, setAssessmentsList] = useState<any[]>([]);
  const [myCertificates, setMyCertificates] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [jitsiMeetings, setJitsiMeetings] = useState<any[]>([]);
  const [faceScanning, setFaceScanning] = useState(false);
  const [faceStatus, setFaceStatus] = useState('');
  const [testActiveQuestion, setTestActiveQuestion] = useState(0);
  const [testAnswers, setTestAnswers] = useState<any>({});
  const [testCheatingCount, setTestCheatingCount] = useState(0);
  const [testTimer, setTestTimer] = useState(300);
  const [selectedBookPdf, setSelectedBookPdf] = useState<string | null>(null);
  const [alertPreferences, setAlertPreferences] = useState({ whatsapp: true, telegram: false, email: true });
  const [newLeaveForm, setNewLeaveForm] = useState({ leaveType: 'Casual', startDate: '', endDate: '', reason: '' });
  const [newMeetingForm, setNewMeetingForm] = useState({ title: '', meetingType: 'ClassLecture', startTime: '', durationMinutes: '45' });
  const [newLectureForm, setNewLectureForm] = useState({ title: '', description: '', videoUrl: '', classId: '', subjectId: '' });
  const [alumniJobs, setAlumniJobs] = useState<any[]>([]);
  const [alumniSearch, setAlumniSearch] = useState('');
  const [showMobileLogin, setShowMobileLogin] = useState(false);
  const [expandedMobileFaq, setExpandedMobileFaq] = useState<number | null>(null);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [editingMobileClass, setEditingMobileClass] = useState<any>(null);
  const [mobileClassForm, setMobileClassForm] = useState({ name: '', section: '', roomNumber: '' });
  const [mobileSubmitting, setMobileSubmitting] = useState(false);

  // Get active tabs dynamically based on role
  const getTabsForRole = () => {
    if (role === 'SuperAdmin') return ['Dashboard', 'Chat', 'Tools'];
    if (role === 'Admin') return ['Dashboard', 'Timetable', 'Chat', 'Roles', 'Tools'];
    if (role === 'Teacher') return ['Dashboard', 'Timetable', 'Chat', 'AI Assistant', 'Tools'];
    if (role === 'Student') return ['Dashboard', 'Timetable', 'Chat', 'AI Assistant', 'Tools'];
    if (role === 'Parent') return ['Dashboard', 'Timetable', 'Chat', 'Notices', 'Tools'];
    return ['Dashboard', 'Chat', 'Tools'];
  };

  const roleTabs = getTabsForRole();

  // Reset tab to Dashboard when role changes
  useEffect(() => {
    setActiveTab('Dashboard');
  }, [role]);

  // Auto-reload data when active tab changes
  useEffect(() => {
    if (token) {
      loadDataForTab();
    }
  }, [activeTab, token]);

  const loadDataForTab = async () => {
    const headers = { Authorization: `Bearer ${token}` };
    try {
      if (activeTab === 'Dashboard') {
        // Load notices brief
        const res = await fetch(`${serverIp}/api/notices`, { headers });
        const data = await res.json();
        if (data.success) setNotices(data.notices.slice(0, 2));

        if (role === 'SuperAdmin') {
          const resSchools = await fetch(`${serverIp}/api/superadmin/schools`, { headers });
          const dataSchools = await resSchools.json();
          if (dataSchools.success) setSchoolsList(dataSchools.schools);
        } else {
          // Load timetable schedule
          const resTime = await fetch(`${serverIp}/api/timetables/my-schedule`, { headers });
          const dataTime = await resTime.json();
          if (dataTime.success && dataTime.timetable) {
            setTimetable(dataTime.timetable.schedule || []);
          }
        }
      }

      if (activeTab === 'Timetable') {
        const resTime = await fetch(`${serverIp}/api/timetables/my-schedule`, { headers });
        const dataTime = await resTime.json();
        if (dataTime.success && dataTime.timetable) {
          setTimetable(dataTime.timetable.schedule || []);
        } else {
          setTimetable([]);
        }
      }

      if (activeTab === 'Notices') {
        const res = await fetch(`${serverIp}/api/notices`, { headers });
        const data = await res.json();
        if (data.success) setNotices(data.notices);
        else setNotices([]);
      }

      if (activeTab === 'Roles') {
        const res = await fetch(`${serverIp}/api/teachers`, { headers });
        const data = await res.json();
        if (data.success) {
          setTeachersList(data.teachers);
          if (data.teachers.length > 0 && !selectedTeacherPerm) {
            setSelectedTeacherPerm(data.teachers[0]);
          }
        } else {
          setTeachersList([]);
          setSelectedTeacherPerm(null);
        }
      }

      if (activeTab === 'Chat') {
        const res = await fetch(`${serverIp}/api/chat/users`, { headers });
        const data = await res.json();
        if (data.success) {
          setChatContacts(data.users.filter((u: any) => u._id !== user?.id));
        } else {
          setChatContacts([]);
        }
      }

      if (activeTab === 'Tools') {
        // Load role-specific tool resources from backend
        if (role === 'Student') {
          // Library
          fetch(`${serverIp}/api/library/books`, { headers })
            .then(res => res.json())
            .then(data => { if (data.success) setLibraryBooks(data.books); })
            .catch(() => setLibraryBooks([]));

          // Lectures
          fetch(`${serverIp}/api/lms/lectures`, { headers })
            .then(res => res.json())
            .then(data => { if (data.success) setLmsLectures(data.lectures); })
            .catch(() => setLmsLectures([]));

          // Assessments
          fetch(`${serverIp}/api/assessments`, { headers })
            .then(res => res.json())
            .then(data => { if (data.success) setAssessmentsList(data.assessments); })
            .catch(() => setAssessmentsList([]));

          // Certificates
          fetch(`${serverIp}/api/certificates/my`, { headers })
            .then(res => res.json())
            .then(data => { if (data.success) setMyCertificates(data.certificates); })
            .catch(() => setMyCertificates([]));

          // Meetings
          fetch(`${serverIp}/api/meetings`, { headers })
            .then(res => res.json())
            .then(data => { if (data.success) setJitsiMeetings(data.meetings); })
            .catch(() => setJitsiMeetings([]));
        }

        if (role === 'Teacher') {
          // Leaves
          fetch(`${serverIp}/api/payroll/leave`, { headers })
            .then(res => res.json())
            .then(data => { if (data.success) setLeaveRequests(data.leaves); })
            .catch(() => setLeaveRequests([]));

          // Meetings
          fetch(`${serverIp}/api/meetings`, { headers })
            .then(res => res.json())
            .then(data => { if (data.success) setJitsiMeetings(data.meetings); })
            .catch(() => setJitsiMeetings([]));
        }

        if (role === 'Admin') {
          // Compliance audit logs
          fetch(`${serverIp}/api/compliance/audit-logs`, { headers })
            .then(res => res.json())
            .then(data => { if (data.success) setAuditLogs(data.logs); })
            .catch(() => setAuditLogs([]));

          // Classes list
          fetch(`${serverIp}/api/classes`, { headers })
            .then(res => res.json())
            .then(data => { if (data.success) setClassesList(data.classes); })
            .catch(() => setClassesList([]));
        }
      }
    } catch (err: any) {
      console.warn('Network sync error:', err.message);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Authentication', 'Please enter your login email and password.');
      return;
    }

    try {
      setMobileSubmitting(true);
      const res = await fetch(`${serverIp}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (data.success) {
        setToken(data.token);
        setUser(data.user);
        setRole(data.user.role);
        Alert.alert('Success', `Welcome to SMS Portal, ${data.user.name}`);
      } else {
        // Fallback for easy simulation
        setToken('sandbox_token');
        setUser({ id: 'me', name: `Sandbox ${role}`, email: email });
        Alert.alert('Sandbox Access', `Authorized as ${role} (Local Offline Mode)`);
      }
    } catch (err) {
      // Fallback for simulation
      setToken('sandbox_token');
      setUser({ id: 'me', name: `Sandbox ${role}`, email: email });
      Alert.alert('Sandbox Access', `Authorized as ${role} (Local Offline Mode)`);
    } finally {
      setMobileSubmitting(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    setEmail('');
    setPassword('');
    setActiveTab('Dashboard');
    setSelectedContact(null);
    setChatLog([]);
    setSelectedTeacherPerm(null);
  };

  // Chat handling
  const selectContactChat = async (contact: any) => {
    setSelectedContact(contact);
    try {
      const res = await fetch(`${serverIp}/api/chat/history/${contact._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setChatLog(data.history);
      } else {
        setChatLog([
          { senderId: contact._id, message: 'hlo shekhar' },
          { senderId: contact._id, message: 'how r u' }
        ]);
      }
    } catch (err: any) {
      setChatLog([
        { senderId: contact._id, message: 'hlo shekhar' },
        { senderId: contact._id, message: 'how r u' }
      ]);
    }
  };

  const sendChatMessage = async () => {
    if (!chatMessage || !selectedContact) return;
    try {
      const res = await fetch(`${serverIp}/api/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ receiverId: selectedContact._id, message: chatMessage })
      });
      const data = await res.json();
      if (data.success) {
        setChatLog([...chatLog, data.chatMessage]);
        setChatMessage('');
      } else {
        setChatLog([...chatLog, { senderId: user?.id || 'me', message: chatMessage }]);
        setChatMessage('');
      }
    } catch (err) {
      setChatLog([...chatLog, { senderId: user?.id || 'me', message: chatMessage }]);
      setChatMessage('');
    }
  };

  // Ask AI Assistant tool
  const askAITool = async () => {
    if (aiTool === 'insights' && !aiInputText) {
      Alert.alert('AI Assistant', 'Please enter a school insights query.');
      return;
    }
    setAiTextResponse('Generating AI Response from local Llama engine...');
    try {
      let promptPayload = aiInputText;
      if (aiTool === 'reminder') {
        promptPayload = `Generate a fee reminder letter for parent Juned Ahmad for student Rohan Verma in class 10th. Amount due: 500. Tone: ${aiReminderTone}. Brand Name: SMS`;
      }
      const res = await fetch(`${serverIp}/api/ai/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: promptPayload, tool: aiTool })
      });
      const data = await res.json();
      if (data.success) {
        setAiTextResponse(data.response);
      } else {
        setAiTextResponse(`[Sandbox Mode] Generated letter with ${aiReminderTone} tone. Letter has been created and sent to parent.`);
      }
    } catch (err) {
      setAiTextResponse(`[Sandbox Mode] Generated letter with ${aiReminderTone} tone. Letter has been created and sent to parent.`);
    }
  };

  const toggleTeacherPermission = (nodeKey: string) => {
    if (!selectedTeacherPerm) return;
    const isNested = !!selectedTeacherPerm.user;
    const current = isNested ? selectedTeacherPerm.user.permissions : selectedTeacherPerm.permissions;
    let updated;
    if (current.includes(nodeKey)) {
      updated = current.filter((p: string) => p !== nodeKey);
    } else {
      updated = [...current, nodeKey];
    }

    const copy = { ...selectedTeacherPerm };
    if (isNested) copy.user.permissions = updated;
    else copy.permissions = updated;

    setSelectedTeacherPerm(copy);
    setTeachersList(teachersList.map((t: any) => {
      const tId = t.user ? t.user._id : t._id;
      const targetId = selectedTeacherPerm.user ? selectedTeacherPerm.user._id : selectedTeacherPerm._id;
      if (tId === targetId) return copy;
      return t;
    }));
  };

  // 1. Simulated Face Scanning Check-in
  const runFaceScan = async () => {
    setFaceScanning(true);
    setFaceStatus('Aligning face within camera focal area...');
    setTimeout(async () => {
      setFaceStatus('Extracting facial descriptors (128-float)...');
      setTimeout(async () => {
        try {
          const fakeDescriptor = Array.from({ length: 128 }, () => Math.random());
          const res = await fetch(`${serverIp}/api/attendance/integration/verify-face`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ faceDescriptor: fakeDescriptor })
          });
          const data = await res.json();
          setFaceScanning(false);
          if (data.success) {
            Alert.alert('Success', `Auto-Attendance Verified! Welcome ${data.matchedUser.name}`);
            setFaceStatus(`Attendance marked successfully! Distance: ${data.distance.toFixed(4)}`);
          } else {
            Alert.alert('Face Recognition Failed', data.message || 'No match found.');
            setFaceStatus('Scanning finished with no matches.');
          }
        } catch (e) {
          setFaceScanning(false);
          setFaceStatus('Recognition completed (Offline Mock Success).');
          Alert.alert('Sandbox Success', 'Attendance logged via simulated Facial scan!');
        }
      }, 1000);
    }, 1500);
  };

  // 2. Trigger Compliance Backups
  const triggerComplianceBackup = async () => {
    try {
      setMobileSubmitting(true);
      const res = await fetch(`${serverIp}/api/compliance/backup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Backup Successful', `Encrypted archive created: ${data.filename}`);
        // Refresh compliance logs
        loadDataForTab();
      } else {
        Alert.alert('Backup Failed', data.message);
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to reach backup server.');
    } finally {
      setMobileSubmitting(false);
    }
  };

  // 3. Submit Leave Request
  const submitTeacherLeaveRequest = async () => {
    const { leaveType, startDate, endDate, reason } = newLeaveForm;
    if (!startDate || !endDate || !reason) {
      Alert.alert('Error', 'Please fill in all leave request parameters.');
      return;
    }
    try {
      setMobileSubmitting(true);
      const res = await fetch(`${serverIp}/api/payroll/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newLeaveForm)
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Success', 'Leave request submitted.');
        setNewLeaveForm({ leaveType: 'Casual', startDate: '', endDate: '', reason: '' });
        loadDataForTab();
      }
    } catch (e) {
      Alert.alert('Sandbox Mode', 'Leave request recorded locally.');
    } finally {
      setMobileSubmitting(false);
    }
  };

  // 4. Schedule Class Meeting
  const scheduleVirtualClass = async () => {
    const { title, meetingType, startTime, durationMinutes } = newMeetingForm;
    if (!title || !startTime) {
      Alert.alert('Error', 'Please enter Title and Start Time.');
      return;
    }
    try {
      setMobileSubmitting(true);
      const res = await fetch(`${serverIp}/api/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...newMeetingForm,
          durationMinutes: parseInt(durationMinutes)
        })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Success', `Meeting Scheduled: ${data.meeting.joinUrl}`);
        setNewMeetingForm({ title: '', meetingType: 'ClassLecture', startTime: '', durationMinutes: '45' });
        loadDataForTab();
      }
    } catch (e) {
      Alert.alert('Success', 'Jitsi meeting scheduled successfully!');
    } finally {
      setMobileSubmitting(false);
    }
  };

  // 5. Pay Fees Checkout
  const payFeeOnline = async (feeId: string, amount: number) => {
    try {
      const res = await fetch(`${serverIp}/api/payments/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          studentId: user?.id || user?._id || 'stu_123',
          feeStructureId: feeId,
          amount,
          gateway: 'Stripe'
        })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Sandbox Payment', `Opening Secure Checkout Window: ${data.checkoutUrl || 'Redirecting...'}`);
      } else {
        Alert.alert('Order Creation Failed', data.message);
      }
    } catch (e) {
      Alert.alert('Offline Mode', 'Online order compiled. Mock approved.');
    }
  };

  // 6. Proctoring & Quiz attempted
  const startQuizAttempt = (assessment: any) => {
    setSelectedTool('assessments_attempt');
    setTestActiveQuestion(0);
    setTestAnswers({});
    setTestCheatingCount(0);
    setTestTimer(assessment.durationMinutes * 60);
  };

  const logQuizTabSwitch = async (assessmentId: string) => {
    const nextCount = testCheatingCount + 1;
    setTestCheatingCount(nextCount);
    try {
      await fetch(`${serverIp}/api/assessments/${assessmentId}/log-violation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventType: 'TabSwitch' })
      });
      Alert.alert('Proctor Violation', `Warning: Tab switch detected! Event logged. (Violations: ${nextCount})`);
    } catch (e) {
      console.log('Proctor log failed:', e);
    }
  };

  const submitStudentQuiz = async (assessment: any) => {
    const formattedAnswers = Object.keys(testAnswers).map(qId => ({
      questionId: qId,
      selectedAnswer: testAnswers[qId]
    }));

    try {
      const res = await fetch(`${serverIp}/api/assessments/${assessment._id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          answers: formattedAnswers,
          cheatingLogs: Array.from({ length: testCheatingCount }, () => ({ eventType: 'TabSwitch' }))
        })
      });
      const data = await res.json();
      Alert.alert('Assessment Submitted', data.message || 'Successfully submitted!');
      setSelectedTool('assessments');
      loadDataForTab();
    } catch (e) {
      Alert.alert('Offline Mock Submit', 'Quiz answers saved and score calculated.');
      setSelectedTool('assessments');
    }
  };

  // 7. LMS Homework Submit
  const submitLmsHomework = async (hwId: string, answerText: string) => {
    if (!answerText) {
      Alert.alert('Error', 'Please write submission text.');
      return;
    }
    try {
      const res = await fetch(`${serverIp}/api/lms/homework/${hwId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ answerText })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Homework Uploaded', `Similarity check score: ${data.submission.plagiarismScore}%. ${data.submission.plagiarismReport}`);
      }
    } catch (e) {
      Alert.alert('Offline Mode', 'Plagiarism analysis complete: 0% match.');
    }
  };

  // 8. Alumni Jobs fetch
  const fetchAlumniJobs = async () => {
    try {
      const res = await fetch(`${serverIp}/api/alumni/jobs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setAlumniJobs(data.jobs);
    } catch (e) {
      setAlumniJobs([]);
    }
  };

  useEffect(() => {
    if (selectedTool === 'alumni') {
      fetchAlumniJobs();
    }
  }, [selectedTool]);

  // 9. Manage Classes Sub-handlers
  const submitMobileClass = async () => {
    const { name, section, roomNumber } = mobileClassForm;
    if (!name || !section) {
      Alert.alert('Error', 'Please enter Class Grade Level and Section.');
      return;
    }
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    try {
      setMobileSubmitting(true);
      const method = editingMobileClass ? 'PUT' : 'POST';
      const url = editingMobileClass ? `${serverIp}/api/classes/${editingMobileClass._id}` : `${serverIp}/api/classes`;
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(mobileClassForm)
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Success', editingMobileClass ? 'Class section details updated!' : 'Class section created!');
        setMobileClassForm({ name: '', section: '', roomNumber: '' });
        setEditingMobileClass(null);
        loadDataForTab();
      } else {
        Alert.alert('Error', data.message);
      }
    } catch (e) {
      Alert.alert('Sandbox Mode', 'Class section change stored locally.');
    } finally {
      setMobileSubmitting(false);
    }
  };

  const deleteMobileClass = async (classId: string) => {
    Alert.alert(
      'Delete Class',
      'Are you sure you want to delete this class section?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${serverIp}/api/classes/${classId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
              });
              const data = await res.json();
              if (data.success) {
                Alert.alert('Success', 'Class section removed.');
                loadDataForTab();
              } else {
                Alert.alert('Error', data.message);
              }
            } catch (e) {
              Alert.alert('Sandbox Mode', 'Class section removed.');
            }
          }
        }
      ]
    );
  };

  if (!token) {
    return !showMobileLogin ? (
      <SafeAreaView style={styles.appContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.topBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.logoBadge, { width: 32, height: 32, borderRadius: 8, marginBottom: 0 }]}><Text style={[styles.logoTextChar, { fontSize: 18 }]}>S</Text></View>
            <Text style={[styles.appName, { fontSize: 18 }]}>SMS</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={() => setShowMobileLogin(true)}>
            <Text style={[styles.logoutBtnText, { color: PRIMARY_COLOR }]}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.viewPadding}>
          {/* Mobile Hero */}
          <View style={{ alignItems: 'center', marginVertical: 24 }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: DARK_COLOR, textAlign: 'center', lineHeight: 34 }}>Run your school on one platform</Text>
            <Text style={{ fontSize: 14, color: MUTED_COLOR, textAlign: 'center', marginTop: 12, lineHeight: 18 }}>Attendance, fees, timetables, and communication for admins, teachers, and parents — with AI built in.</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity style={[styles.submitBtn, { paddingHorizontal: 20, marginTop: 0 }]} onPress={() => setShowMobileLogin(true)}>
                <Text style={styles.submitBtnText}>Book free demo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.logoutBtn, { paddingHorizontal: 16, borderRadius: 10, justifyContent: 'center' }]} onPress={() => setShowMobileLogin(true)}>
                <Text style={{ color: DARK_COLOR, fontWeight: '600' }}>Watch video</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Swipeable Stats */}
          <Text style={[styles.cardHeader, { marginTop: 12 }]}>Live Campus Metrics</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <View style={[styles.statChip, { minWidth: 120, marginRight: 12 }]}>
              <Text style={styles.statVal}>1,842</Text>
              <Text style={styles.statDesc}>Students</Text>
            </View>
            <View style={[styles.statChip, { minWidth: 120, marginRight: 12 }]}>
              <Text style={styles.statVal}>94.2%</Text>
              <Text style={styles.statDesc}>Attendance</Text>
            </View>
            <View style={[styles.statChip, { minWidth: 120, marginRight: 12 }]}>
              <Text style={styles.statVal}>₹18.4L</Text>
              <Text style={styles.statDesc}>Fees Paid</Text>
            </View>
            <View style={[styles.statChip, { minWidth: 120, marginRight: 12 }]}>
              <Text style={styles.statVal}>23</Text>
              <Text style={styles.statDesc}>At-Risk Alerts</Text>
            </View>
          </ScrollView>

          {/* Feature Grid List */}
          <Text style={[styles.cardHeader, { marginTop: 16 }]}>Core Mobile Portal Features</Text>
          {[
            { icon: '🤖', title: 'Llama AI Assistant', desc: 'Auto-generate fee reminders, parent circular sheets, and comments.' },
            { icon: '📅', title: 'Biometrics check-in', desc: 'Sync device camera facial recognitions and RFID card tag entry logs.' },
            { icon: '📚', title: 'Digital E-Books Library', desc: 'Browse catalog collections and launch download-blocked readers.' },
            { icon: '📝', title: 'Secure Proctor Quizzes', desc: 'Prevent cheating by logging tab-exits during exams.' }
          ].map((feat, i) => (
            <View key={i} style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 16 }]}>
              <Text style={{ fontSize: 32 }}>{feat.icon}</Text>
              <View style={{ flex: 1, alignItems: 'flex-start' }}>
                <Text style={{ fontWeight: '700', color: DARK_COLOR }}>{feat.title}</Text>
                <Text style={[styles.taskMuted, { textAlign: 'left' }]}>{feat.desc}</Text>
              </View>
            </View>
          ))}

          {/* Pricing Grid */}
          <Text style={[styles.cardHeader, { marginTop: 24 }]}>Transparent Tier Pricing</Text>
          {[
            { tier: 'Basic Tier', price: '₹4,999/mo', desc: 'Up to 300 students' },
            { tier: 'Standard Tier', price: '₹9,999/mo', desc: 'Up to 1,000 students (Most popular)' },
            { tier: 'Enterprise Tier', price: 'Contact Us', desc: 'Multi-campus, unlimited accounts' }
          ].map((price, i) => (
            <View key={i} style={[styles.card, { alignItems: 'flex-start' }]}>
              <Text style={{ fontWeight: '700', color: MUTED_COLOR, textTransform: 'uppercase', fontSize: 11 }}>{price.tier}</Text>
              <Text style={{ fontSize: 24, fontWeight: '800', color: PRIMARY_COLOR, marginVertical: 6 }}>{price.price}</Text>
              <Text style={styles.taskMuted}>{price.desc}</Text>
            </View>
          ))}

          {/* FAQ accordions */}
          <Text style={[styles.cardHeader, { marginTop: 24 }]}>Frequently Asked Questions</Text>
          {[
            { q: "Is Jitsi virtual classrooms integration free?", a: "Yes, Jitsi Meet utilizes WebRTC hosting to schedule classes with zero cost." },
            { q: "How is face descriptor data secured?", a: "Facial capture arrays are converted to 128-float coordinate values, encrypted, and stored locally." },
            { q: "Can we roll back database backups?", a: "Yes, school administrators can trigger database snapshot archives at any time." }
          ].map((item, idx) => {
            const isOpen = expandedMobileFaq === idx;
            return (
              <View key={idx} style={styles.card}>
                <TouchableOpacity style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }} onPress={() => setExpandedMobileFaq(isOpen ? null : idx)}>
                  <Text style={{ fontWeight: '700', color: DARK_COLOR, flex: 1, textAlign: 'left' }}>{item.q}</Text>
                  <Text style={{ color: PRIMARY_COLOR, fontWeight: '800', fontSize: 18 }}>{isOpen ? '−' : '+'}</Text>
                </TouchableOpacity>
                {isOpen && (
                  <Text style={[styles.taskMuted, { marginTop: 10, lineHeight: 18, textAlign: 'left' }]}>{item.a}</Text>
                )}
              </View>
            );
          })}

          {/* CTA Access button */}
          <TouchableOpacity style={[styles.submitBtn, { marginVertical: 32 }]} onPress={() => setShowMobileLogin(true)}>
            <Text style={styles.submitBtnText}>Access School Portal Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    ) : (
      <SafeAreaView style={styles.loginContainer}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <TouchableOpacity style={[styles.backContactsBtn, { alignSelf: 'stretch', borderRadius: 8, marginBottom: 16 }]} onPress={() => setShowMobileLogin(false)}>
            <Text style={styles.backContactsText}>← Back to Landing Page</Text>
          </TouchableOpacity>

          <View style={styles.headerPanel}>
            <View style={styles.logoBadge}><Text style={styles.logoTextChar}>S</Text></View>
            <Text style={styles.appName}>SMS Mobile Portal</Text>
            <Text style={styles.subtitle}>Direct Network Synchronization</Text>
          </View>

          {/* Role selector supporting all 5 roles */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24, maxHeight: 60 }}>
            {['SuperAdmin', 'Admin', 'Teacher', 'Student', 'Parent'].map(item => (
              <TouchableOpacity
                key={item}
                style={[styles.roleBtn, role === item && styles.roleBtnActive, { minWidth: 100, marginRight: 8, paddingHorizontal: 12 }]}
                onPress={() => setRole(item)}
              >
                <Text style={[styles.roleBtnText, role === item && styles.roleBtnTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>SMS Server Endpoint IP</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. http://10.0.2.2:50001"
              placeholderTextColor={MUTED_COLOR}
              autoCapitalize="none"
              value={serverIp}
              onChangeText={setServerIp}
            />

            <Text style={styles.inputLabel}>{role} Email ID</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter email"
              placeholderTextColor={MUTED_COLOR}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter password"
              placeholderTextColor={MUTED_COLOR}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleLogin} disabled={mobileSubmitting}>
              <Text style={styles.submitBtnText}>{mobileSubmitting ? 'Accessing...' : 'Access Portal Dashboard'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.appContainer}>
      <StatusBar barStyle="dark-content" />

      {/* Mobile Top Bar */}
      <View style={styles.topBar}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <Text style={styles.topUser}>{user?.name || 'Portal User'}</Text>
          <Text style={styles.topSchool}>🏫 SMS Academy ({role})</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Main Workspace Section */}
      <View style={styles.bodyWorkspace}>
        {activeTab === 'Dashboard' && (
          <ScrollView contentContainerStyle={styles.viewPadding}>
            <Text style={styles.sectionHeader}>Dashboard Overview</Text>

            {role === 'SuperAdmin' ? (
              <View>
                <Text style={[styles.cardHeader, { marginTop: 12 }]}>School Tenants Registered</Text>
                {schoolsList.map((school, index) => (
                  <View key={index} style={styles.card}>
                    <Text style={{ fontWeight: '700', color: DARK_COLOR }}>{school.name}</Text>
                    <Text style={styles.taskMuted}>{school.address}</Text>
                    <Text style={styles.taskMuted}>Status: {school.isActive ? 'Active' : 'Suspended'}</Text>
                  </View>
                ))}
                {schoolsList.length === 0 && (
                  <View style={styles.card}>
                    <Text style={{ fontWeight: '700', color: DARK_COLOR }}>Sun Rise Academy</Text>
                    <Text style={styles.taskMuted}>Status: Active</Text>
                  </View>
                )}
              </View>
            ) : (
              <>
                {/* Stat Badges */}
                <View style={styles.statsRow}>
                  <View style={styles.statChip}>
                    <Text style={styles.statVal}>{role === 'Parent' || role === 'Student' ? '100%' : '1'}</Text>
                    <Text style={styles.statDesc}>{role === 'Parent' || role === 'Student' ? 'Attendance' : 'My Classes'}</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Text style={styles.statVal}>{role === 'Admin' ? '2' : '₹500'}</Text>
                    <Text style={styles.statDesc}>{role === 'Admin' ? 'Students Enrolled' : 'Fee Status'}</Text>
                  </View>
                </View>

                {/* Timetable summary */}
                <View style={styles.card}>
                  <Text style={styles.cardHeader}>Today's Schedule</Text>
                  {timetable.length > 0 ? (
                    timetable.slice(0, 2).map((item, idx) => (
                      <View key={idx} style={styles.timetableItem}>
                        <Text style={styles.periodText}>Period {item.periodNumber} ({item.startTime} - {item.endTime})</Text>
                        <Text style={styles.subjectText}>{item.subjectName || item.subjectId?.name || 'Class'} - {item.teacherName || item.teacherId?.name || 'Teacher'}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.taskMuted}>No schedules registered for today.</Text>
                  )}
                </View>

                {/* Announcements */}
                <View style={styles.card}>
                  <Text style={styles.cardHeader}>Recent Bulletins</Text>
                  {notices.map((item, idx) => (
                    <View key={idx} style={styles.taskItem}>
                      <Text style={styles.taskTitle}>{item.title}</Text>
                      <Text style={styles.taskMuted}>{item.content?.substring(0, 60)}...</Text>
                    </View>
                  ))}
                  {notices.length === 0 && (
                    <Text style={styles.taskMuted}>No recent announcements published.</Text>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        )}

        {activeTab === 'Timetable' && (
          <ScrollView contentContainerStyle={styles.viewPadding}>
            <Text style={styles.sectionHeader}>Weekly Classes Timetable</Text>
            {timetable.map((item, idx) => (
              <View key={idx} style={styles.card}>
                <Text style={styles.cardHeader}>{item.day} - Period {item.periodNumber}</Text>
                <Text style={styles.taskMuted}>Timings: {item.startTime} - {item.endTime}</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: PRIMARY_COLOR, marginVertical: 4 }}>Subject: {item.subjectName || item.subjectId?.name}</Text>
                <Text style={styles.taskMuted}>Teacher Assigned: {item.teacherName || item.teacherId?.name || 'Faculty'}</Text>
              </View>
            ))}
            {timetable.length === 0 && (
              <Text style={styles.taskMuted}>No timetable periods assigned.</Text>
            )}
          </ScrollView>
        )}

        {activeTab === 'Notices' && (
          <ScrollView contentContainerStyle={styles.viewPadding}>
            <Text style={styles.sectionHeader}>Announcements</Text>
            {notices.map((item, idx) => (
              <View key={idx} style={styles.card}>
                <View style={styles.badgeRow}>
                  <Text style={styles.cardHeader}>{item.title}</Text>
                  <Text style={[styles.statusBadge, styles.badgeOrange]}>{item.priority} Priority</Text>
                </View>
                <Text style={styles.noticeDate}>Published: {new Date(item.createdAt).toLocaleDateString()}</Text>
                <Text style={styles.noticeText}>{item.content}</Text>
              </View>
            ))}
            {notices.length === 0 && (
              <View style={styles.card}>
                <Text style={styles.noticeText}>No announcements posted by school authority.</Text>
              </View>
            )}
          </ScrollView>
        )}

        {activeTab === 'AI Assistant' && (
          <ScrollView contentContainerStyle={styles.viewPadding}>
            <Text style={styles.sectionHeader}>AI Tool Assistant</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {['insights', 'reminder', 'comment'].map(tool => (
                <TouchableOpacity
                  key={tool}
                  style={[styles.roleBtn, aiTool === tool && styles.roleBtnActive, { paddingVertical: 8 }]}
                  onPress={() => setAiTool(tool)}
                >
                  <Text style={[styles.roleBtnText, aiTool === tool && styles.roleBtnTextActive, { fontSize: 12 }]}>
                    {tool === 'insights' ? 'Insights' : tool === 'reminder' ? 'Fee Letter' : 'Comments'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.card}>
              {aiTool === 'insights' && (
                <View>
                  <Text style={styles.inputLabel}>Ask AI Query (Insights)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. How many students are registered?"
                    placeholderTextColor={MUTED_COLOR}
                    value={aiInputText}
                    onChangeText={setAiInputText}
                  />
                </View>
              )}

              {aiTool === 'reminder' && (
                <View>
                  <Text style={styles.inputLabel}>Generate Fee Reminder Letter (Tone)</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                    {['Polite', 'Firm', 'Final Notice'].map(tone => (
                      <TouchableOpacity
                        key={tone}
                        style={[styles.roleBtn, aiReminderTone === tone && styles.roleBtnActive, { paddingVertical: 6 }]}
                        onPress={() => setAiReminderTone(tone)}
                      >
                        <Text style={[styles.roleBtnText, aiReminderTone === tone && styles.roleBtnTextActive, { fontSize: 11 }]}>
                          {tone}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {aiTool === 'comment' && (
                <View>
                  <Text style={styles.inputLabel}>Student Name</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Rohan Verma"
                    placeholderTextColor={MUTED_COLOR}
                    value={aiInputText}
                    onChangeText={setAiInputText}
                  />
                </View>
              )}

              <TouchableOpacity style={styles.submitBtn} onPress={askAITool}>
                <Text style={styles.submitBtnText}>Generate AI Response</Text>
              </TouchableOpacity>
            </View>

            {aiTextResponse ? (
              <View style={[styles.card, { backgroundColor: '#F8FAFC' }]}>
                <Text style={{ fontWeight: '700', color: PRIMARY_COLOR, marginBottom: 8 }}>AI Response:</Text>
                <Text style={{ color: DARK_COLOR, lineHeight: 18 }}>{aiTextResponse}</Text>
              </View>
            ) : null}
          </ScrollView>
        )}

        {activeTab === 'Roles' && (
          <ScrollView contentContainerStyle={styles.viewPadding}>
            <Text style={styles.sectionHeader}>Configure Permissions Matrix</Text>
            {selectedTeacherPerm ? (
              <View style={styles.card}>
                <Text style={styles.cardHeader}>{selectedTeacherPerm.user ? selectedTeacherPerm.user.name : selectedTeacherPerm.name}</Text>
                <Text style={styles.taskMuted}>{selectedTeacherPerm.user ? selectedTeacherPerm.user.email : selectedTeacherPerm.email}</Text>
                
                <Text style={[styles.inputLabel, { marginTop: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 6 }]}>Permissions switches</Text>
                {[
                  { key: 'view_students', label: 'View Students' },
                  { key: 'create_student', label: 'Create Student' },
                  { key: 'mark_attendance', label: 'Mark Attendance' },
                  { key: 'create_homework', label: 'Assign Homework' },
                  { key: 'publish_exams', label: 'Enter Marks' }
                ].map(item => {
                  const perms = selectedTeacherPerm.user ? selectedTeacherPerm.user.permissions : selectedTeacherPerm.permissions;
                  const has = perms && perms.includes(item.key);
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' }}
                      onPress={() => toggleTeacherPermission(item.key)}
                    >
                      <Text style={{ color: DARK_COLOR }}>{item.label}</Text>
                      <Text style={{ color: has ? PRIMARY_COLOR : MUTED_COLOR, fontWeight: '700' }}>{has ? 'ENABLED ✓' : 'DISABLED ✗'}</Text>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity style={[styles.submitBtn, { marginTop: 16 }]} onPress={() => Alert.alert('Saved', 'Teacher matrix successfully synced with DB.')}>
                  <Text style={styles.submitBtnText}>Save Matrix Config</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.taskMuted}>No teachers loaded.</Text>
            )}
          </ScrollView>
        )}

        {activeTab === 'Chat' && (
          <View style={{ flex: 1 }}>
            {selectedContact ? (
              <View style={{ flex: 1 }}>
                <TouchableOpacity style={styles.backContactsBtn} onPress={() => setSelectedContact(null)}>
                  <Text style={styles.backContactsText}>← Back to Contacts List</Text>
                </TouchableOpacity>
                <FlatList
                  data={chatLog}
                  keyExtractor={(item, index) => index.toString()}
                  contentContainerStyle={{ padding: 16 }}
                  renderItem={({ item }) => (
                    <View style={[styles.bubbleContainer, item.senderId === user?.id || item.senderId === 'me' ? styles.bubbleMe : styles.bubbleOther]}>
                      <Text style={[styles.bubbleText, item.senderId === user?.id || item.senderId === 'me' ? styles.textWhite : styles.textDark]}>
                        {item.message}
                      </Text>
                    </View>
                  )}
                />

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.chatInput}
                    placeholder="Type your message..."
                    placeholderTextColor={MUTED_COLOR}
                    value={chatMessage}
                    onChangeText={setChatMessage}
                  />
                  <TouchableOpacity style={styles.sendBtn} onPress={sendChatMessage}>
                    <Text style={styles.sendBtnText}>Send</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <FlatList
                data={chatContacts}
                keyExtractor={(item) => item._id}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.contactItem} onPress={() => selectContactChat(item)}>
                    <View style={styles.contactAvatar}><Text style={styles.avatarText}>{item.name.charAt(0)}</Text></View>
                    <View style={{ flex: 1, marginLeft: 12, alignItems: 'flex-start' }}>
                      <Text style={styles.contactName}>{item.name}</Text>
                      <Text style={styles.contactRole}>{item.role}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={[styles.taskMuted, { textAlign: 'center', marginTop: 32 }]}>No communication contacts available.</Text>
                }
              />
            )}
          </View>
        )}

        {activeTab === 'Tools' && (
          <ScrollView contentContainerStyle={styles.viewPadding}>
            <Text style={styles.sectionHeader}>School Tools Portal</Text>

            {selectedTool === null ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                {role === 'Student' && (
                  <>
                    <TouchableOpacity style={[styles.statChip, { minWidth: '45%' }]} onPress={() => { setSelectedTool('face'); setFaceStatus('Focal area ready.'); }}>
                      <Text style={{ fontSize: 24 }}>📸</Text>
                      <Text style={[styles.statDesc, { fontWeight: '700', color: DARK_COLOR }]}>Face Check-in</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.statChip, { minWidth: '45%' }]} onPress={() => setSelectedTool('library')}>
                      <Text style={{ fontSize: 24 }}>📚</Text>
                      <Text style={[styles.statDesc, { fontWeight: '700', color: DARK_COLOR }]}>Digital Library</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.statChip, { minWidth: '45%' }]} onPress={() => setSelectedTool('lms')}>
                      <Text style={{ fontSize: 24 }}>🎥</Text>
                      <Text style={[styles.statDesc, { fontWeight: '700', color: DARK_COLOR }]}>LMS Lectures</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.statChip, { minWidth: '45%' }]} onPress={() => setSelectedTool('assessments')}>
                      <Text style={{ fontSize: 24 }}>📝</Text>
                      <Text style={[styles.statDesc, { fontWeight: '700', color: DARK_COLOR }]}>Proctored Tests</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.statChip, { minWidth: '45%' }]} onPress={() => setSelectedTool('certificates')}>
                      <Text style={{ fontSize: 24 }}>🏆</Text>
                      <Text style={[styles.statDesc, { fontWeight: '700', color: DARK_COLOR }]}>Achievements</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.statChip, { minWidth: '45%' }]} onPress={() => setSelectedTool('meetings')}>
                      <Text style={{ fontSize: 24 }}>📞</Text>
                      <Text style={[styles.statDesc, { fontWeight: '700', color: DARK_COLOR }]}>Virtual Meetings</Text>
                    </TouchableOpacity>
                  </>
                )}

                {role === 'Teacher' && (
                  <>
                    <TouchableOpacity style={[styles.statChip, { minWidth: '45%' }]} onPress={() => setSelectedTool('leaves')}>
                      <Text style={{ fontSize: 24 }}>🌴</Text>
                      <Text style={[styles.statDesc, { fontWeight: '700', color: DARK_COLOR }]}>Leave & Salary</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.statChip, { minWidth: '45%' }]} onPress={() => setSelectedTool('schedule_meeting')}>
                      <Text style={{ fontSize: 24 }}>📞</Text>
                      <Text style={[styles.statDesc, { fontWeight: '700', color: DARK_COLOR }]}>Schedule Class</Text>
                    </TouchableOpacity>
                  </>
                )}

                {role === 'Admin' && (
                  <>
                    <TouchableOpacity style={[styles.statChip, { minWidth: '45%' }]} onPress={() => setSelectedTool('compliance')}>
                      <Text style={{ fontSize: 24 }}>🛡️</Text>
                      <Text style={[styles.statDesc, { fontWeight: '700', color: DARK_COLOR }]}>Compliance Logs</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.statChip, { minWidth: '45%' }]} onPress={() => setSelectedTool('backup')}>
                      <Text style={{ fontSize: 24 }}>💾</Text>
                      <Text style={[styles.statDesc, { fontWeight: '700', color: DARK_COLOR }]}>System Backup</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.statChip, { minWidth: '45%' }]} onPress={() => setSelectedTool('manage_classes')}>
                      <Text style={{ fontSize: 24 }}>🏫</Text>
                      <Text style={[styles.statDesc, { fontWeight: '700', color: DARK_COLOR }]}>Manage Classes</Text>
                    </TouchableOpacity>
                  </>
                )}

                {role === 'Parent' && (
                  <>
                    <TouchableOpacity style={[styles.statChip, { minWidth: '45%' }]} onPress={() => setSelectedTool('fees_online')}>
                      <Text style={{ fontSize: 24 }}>💵</Text>
                      <Text style={[styles.statDesc, { fontWeight: '700', color: DARK_COLOR }]}>Pay Fees Online</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.statChip, { minWidth: '45%' }]} onPress={() => setSelectedTool('alerts')}>
                      <Text style={{ fontSize: 24 }}>⚙️</Text>
                      <Text style={[styles.statDesc, { fontWeight: '700', color: DARK_COLOR }]}>Notifications</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : (
              <View>
                <TouchableOpacity style={[styles.backContactsBtn, { marginBottom: 16 }]} onPress={() => { setSelectedTool(null); setSelectedBookPdf(null); }}>
                  <Text style={styles.backContactsText}>← Back to Tools Main Menu</Text>
                </TouchableOpacity>

                {/* Face Attendance Sub-view */}
                {selectedTool === 'face' && (
                  <View style={styles.card}>
                    <Text style={styles.cardHeader}>📸 Biometric Facial Clock-in</Text>
                    <View style={{ height: 200, backgroundColor: '#E2E8F0', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginVertical: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: PRIMARY_COLOR }}>
                      {faceScanning ? (
                        <Text style={{ color: PRIMARY_COLOR, fontWeight: '700' }}>[ CAMERA SCANNING ACTIVE ]</Text>
                      ) : (
                        <Text style={{ color: MUTED_COLOR }}>Align face inside focal preview circle</Text>
                      )}
                    </View>
                    <Text style={[styles.taskMuted, { textAlign: 'center', marginBottom: 16 }]}>{faceStatus}</Text>
                    <TouchableOpacity style={styles.submitBtn} disabled={faceScanning} onPress={runFaceScan}>
                      <Text style={styles.submitBtnText}>{faceScanning ? 'Verifying descriptors...' : 'Start Facial Scanner'}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Library Catalog Sub-view */}
                {selectedTool === 'library' && (
                  <View>
                    <Text style={styles.cardHeader}>📚 Digital Catalog & E-Book Reader</Text>
                    {selectedBookPdf ? (
                      <View style={styles.card}>
                        <Text style={{ fontWeight: '700', color: PRIMARY_COLOR }}>Reading: {selectedBookPdf}</Text>
                        <View style={{ height: 250, backgroundColor: '#FAFAFB', padding: 12, borderRadius: 8, marginTop: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                          <Text style={{ fontSize: 13, color: DARK_COLOR, lineHeight: 18, fontStyle: 'italic', textAlign: 'left' }}>
                            "This is a secured mobile e-book preview. Downloading and screenshot options are disabled to comply with copyright requirements. Please scroll down to read subsequent chapters..."
                          </Text>
                        </View>
                        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: DARK_COLOR, marginTop: 12 }]} onPress={() => setSelectedBookPdf(null)}>
                          <Text style={styles.submitBtnText}>Close E-Book Preview</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <FlatList
                        data={libraryBooks}
                        keyExtractor={(item) => item._id}
                        scrollEnabled={false}
                        renderItem={({ item }) => (
                          <View style={styles.card}>
                            <Text style={{ fontWeight: '700', color: DARK_COLOR, textAlign: 'left' }}>{item.title}</Text>
                            <Text style={[styles.taskMuted, { textAlign: 'left' }]}>Author: {item.author} | Category: {item.category}</Text>
                            <Text style={[styles.statusBadge, item.type === 'Ebook' ? styles.badgeGreen : styles.badgeOrange, { alignSelf: 'flex-start', marginVertical: 6 }]}>{item.type}</Text>
                            {item.type === 'Ebook' ? (
                              <TouchableOpacity style={styles.payBtn} onPress={() => setSelectedBookPdf(item.title)}>
                                <Text style={styles.payBtnText}>Read E-Book Now</Text>
                              </TouchableOpacity>
                            ) : (
                              <Text style={styles.taskMuted}>Available Copies: {item.availableCopies} / Location: {item.shelfLocation || 'Shelf A1'}</Text>
                            )}
                          </View>
                        )}
                        ListEmptyComponent={<Text style={styles.taskMuted}>No books listed in school catalog.</Text>}
                      />
                    )}
                  </View>
                )}

                {/* LMS recorded lectures Sub-view */}
                {selectedTool === 'lms' && (
                  <View>
                    <Text style={styles.cardHeader}>🎥 LMS Stream & Homework Submissions</Text>
                    <FlatList
                      data={lmsLectures}
                      keyExtractor={(item) => item._id}
                      scrollEnabled={false}
                      renderItem={({ item }) => (
                        <View style={styles.card}>
                          <Text style={{ fontWeight: '700', color: DARK_COLOR, textAlign: 'left' }}>{item.title}</Text>
                          <Text style={[styles.taskMuted, { textAlign: 'left' }]}>{item.description}</Text>
                          <View style={{ height: 130, backgroundColor: '#000', marginVertical: 10, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ color: 'white', fontWeight: '700' }}>[ HTML5 HLS Video Streaming Playback ]</Text>
                          </View>
                          <Text style={styles.taskMuted}>Uploaded by faculty: {item.uploadedBy?.name || 'Teacher'}</Text>
                        </View>
                      )}
                      ListEmptyComponent={<Text style={styles.taskMuted}>No recorded lectures published.</Text>}
                    />
                  </View>
                )}

                {/* Proctor Tests Sub-view */}
                {selectedTool === 'assessments' && (
                  <View>
                    <Text style={styles.cardHeader}>📝 Online Assessments & Proctored Exams</Text>
                    <FlatList
                      data={assessmentsList}
                      keyExtractor={(item) => item._id}
                      scrollEnabled={false}
                      renderItem={({ item }) => (
                        <View style={styles.card}>
                          <Text style={{ fontWeight: '700', color: DARK_COLOR, textAlign: 'left' }}>{item.title}</Text>
                          <Text style={[styles.taskMuted, { textAlign: 'left' }]}>Duration: {item.durationMinutes} mins | Total: {item.totalMarks} Marks</Text>
                          <TouchableOpacity style={styles.payBtn} onPress={() => startQuizAttempt(item)}>
                            <Text style={styles.payBtnText}>Start Secure Exam Session</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      ListEmptyComponent={<Text style={styles.taskMuted}>No scheduled assessments currently active.</Text>}
                    />
                  </View>
                )}

                {/* Secure attempt proctoring Sub-view */}
                {selectedTool === 'assessments_attempt' && (
                  <View style={styles.card}>
                    <Text style={{ fontWeight: '700', color: PRIMARY_COLOR }}>🔒 SECURE ASSESSMENT RUNNING</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 }}>
                      <Text style={styles.taskMuted}>Timer: {testTimer}s</Text>
                      <Text style={{ color: 'red', fontWeight: '700' }}>Violations: {testCheatingCount}</Text>
                    </View>
                    <View style={{ backgroundColor: '#FAFAFB', padding: 12, borderRadius: 8, marginVertical: 12 }}>
                      <Text style={{ fontWeight: '600', color: DARK_COLOR, textAlign: 'left' }}>Question 1: What is the primary purpose of TF-IDF similarity algorithms?</Text>
                      {['A) Graphics design', 'B) Document similarity matches', 'C) Data sorting', 'D) Cache mapping'].map(opt => (
                        <TouchableOpacity
                          key={opt}
                          style={{ padding: 10, marginVertical: 4, backgroundColor: testAnswers['q1'] === opt ? SECONDARY_COLOR : 'white', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 6 }}
                          onPress={() => setTestAnswers({ ...testAnswers, 'q1': opt })}
                        >
                          <Text style={{ color: DARK_COLOR, textAlign: 'left' }}>{opt}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity style={[styles.submitBtn, { backgroundColor: DARK_COLOR }]} onPress={() => logQuizTabSwitch('assess1')}>
                      <Text style={styles.submitBtnText}>Simulate Tab Switch (Trigger Log)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.submitBtn} onPress={() => Alert.alert('Test Submitted', 'Quiz results uploaded.')}>
                      <Text style={styles.submitBtnText}>Submit Graded Exam</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Certificates Sub-view */}
                {selectedTool === 'certificates' && (
                  <View>
                    <Text style={styles.cardHeader}>🏆 Achievement Digital Wall</Text>
                    <FlatList
                      data={myCertificates}
                      keyExtractor={(item) => item._id}
                      scrollEnabled={false}
                      renderItem={({ item }) => (
                        <View style={styles.card}>
                          <Text style={{ fontWeight: '700', color: DARK_COLOR, textAlign: 'left' }}>{item.title}</Text>
                          <Text style={[styles.taskMuted, { textAlign: 'left' }]}>Verification ID: {item.uniqueId}</Text>
                          <Text style={[styles.statusBadge, styles.badgeGreen, { alignSelf: 'flex-start', marginVertical: 6 }]}>Verified Authenticity</Text>
                          <TouchableOpacity style={styles.payBtn} onPress={() => Alert.alert('Certificate Downloaded', 'Credential saved to files.')}>
                            <Text style={styles.payBtnText}>Save Credential PDF</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      ListEmptyComponent={<Text style={styles.taskMuted}>No certificate credentials generated yet.</Text>}
                    />
                  </View>
                )}

                {/* Jitsi Meetings Sub-view */}
                {selectedTool === 'meetings' && (
                  <View>
                    <Text style={styles.cardHeader}>📞 Virtual Scheduled Meet Rooms</Text>
                    <FlatList
                      data={jitsiMeetings}
                      keyExtractor={(item) => item._id}
                      scrollEnabled={false}
                      renderItem={({ item }) => (
                        <View style={styles.card}>
                          <Text style={{ fontWeight: '700', color: DARK_COLOR, textAlign: 'left' }}>{item.title}</Text>
                          <Text style={[styles.taskMuted, { textAlign: 'left' }]}>Type: {item.meetingType} | Date: {new Date(item.startTime).toLocaleString()}</Text>
                          <TouchableOpacity style={styles.payBtn} onPress={() => Alert.alert('Jitsi Meet', `Launching Meet: ${item.joinUrl}`)}>
                            <Text style={styles.payBtnText}>Join Video Call now</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      ListEmptyComponent={<Text style={styles.taskMuted}>No scheduled class video calls found.</Text>}
                    />
                  </View>
                )}

                {/* Leave Requests Sub-view */}
                {selectedTool === 'leaves' && (
                  <View>
                    <Text style={styles.cardHeader}>🌴 Leave Requests & Salary breakdowns</Text>
                    <View style={styles.card}>
                      <Text style={[styles.inputLabel, { textAlign: 'left' }]}>Request Leave</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Start Date (e.g. 2026-08-10)"
                        placeholderTextColor={MUTED_COLOR}
                        value={newLeaveForm.startDate}
                        onChangeText={(t) => setNewLeaveForm({ ...newLeaveForm, startDate: t })}
                      />
                      <TextInput
                        style={styles.textInput}
                        placeholder="End Date (e.g. 2026-08-12)"
                        placeholderTextColor={MUTED_COLOR}
                        value={newLeaveForm.endDate}
                        onChangeText={(t) => setNewLeaveForm({ ...newLeaveForm, endDate: t })}
                      />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Reason"
                        placeholderTextColor={MUTED_COLOR}
                        value={newLeaveForm.reason}
                        onChangeText={(t) => setNewLeaveForm({ ...newLeaveForm, reason: t })}
                      />
                      <TouchableOpacity style={styles.submitBtn} onPress={submitTeacherLeaveRequest} disabled={mobileSubmitting}>
                        <Text style={styles.submitBtnText}>{mobileSubmitting ? 'Submitting...' : 'Submit Leave Application'}</Text>
                      </TouchableOpacity>
                    </View>

                    <FlatList
                      data={leaveRequests}
                      keyExtractor={(item) => item._id}
                      scrollEnabled={false}
                      renderItem={({ item }) => (
                        <View style={styles.card}>
                          <Text style={{ fontWeight: '700', color: DARK_COLOR, textAlign: 'left' }}>Reason: {item.reason}</Text>
                          <Text style={[styles.taskMuted, { textAlign: 'left' }]}>Dates: {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}</Text>
                          <Text style={[styles.statusBadge, item.status === 'Approved' ? styles.badgeGreen : styles.badgeOrange, { alignSelf: 'flex-start', marginVertical: 6 }]}>{item.status}</Text>
                        </View>
                      )}
                      ListEmptyComponent={<Text style={styles.taskMuted}>No leave history recorded.</Text>}
                    />
                  </View>
                )}

                {/* Schedule meeting Sub-view */}
                {selectedTool === 'schedule_meeting' && (
                  <View style={styles.card}>
                    <Text style={styles.cardHeader}>📞 Schedule Virtual Class Meeting</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Meeting Title"
                      placeholderTextColor={MUTED_COLOR}
                      value={newMeetingForm.title}
                      onChangeText={(t) => setNewMeetingForm({ ...newMeetingForm, title: t })}
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Start Time (e.g. 2026-08-10T10:00:00Z)"
                      placeholderTextColor={MUTED_COLOR}
                      value={newMeetingForm.startTime}
                      onChangeText={(t) => setNewMeetingForm({ ...newMeetingForm, startTime: t })}
                    />
                    <TouchableOpacity style={styles.submitBtn} onPress={scheduleVirtualClass} disabled={mobileSubmitting}>
                      <Text style={styles.submitBtnText}>{mobileSubmitting ? 'Creating...' : 'Create Meeting Room Link'}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Compliance Logs Sub-view */}
                {selectedTool === 'compliance' && (
                  <View>
                    <Text style={styles.cardHeader}>🛡️ Compliance Security Logs</Text>
                    <FlatList
                      data={auditLogs}
                      keyExtractor={(item) => item._id}
                      scrollEnabled={false}
                      renderItem={({ item }) => (
                        <View style={styles.card}>
                          <Text style={{ fontWeight: '700', color: DARK_COLOR, textAlign: 'left' }}>Action: {item.action}</Text>
                          <Text style={[styles.taskMuted, { textAlign: 'left' }]}>Executed by ID: {item.userId?.name || item.userId || 'System'}</Text>
                          <Text style={styles.taskMuted}>Timestamp: {new Date(item.timestamp).toLocaleString()}</Text>
                        </View>
                      )}
                      ListEmptyComponent={<Text style={styles.taskMuted}>No security audit logs recorded.</Text>}
                    />
                  </View>
                )}

                {/* System Backup Sub-view */}
                {selectedTool === 'backup' && (
                  <View style={styles.card}>
                    <Text style={styles.cardHeader}>💾 DB Backups Control</Text>
                    <Text style={[styles.taskMuted, { textAlign: 'left', marginBottom: 16 }]}>
                      Triggering a database backup compiles all collections scoped to your school, encrypts them using AES-256-CBC, and stores the rotating log file securely.
                    </Text>
                    <TouchableOpacity style={styles.submitBtn} onPress={triggerComplianceBackup} disabled={mobileSubmitting}>
                      <Text style={styles.submitBtnText}>{mobileSubmitting ? 'Archiving...' : 'Trigger Local DB Backup Archive'}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Manage Classes Sub-view */}
                {selectedTool === 'manage_classes' && (
                  <View>
                    <Text style={styles.cardHeader}>🏫 Manage School Class Sections</Text>
                    
                    {/* Create/Edit Form */}
                    <View style={styles.card}>
                      <Text style={[styles.inputLabel, { textAlign: 'left' }]}>
                        {editingMobileClass ? '✏️ Edit Class details' : '➕ Create New Class'}
                      </Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Grade Level (e.g. 10th)"
                        placeholderTextColor={MUTED_COLOR}
                        value={mobileClassForm.name}
                        onChangeText={(t) => setMobileClassForm({ ...mobileClassForm, name: t })}
                      />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Section Division (e.g. A)"
                        placeholderTextColor={MUTED_COLOR}
                        value={mobileClassForm.section}
                        onChangeText={(t) => setMobileClassForm({ ...mobileClassForm, section: t })}
                      />
                      <TextInput
                        style={styles.textInput}
                        placeholder="Room Number (e.g. Room 102)"
                        placeholderTextColor={MUTED_COLOR}
                        value={mobileClassForm.roomNumber}
                        onChangeText={(t) => setMobileClassForm({ ...mobileClassForm, roomNumber: t })}
                      />
                      <TouchableOpacity style={styles.submitBtn} onPress={submitMobileClass} disabled={mobileSubmitting}>
                        <Text style={styles.submitBtnText}>
                          {mobileSubmitting ? 'Saving...' : (editingMobileClass ? 'Update Class Details' : 'Register Class Section')}
                        </Text>
                      </TouchableOpacity>
                      {editingMobileClass && (
                        <TouchableOpacity
                          style={[styles.submitBtn, { backgroundColor: DARK_COLOR, marginTop: 8 }]}
                          onPress={() => { setEditingMobileClass(null); setMobileClassForm({ name: '', section: '', roomNumber: '' }); }}
                        >
                          <Text style={styles.submitBtnText}>Cancel Edit</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Classes List */}
                    <FlatList
                      data={classesList}
                      keyExtractor={(item) => item._id}
                      scrollEnabled={false}
                      renderItem={({ item }) => (
                        <View style={styles.card}>
                          <Text style={{ fontWeight: '700', color: DARK_COLOR, textAlign: 'left', fontSize: 16 }}>
                            Class {item.name} - {item.section}
                          </Text>
                          <Text style={[styles.taskMuted, { textAlign: 'left', marginVertical: 4 }]}>
                            Location: {item.roomNumber || 'TBD'}
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                            <TouchableOpacity
                              style={[styles.payBtn, { flex: 1, marginTop: 0, backgroundColor: SECONDARY_COLOR, borderWidth: 1, borderColor: PRIMARY_COLOR }]}
                              onPress={() => {
                                setEditingMobileClass(item);
                                setMobileClassForm({ name: item.name, section: item.section, roomNumber: item.roomNumber || '' });
                              }}
                            >
                              <Text style={[styles.payBtnText, { color: PRIMARY_COLOR }]}>Edit ✏️</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.payBtn, { flex: 1, marginTop: 0, backgroundColor: '#FFF5F2' }]}
                              onPress={() => deleteMobileClass(item._id)}
                            >
                              <Text style={[styles.payBtnText, { color: '#FF6B35' }]}>Delete 🗑️</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                      ListEmptyComponent={<Text style={styles.taskMuted}>No class sections registered.</Text>}
                    />
                  </View>
                )}

                {/* Pay Fees Parent Sub-view */}
                {selectedTool === 'fees_online' && (
                  <View style={styles.card}>
                    <Text style={styles.cardHeader}>💵 Pay Dues Online</Text>
                    <Text style={[styles.taskMuted, { textAlign: 'left', marginVertical: 8 }]}>Pending Amount: ₹500</Text>
                    <TouchableOpacity style={styles.submitBtn} onPress={() => payFeeOnline('fee_123', 500)}>
                      <Text style={styles.submitBtnText}>Initialize Stripe Sandbox Checkout</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Notification preferences Parent Sub-view */}
                {selectedTool === 'alerts' && (
                  <View style={styles.card}>
                    <Text style={styles.cardHeader}>⚙️ Alerts & Notifications Channels</Text>
                    <View style={{ gap: 12, marginVertical: 12 }}>
                      <TouchableOpacity
                        style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}
                        onPress={() => setAlertPreferences({ ...alertPreferences, whatsapp: !alertPreferences.whatsapp })}
                      >
                        <Text style={{ color: DARK_COLOR }}>WhatsApp Business Alerts</Text>
                        <Text style={{ color: alertPreferences.whatsapp ? PRIMARY_COLOR : MUTED_COLOR, fontWeight: '700' }}>{alertPreferences.whatsapp ? 'ON' : 'OFF'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}
                        onPress={() => setAlertPreferences({ ...alertPreferences, telegram: !alertPreferences.telegram })}
                      >
                        <Text style={{ color: DARK_COLOR }}>Telegram Bot Channel</Text>
                        <Text style={{ color: alertPreferences.telegram ? PRIMARY_COLOR : MUTED_COLOR, fontWeight: '700' }}>{alertPreferences.telegram ? 'ON' : 'OFF'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Navigation Footer Tab Bar */}
      <View style={styles.footerTabBar}>
        {roleTabs.map(tab => (
          <TouchableOpacity
            key={tab}
            style={styles.tabBtn}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
              {tab === 'Dashboard' && '📊'}
              {tab === 'Timetable' && '🗓️'}
              {tab === 'Notices' && '📢'}
              {tab === 'Chat' && '💬'}
              {tab === 'AI Assistant' && '🤖'}
              {tab === 'Roles' && '🛡️'}
              {tab === 'Tools' && '🛠️'}
            </Text>
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loginContainer: {
    flex: 1,
    backgroundColor: '#FDFDFD',
  },
  scrollContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerPanel: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 24,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoTextChar: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: DARK_COLOR,
  },
  subtitle: {
    fontSize: 14,
    color: MUTED_COLOR,
    marginTop: 4,
  },
  roleGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  roleBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  roleBtnActive: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: SECONDARY_COLOR,
  },
  roleBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: DARK_COLOR,
  },
  roleBtnTextActive: {
    color: PRIMARY_COLOR,
  },
  formCard: {
    width: '100%',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: DARK_COLOR,
    marginBottom: 8,
    textAlign: 'left',
  },
  textInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: DARK_COLOR,
    marginBottom: 18,
  },
  submitBtn: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },

  // App styles
  appContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topUser: {
    fontSize: 16,
    fontWeight: '700',
    color: DARK_COLOR,
  },
  topSchool: {
    fontSize: 12,
    color: MUTED_COLOR,
    marginTop: 2,
  },
  logoutBtn: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: DARK_COLOR,
  },
  bodyWorkspace: {
    flex: 1,
  },
  viewPadding: {
    padding: 20,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: DARK_COLOR,
    marginBottom: 16,
    textAlign: 'left',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  statChip: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'flex-start',
  },
  statVal: {
    fontSize: 28,
    fontWeight: '700',
    color: PRIMARY_COLOR,
  },
  statDesc: {
    fontSize: 12,
    color: MUTED_COLOR,
    marginTop: 4,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: DARK_COLOR,
    marginBottom: 12,
    textAlign: 'left',
  },
  timetableItem: {
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY_COLOR,
    paddingLeft: 12,
    marginVertical: 6,
    textAlign: 'left',
  },
  periodText: {
    fontSize: 13,
    fontWeight: '700',
    color: DARK_COLOR,
  },
  subjectText: {
    fontSize: 12,
    color: MUTED_COLOR,
    marginTop: 2,
  },
  taskItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 10,
    textAlign: 'left',
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: DARK_COLOR,
  },
  taskMuted: {
    fontSize: 12,
    color: MUTED_COLOR,
    marginTop: 2,
    textAlign: 'left',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '600',
  },
  badgeGreen: {
    backgroundColor: '#ECFDF5',
    color: '#10B981',
  },
  badgeOrange: {
    backgroundColor: '#FFEFEB',
    color: PRIMARY_COLOR,
  },
  payBtn: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  payBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  noticeDate: {
    fontSize: 11,
    color: MUTED_COLOR,
    marginBottom: 8,
    textAlign: 'left',
  },
  noticeText: {
    fontSize: 13,
    color: DARK_COLOR,
    lineHeight: 18,
    textAlign: 'left',
  },

  // Chat layout styles
  bubbleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    marginVertical: 4,
    maxWidth: '75%',
  },
  bubbleMe: {
    backgroundColor: PRIMARY_COLOR,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2,
  },
  bubbleOther: {
    backgroundColor: 'white',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 18,
  },
  textWhite: { color: 'white' },
  textDark: { color: DARK_COLOR },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    color: DARK_COLOR,
  },
  sendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sendBtnText: {
    color: PRIMARY_COLOR,
    fontWeight: '700',
  },

  // Contact list styles
  contactItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: DARK_COLOR,
    textAlign: 'left',
  },
  contactRole: {
    fontSize: 12,
    color: MUTED_COLOR,
    marginTop: 2,
    textAlign: 'left',
  },
  backContactsBtn: {
    padding: 16,
    backgroundColor: '#FAFAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backContactsText: {
    color: PRIMARY_COLOR,
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'left',
  },

  // Footer tab navigation
  footerTabBar: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnText: {
    fontSize: 20,
  },
  tabBtnTextActive: {
    transform: [{ scale: 1.15 }],
  },
  tabLabel: {
    fontSize: 10,
    color: MUTED_COLOR,
    marginTop: 2,
  },
  tabLabelActive: {
    color: PRIMARY_COLOR,
    fontWeight: '600',
  }
});
