import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Paperclip, 
  Send, 
  Users, 
  Menu, 
  X, 
  LogIn, 
  FileText, 
  Loader2,
  Volume2,
  Edit2,
  UserX,
  Trash2,
  ShieldAlert,
  Lock,
  CheckSquare,
  Square,
  Globe,
  Key,
  UserPlus,
  Copy,
  Link as LinkIcon,
  LogOut
} from 'lucide-react';
import { db, auth, storage } from './firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  setDoc, 
  getDoc,
  deleteDoc,
  where,
  getDocs
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

// 預設管理員代碼 (大寫)
const ADMIN_INIT_CODE = '9183ABCD';

// DLP (Data Loss Prevention) 數據遮蔽
const sanitizeText = (text) => {
  if (!text) return '';
  let sanitized = text;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  sanitized = sanitized.replace(emailRegex, '[REDACTED_EMAIL]');
  const urlRegex = /(https?:\/\/[^\s]+)|(t\.me\/[^\s]+)|(wa\.me\/[^\s]+)|(line\.me\/[^\s]+)/gi;
  sanitized = sanitized.replace(urlRegex, '[REDACTED_LINK]');
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/g;
  sanitized = sanitized.replace(phoneRegex, '[REDACTED_PHONE]');
  return sanitized;
};

// 隨機生成 8 位英數代碼
const generate8CharRandomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export default function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  const [user, setUser] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [inputText, setInputText] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // 語音錄製 State
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // 登門檻控制
  const [input8Code, setInput8Code] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // 管理面板 State
  const [newUserNameInput, setNewUserNameInput] = useState('');
  const [createdCodeList, setCreatedCodeList] = useState([]);
  const [editingUserId, setEditingUserId] = useState(null);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [managingAccessMsgId, setManagingAccessMsgId] = useState(null);
  
  // DOM & Audio Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  // Audio Canvas Refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  // 抓取 IP 地理位置
  const fetchClientGeoLocation = async () => {
    try {
      const res = await fetch('https://ipwho.is/');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          return {
            ip: data.ip || 'Unknown IP',
            locationStr: `${data.city || 'Unknown'}, ${data.country || 'Unknown'}`
          };
        }
      }
    } catch (e) {
      console.warn("Primary IP fetch failed:", e);
    }
    return { ip: '127.0.0.1', locationStr: 'Unknown Location' };
  };

  // 1. 監聽 Auth 狀態 (以 AccessCode 作為唯一 Document ID，防重複建立)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const activeCode = localStorage.getItem('secure_desk_code');
        
        if (!activeCode) {
          setCurrentUserData(null);
          return;
        }

        // 僅調用 AccessCode 文件
        const userRef = doc(db, 'users', activeCode);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const geoInfo = await fetchClientGeoLocation();
          await updateDoc(userRef, {
            ip: geoInfo.ip,
            location: geoInfo.locationStr,
            lastActive: serverTimestamp(),
            currentUid: firebaseUser.uid
          });

          onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.isBanned) {
                alert("Node connection terminated by Administrator.");
                localStorage.removeItem('secure_desk_code');
                signOut(auth);
                setCurrentUserData(null);
                return;
              }
              setCurrentUserData({ id: docSnap.id, ...data });
            }
          });
        } else {
          setCurrentUserData(null);
        }
      } else {
        setCurrentUserData(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. 監聽聊天數據與成員 (並自動過濾與清理歷史重複帳號)
  useEffect(() => {
    if (!user || !currentUserData) return;

    const qMessages = query(collection(db, 'messages'), orderBy('createdAt', 'asc'));
    const unsubMessages = onSnapshot(qMessages, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    const qMembers = query(collection(db, 'users'));
    const unsubMembers = onSnapshot(qMembers, (snapshot) => {
      // 僅留下以 8 位元代碼做 ID 的正規文件，排除舊有 UID 文件
      const validMembers = [];
      snapshot.docs.forEach(docSnap => {
        const docId = docSnap.id;
        const data = docSnap.data();
        
        // 判斷 ID 長度是否為 8 位的代碼
        if (docId.length === 8 && docId === docId.toUpperCase()) {
          validMembers.push({ id: docId, ...data });
        } else if (currentUserData.role === 'admin') {
          // 若為管理員，非代碼格式的舊殘留文件自動進行背景清理
          deleteDoc(doc(db, 'users', docId)).catch(() => {});
        }
      });
      setMembers(validMembers);
    });

    let unsubCodes = () => {};
    if (currentUserData.role === 'admin') {
      const qCodes = collection(db, 'access_codes');
      unsubCodes = onSnapshot(qCodes, (snapshot) => {
        const rawCodes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCreatedCodeList(rawCodes.reverse());
      }, (error) => {
        console.warn("Codes snapshot permission note:", error.message);
      });
    }

    return () => {
      unsubMessages();
      unsubMembers();
      unsubCodes();
    };
  }, [user, currentUserData]);

  // 3. 輸入代碼驗證 (僅寫入 doc(db, 'users', cleanCode))
  const handleVerifyAccessCode = async (e) => {
    e.preventDefault();
    const cleanCode = input8Code.trim().toUpperCase();
    if (cleanCode.length !== 8) {
      setAuthError('Please enter a valid 8-character code.');
      return;
    }

    setIsAuthenticating(true);
    setAuthError('');

    try {
      let assignedRole = 'member';
      let assignedName = '';

      if (cleanCode === ADMIN_INIT_CODE) {
        assignedRole = 'admin';
        assignedName = 'System_Admin';
      } else {
        const q = query(collection(db, 'access_codes'), where('code', '==', cleanCode));
        const querySnap = await getDocs(q);

        if (querySnap.empty) {
          setAuthError('Invalid Access Code. Contact Administrator.');
          setIsAuthenticating(false);
          return;
        }

        const codeData = querySnap.docs[0].data();
        assignedName = codeData.assignedName;
        assignedRole = codeData.role || 'member';
      }

      localStorage.setItem('secure_desk_code', cleanCode);

      const authRes = await signInAnonymously(auth);
      const firebaseUser = authRes.user;
      const geoInfo = await fetchClientGeoLocation();

      const userDataObj = {
        displayName: assignedName,
        role: assignedRole,
        accessCode: cleanCode,
        canChat: true,
        isBanned: false,
        ip: geoInfo.ip,
        location: geoInfo.locationStr,
        lastActive: serverTimestamp(),
        currentUid: firebaseUser.uid
      };

      // 核心：只寫入 AccessCode 作為 ID 的文件
      await setDoc(doc(db, 'users', cleanCode), userDataObj, { merge: true });

      setCurrentUserData({
        id: cleanCode,
        ...userDataObj
      });

      setIsAuthenticating(false);
      setInput8Code('');
    } catch (err) {
      console.error("Auth error:", err);
      setAuthError('Authentication failed. Please check connection.');
      setIsAuthenticating(false);
    }
  };

  // 4. 管理員新增帳號代碼
  const handleCreateNewUserCode = async (e) => {
    e.preventDefault();
    if (!newUserNameInput.trim() || currentUserData?.role !== 'admin') return;

    const generatedCode = generate8CharRandomCode();
    const cleanName = sanitizeText(newUserNameInput).trim();

    try {
      await addDoc(collection(db, 'access_codes'), {
        code: generatedCode,
        assignedName: cleanName,
        role: 'member',
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });
      setNewUserNameInput('');
    } catch (err) {
      console.error("Failed to generate code:", err);
      alert("Failed to generate code.");
    }
  };

  const generateGlobalInviteLink = async () => {
    if (currentUserData?.role !== 'admin') return;
    const inviteUrl = `${window.location.origin}`;
    await navigator.clipboard.writeText(inviteUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleKickUser = async (targetUserId) => {
    if (currentUserData?.role !== 'admin') return;
    if (confirm("Terminate & delete this node connection?")) {
      try {
        await deleteDoc(doc(db, 'users', targetUserId));
      } catch (e) {
        console.warn("Failed to delete user doc:", e);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('secure_desk_code');
    signOut(auth);
    setCurrentUserData(null);
  };

  // 5. STT & Waveform Canvas
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'zh-HK';

      recognitionRef.current.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setInputText((prev) => sanitizeText(prev + currentTranscript));
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleSpeechToText = () => {
    if (!recognitionRef.current) {
      alert("Browser does not support Speech Recognition.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyserRef.current.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = '#0f172a';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = '#10b981';

      canvasCtx.beginPath();
      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };

    draw();
  };

  // 6. 語音錄製邏輯
  const startRecording = async () => {
    if (!currentUserData?.canChat) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 2048;

      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        if (audioContextRef.current) audioContextRef.current.close();
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);

      setTimeout(() => drawWaveform(), 100);
    } catch (err) {
      alert("Microphone permission denied.");
    }
  };

  const stopAndSendRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await uploadAudioFile(audioBlob);
        if (audioContextRef.current) audioContextRef.current.close();
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      audioChunksRef.current = [];
      setRecordingTime(0);
    }
  };

  const uploadAudioFile = async (audioBlob) => {
    setIsUploading(true);
    const fileName = `voice_${Date.now()}.webm`;
    const storageRef = ref(storage, `secure_uploads/${fileName}`);
    
    const uploadTask = uploadBytesResumable(storageRef, audioBlob, { contentType: 'audio/webm' });

    uploadTask.on(
      'state_changed',
      (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
      (error) => setIsUploading(false),
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        await addDoc(collection(db, 'messages'), {
          text: `Voice Note (${recordingTime}s)`,
          fileUrl: downloadURL,
          storagePath: `secure_uploads/${fileName}`,
          senderId: currentUserData.id,
          senderName: sanitizeText(currentUserData.displayName),
          senderRole: currentUserData.role,
          type: 'audio',
          allowedUserIds: [],
          createdAt: serverTimestamp()
        });
        setIsUploading(false);
        setRecordingTime(0);
      }
    );
  };

  // 7. 訊息刪除與附件權限配給
  const handleDeleteMessage = async (msg) => {
    if (currentUserData?.role !== 'admin') return;
    if (!confirm("Permanently delete this message?")) return;

    try {
      if (msg.storagePath) {
        const fileRef = ref(storage, msg.storagePath);
        await deleteObject(fileRef).catch(err => console.warn(err));
      }
      await deleteDoc(doc(db, 'messages', msg.id));
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  const toggleUserAccessPermission = async (msgId, targetUserId, currentAllowedList = []) => {
    if (currentUserData?.role !== 'admin') return;
    let updatedList = [...currentAllowedList];
    if (updatedList.includes(targetUserId)) {
      updatedList = updatedList.filter(id => id !== targetUserId);
    } else {
      updatedList.push(targetUserId);
    }

    await updateDoc(doc(db, 'messages', msgId), { allowedUserIds: updatedList });
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const cleanText = sanitizeText(inputText).trim();
    if (!cleanText || !user || !currentUserData?.canChat) return;

    try {
      await addDoc(collection(db, 'messages'), {
        text: cleanText,
        senderId: currentUserData.id,
        senderName: sanitizeText(currentUserData.displayName),
        senderRole: currentUserData.role,
        type: 'text',
        createdAt: serverTimestamp()
      });
      setInputText('');
    } catch (error) {
      console.error("發送失敗:", error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user || !currentUserData?.canChat) return;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    
    if (!isImage && !isPdf) {
      alert('Security Policy: Only Images and PDFs allowed.');
      return;
    }

    setIsUploading(true);
    const cleanFileName = sanitizeText(file.name);
    const storagePath = `secure_uploads/${Date.now()}_${cleanFileName}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file, { contentType: file.type });

    uploadTask.on(
      'state_changed',
      (snapshot) => setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100),
      (error) => setIsUploading(false),
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        await addDoc(collection(db, 'messages'), {
          text: cleanFileName,
          fileUrl: downloadURL,
          storagePath: storagePath,
          senderId: currentUserData.id,
          senderName: sanitizeText(currentUserData.displayName),
          senderRole: currentUserData.role,
          type: isPdf ? 'pdf' : 'image',
          allowedUserIds: [],
          createdAt: serverTimestamp()
        });
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    );
  };

  const handleUpdateDisplayName = async (targetUserId) => {
    const cleanName = sanitizeText(newDisplayName).trim();
    if (!cleanName) return;
    await updateDoc(doc(db, 'users', targetUserId), { displayName: cleanName });
    setEditingUserId(null);
    setNewDisplayName('');
  };

  const toggleMute = async (memberId, currentStatus) => {
    if (currentUserData?.role !== 'admin') return;
    await updateDoc(doc(db, 'users', memberId), { canChat: !currentStatus });
  };

  // 登入門檻畫面 (h-[100dvh] 相容 iOS Viewport)
  if (!user || !currentUserData) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-fin-bg text-fin-text font-mono p-4">
        <div className="w-full max-w-md bg-fin-panel border border-fin-border rounded-lg p-6 space-y-6 shadow-xl">
          <div className="text-center space-y-2">
            <h1 className="text-xl font-bold text-fin-success tracking-widest flex items-center justify-center">
              <ShieldAlert className="mr-2 text-fin-success" size={24} /> SECURE_DESK_V2
            </h1>
            <p className="text-xs text-gray-500 uppercase">Enter Access Code to Unlock Node</p>
          </div>

          <form onSubmit={handleVerifyAccessCode} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 uppercase font-bold flex items-center">
                <Key size={12} className="mr-1 text-fin-primary" /> 8-Character Access Code:
              </label>
              <input 
                type="text" 
                maxLength={8}
                value={input8Code}
                onChange={(e) => setInput8Code(e.target.value.toUpperCase())}
                placeholder="ENTER CODE"
                className="w-full bg-fin-bg border border-fin-border rounded p-3 text-center text-lg font-bold tracking-widest text-fin-primary focus:outline-none focus:border-fin-primary uppercase"
              />
            </div>

            {authError && (
              <p className="text-xs text-fin-danger text-center font-bold">{authError}</p>
            )}

            <button 
              type="submit" 
              disabled={isAuthenticating || input8Code.length !== 8}
              className="w-full bg-fin-primary hover:bg-blue-600 text-white py-3 rounded flex items-center justify-center transition-colors disabled:opacity-50 font-bold text-sm"
            >
              {isAuthenticating ? <Loader2 size={18} className="animate-spin mr-2" /> : <LogIn size={18} className="mr-2" />}
              {isAuthenticating ? 'VERIFYING...' : 'CONNECT NODE'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isAdmin = currentUserData?.role === 'admin';

  const hasFileAccess = (msg) => {
    if (isAdmin) return true;
    if (msg.allowedUserIds && msg.allowedUserIds.includes(currentUserData.id)) return true;
    return false;
  };

  return (
    <div className="flex h-[100dvh] bg-fin-bg text-fin-text font-mono overflow-hidden">
      
      {/* 行動版 Top Bar */}
      <div className="md:hidden absolute top-0 w-full h-14 bg-fin-panel border-b border-fin-border flex items-center justify-between px-4 z-20">
        <span className="font-bold text-fin-success">SECURE_DESK</span>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="hover:text-fin-primary p-2">
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* 左側抽屜選單 */}
      <div className={`fixed md:relative z-30 w-80 h-[100dvh] bg-fin-panel border-r border-fin-border transition-transform duration-300 flex flex-col pt-14 md:pt-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-4 border-b border-fin-border hidden md:flex items-center justify-between">
          <div>
            <h1 className="font-bold text-fin-success truncate tracking-wider">PROJECT_ALPHA</h1>
            <p className="text-[10px] text-gray-500 mt-0.5 uppercase flex items-center">
              <ShieldAlert size={10} className="mr-1 text-fin-success" /> SECURE_NODE_ONLINE
            </p>
          </div>
          <button onClick={handleLogout} className="text-gray-500 hover:text-fin-danger p-1 transition-colors" title="Disconnect Node">
            <LogOut size={16} />
          </button>
        </div>

        {/* 管理員專屬區塊 */}
        {isAdmin && (
          <div className="p-4 border-b border-fin-border space-y-3 bg-fin-bg/40">
            <button 
              onClick={generateGlobalInviteLink} 
              className={`w-full border text-xs py-2 rounded flex items-center justify-center transition-all ${isCopied ? 'bg-fin-success text-white border-fin-success' : 'bg-transparent border-fin-border text-fin-success'}`}
            >
              <LinkIcon size={14} className="mr-2" /> {isCopied ? 'COPIED INVITE LINK!' : 'Generate Invite Link'}
            </button>

            <div className="text-[10px] font-bold text-fin-primary uppercase flex items-center pt-1">
              <UserPlus size={12} className="mr-1" /> Create User Access Code
            </div>
            
            <form onSubmit={handleCreateNewUserCode} className="space-y-2">
              <input 
                type="text" 
                value={newUserNameInput}
                onChange={(e) => setNewUserNameInput(e.target.value)}
                placeholder="Assign Name (e.g. Trader_Bob)"
                className="w-full bg-fin-bg border border-fin-border rounded p-2 text-xs text-white focus:outline-none focus:border-fin-primary"
              />
              <button 
                type="submit" 
                disabled={!newUserNameInput.trim()}
                className="w-full bg-fin-primary text-white text-xs py-2 rounded flex items-center justify-center disabled:opacity-50 hover:bg-blue-600 transition-colors font-bold"
              >
                Generate 8-Char Code
              </button>
            </form>

            {/* 即時發放代碼清單 */}
            {createdCodeList.length > 0 && (
              <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                <p className="text-[9px] text-gray-500 uppercase font-bold">Issued Active Codes ({createdCodeList.length}):</p>
                {createdCodeList.map(c => (
                  <div key={c.id} className="flex items-center justify-between bg-fin-bg p-1.5 rounded border border-fin-border/50 text-[10px]">
                    <span className="text-gray-300 font-bold truncate max-w-[100px]">{c.assignedName}</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(c.code);
                        alert(`Copied Access Code: ${c.code}`);
                      }}
                      className="flex items-center text-fin-success bg-fin-panel px-1.5 py-0.5 rounded border border-fin-border hover:border-fin-success"
                      title="Copy Access Code"
                    >
                      <span className="font-mono font-bold mr-1">{c.code}</span>
                      <Copy size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 成員列表 (自動隱藏舊重覆節點) */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="flex items-center justify-between text-[10px] text-gray-500 mb-3 uppercase font-bold">
            <span className="flex items-center"><Users size={12} className="mr-1" /> Active Nodes ({members.length})</span>
          </div>
          <ul className="space-y-2">
            {members.map(m => (
              <li key={m.id} className="flex flex-col text-sm p-2 bg-fin-bg/50 border border-fin-border/50 rounded group">
                <div className="flex justify-between items-center">
                  {editingUserId === m.id ? (
                    <div className="flex items-center space-x-1 w-full mr-2">
                      <input 
                        type="text" 
                        value={newDisplayName} 
                        onChange={(e) => setNewDisplayName(e.target.value)} 
                        className="bg-fin-bg border border-fin-primary text-xs px-1 py-0.5 rounded w-full text-white" 
                        placeholder="New Name" 
                      />
                      <button onClick={() => handleUpdateDisplayName(m.id)} className="text-[10px] bg-fin-primary text-white px-1 py-0.5 rounded">Save</button>
                    </div>
                  ) : (
                    <span className={`truncate text-xs ${m.role === 'admin' ? 'text-fin-primary font-bold' : 'text-gray-300'}`}>
                      {m.displayName} {m.id === currentUserData.id && <span className="text-gray-500 text-[9px]">(You)</span>}
                    </span>
                  )}

                  {(isAdmin || m.id === currentUserData.id) && editingUserId !== m.id && (
                    <button onClick={() => { setEditingUserId(m.id); setNewDisplayName(m.displayName); }} className="text-gray-500 hover:text-white ml-1">
                      <Edit2 size={12} />
                    </button>
                  )}
                </div>

                {isAdmin && (
                  <div className="mt-1.5 pt-1 border-t border-fin-border/20 text-[9px] text-gray-500 space-y-0.5">
                    <div className="flex items-center truncate">
                      <Globe size={10} className="mr-1 text-fin-success shrink-0" />
                      <span className="truncate">{m.location || 'Detecting Location...'}</span>
                    </div>
                    <div className="text-[8px] text-gray-600 pl-3">IP: {m.ip || '0.0.0.0'}</div>
                  </div>
                )}

                {isAdmin && m.id !== currentUserData.id && (
                  <div className="flex items-center justify-end space-x-1 mt-2 pt-1 border-t border-fin-border/30">
                    <button onClick={() => toggleMute(m.id, m.canChat)} className={`text-[9px] px-1.5 py-0.5 rounded ${m.canChat ? 'bg-fin-border text-gray-400' : 'bg-fin-danger text-white'}`}>
                      {m.canChat ? 'MUTE' : 'UNMUTE'}
                    </button>
                    <button onClick={() => handleKickUser(m.id)} className="text-[9px] px-1.5 py-0.5 rounded bg-fin-danger/80 hover:bg-fin-danger text-white flex items-center">
                      <UserX size={10} className="mr-0.5" /> KICK
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* 行動版選單底部登出按鈕 */}
        <div className="md:hidden p-4 border-t border-fin-border bg-fin-bg/80 pb-safe">
          <button 
            onClick={handleLogout} 
            className="w-full bg-fin-danger/20 hover:bg-fin-danger text-fin-danger hover:text-white border border-fin-danger/40 py-2.5 rounded flex items-center justify-center text-xs font-bold transition-colors"
          >
            <LogOut size={14} className="mr-2" /> DISCONNECT NODE (LOGOUT)
          </button>
        </div>
      </div>

      {/* 右側對話區域 */}
      <div className="flex-1 flex flex-col pt-14 md:pt-0 h-full w-full relative bg-fin-bg">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar pb-20 md:pb-6">
          {messages.map(msg => {
            const canAccess = hasFileAccess(msg);

            return (
              <div key={msg.id} className={`flex flex-col ${msg.senderId === currentUserData.id ? 'items-end' : 'items-start'}`}>
                <div className="max-w-[90%] md:max-w-[75%] flex flex-col group relative">
                  
                  <div className={`flex items-center space-x-2 mb-1 ${msg.senderId === currentUserData.id ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <span className={`text-xs font-bold ${msg.senderRole === 'admin' ? 'text-fin-primary' : 'text-fin-success'}`}>{msg.senderName}</span>
                    <span className="text-[10px] text-gray-600">{msg.createdAt?.toDate().toLocaleTimeString('en-US', { hour12: false }) || ''}</span>
                    
                    {isAdmin && (
                      <button 
                        onClick={() => handleDeleteMessage(msg)} 
                        className="text-gray-600 hover:text-fin-danger transition-colors opacity-0 group-hover:opacity-100 p-1"
                        title="Delete Message"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  
                  <div className={`p-3 rounded-lg border border-fin-border text-sm whitespace-pre-wrap break-words ${msg.senderId === currentUserData.id ? 'bg-fin-panel/80 rounded-tr-none' : 'bg-fin-panel rounded-tl-none'}`}>
                    {msg.type === 'text' && msg.text}
                    
                    {msg.type === 'image' && (
                      canAccess ? (
                        <a href={msg.fileUrl} target="_blank" rel="noreferrer">
                          <img src={msg.fileUrl} alt="attachment" className="max-w-full h-auto max-h-64 rounded border border-fin-border" />
                        </a>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-6 border border-dashed border-fin-danger/50 bg-fin-bg/80 rounded text-center space-y-2">
                          <Lock size={24} className="text-fin-danger" />
                          <p className="text-xs text-fin-danger font-bold">[ACCESS DENIED]</p>
                          <p className="text-[10px] text-gray-500">Administrator clearance required to view image.</p>
                        </div>
                      )
                    )}

                    {msg.type === 'pdf' && (
                      canAccess ? (
                        <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="flex items-center space-x-2 text-fin-primary hover:underline">
                          <FileText size={20} className="text-fin-danger shrink-0" />
                          <span className="text-xs truncate">{msg.text}</span>
                        </a>
                      ) : (
                        <div className="flex items-center space-x-2 text-gray-500">
                          <Lock size={16} className="text-fin-danger shrink-0" />
                          <span className="text-xs italic">[RESTRICTED PDF FILE]</span>
                        </div>
                      )
                    )}

                    {msg.type === 'audio' && (
                      <div className="flex items-center space-x-3 min-w-[220px]">
                        <Volume2 size={20} className="text-fin-success animate-pulse shrink-0" />
                        <audio controls src={msg.fileUrl} className="h-8 w-full max-w-[200px]" />
                      </div>
                    )}
                  </div>

                  {isAdmin && (msg.type === 'image' || msg.type === 'pdf') && (
                    <div className="mt-1 flex items-center justify-end">
                      <button 
                        onClick={() => setManagingAccessMsgId(managingAccessMsgId === msg.id ? null : msg.id)}
                        className="text-[10px] text-gray-500 hover:text-fin-primary flex items-center space-x-1"
                      >
                        <Lock size={10} />
                        <span>Manage Clearance ({msg.allowedUserIds?.length || 0})</span>
                      </button>
                    </div>
                  )}

                  {isAdmin && managingAccessMsgId === msg.id && (
                    <div className="mt-2 p-3 bg-fin-panel border border-fin-primary/40 rounded text-xs space-y-2">
                      <p className="font-bold text-fin-primary text-[10px] uppercase">Grant Download Clearance:</p>
                      <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
                        {members.filter(m => m.role !== 'admin').map(m => {
                          const isAllowed = msg.allowedUserIds?.includes(m.id);
                          return (
                            <button
                              key={m.id}
                              onClick={() => toggleUserAccessPermission(msg.id, m.id, msg.allowedUserIds)}
                              className="flex items-center justify-between w-full text-left p-1 hover:bg-fin-bg rounded"
                            >
                              <span className="text-gray-300 text-[11px]">{m.displayName}</span>
                              {isAllowed ? <CheckSquare size={14} className="text-fin-success" /> : <Square size={14} className="text-gray-600" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {isUploading && (
          <div className="w-full bg-fin-panel h-1">
            <div className="bg-fin-primary h-1 transition-all" style={{ width: `${uploadProgress}%` }} />
          </div>
        )}

        {/* 輸入工具列 */}
        <div className="p-2 md:p-4 bg-fin-panel border-t border-fin-border pb-safe sticky bottom-0 z-20">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-1.5 md:space-x-2 max-w-5xl mx-auto">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,application/pdf" className="hidden" />
            
            {!isRecording && (
              <>
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={!currentUserData?.canChat || isUploading} className="p-2.5 md:p-3 bg-fin-bg rounded border border-fin-border text-gray-400 hover:text-fin-primary disabled:opacity-50 shrink-0">
                  {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
                </button>

                <button type="button" onClick={toggleSpeechToText} disabled={!currentUserData?.canChat} className={`p-2.5 md:p-3 bg-fin-bg rounded border shrink-0 ${isListening ? 'border-fin-danger text-fin-danger animate-pulse' : 'border-fin-border text-gray-400 hover:text-fin-primary'}`}>
                  <Mic size={18} />
                </button>

                <button type="button" onClick={startRecording} disabled={!currentUserData?.canChat} className="p-2.5 md:p-3 bg-fin-bg border border-fin-border text-gray-400 hover:text-fin-primary rounded transition-colors shrink-0">
                  <Volume2 size={18} />
                </button>
              </>
            )}

            {isRecording ? (
              <div className="flex-1 bg-fin-bg border border-fin-danger rounded px-3 py-1.5 flex items-center justify-between min-h-[44px] space-x-2">
                <button type="button" onClick={cancelRecording} className="text-gray-400 hover:text-fin-danger transition-colors p-1" title="Cancel Recording">
                  <Trash2 size={16} />
                </button>
                
                <canvas ref={canvasRef} width="160" height="26" className="flex-1 h-full rounded" />

                <span className="font-mono text-xs text-fin-danger font-bold shrink-0">{recordingTime}s</span>

                <button type="button" onClick={stopAndSendRecording} className="p-1.5 bg-fin-success text-white rounded hover:opacity-90 transition-opacity shrink-0" title="Send Voice Note">
                  <Send size={14} />
                </button>
              </div>
            ) : (
              <textarea 
                value={inputText} 
                onChange={(e) => setInputText(e.target.value)} 
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }} 
                disabled={!currentUserData?.canChat || isUploading} 
                className="flex-1 min-w-0 bg-fin-bg border border-fin-border rounded p-2.5 text-xs md:text-sm text-fin-text focus:outline-none focus:border-fin-primary resize-none min-h-[44px] max-h-[100px] custom-scrollbar disabled:opacity-50" 
                placeholder={currentUserData?.canChat ? "INPUT STREAM..." : "CONNECTION_MUTED"} 
                rows={1}
              />
            )}
            
            {!isRecording && (
              <button type="submit" disabled={!currentUserData?.canChat || !inputText.trim() || isUploading} className="p-2.5 md:p-3 bg-fin-primary text-white rounded hover:bg-blue-600 shrink-0 disabled:opacity-50 flex items-center justify-center min-w-[44px]">
                <Send size={18} />
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
