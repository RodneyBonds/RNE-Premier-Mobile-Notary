import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, doc, setDoc, onSnapshot, query, orderBy, addDoc, serverTimestamp, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { MessageCircle, Power, Send, User, Clock, CheckCircle2, Trash2, Mail, Settings, Shield, Phone, Pin, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminPanel() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdminOnline, setIsAdminOnline] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [adminName, setAdminName] = useState('Support Agent');
  const [showSettings, setShowSettings] = useState(false);
  const [showInquiriesModal, setShowInquiriesModal] = useState(false);
  const [activeTab, setActiveTab] = useState('Active'); // 'Active', 'Ongoing', 'Done', 'Cancelled', 'Spam'
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void} | null>(null);
  const [pinnedNotes, setPinnedNotes] = useState('');
  const [isPinnedOpen, setIsPinnedOpen] = useState(true);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const TABS = ['Active', 'Ongoing', 'Done', 'Cancelled', 'Spam'];

  const handleTyping = async () => {
    if (!selectedSession) return;
    try {
      await updateDoc(doc(db, 'chatSessions', selectedSession.id), { adminTyping: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(async () => {
        await updateDoc(doc(db, 'chatSessions', selectedSession.id), { adminTyping: false });
      }, 2000);
    } catch (e) {
      console.error('Error updating typing status', e);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'inquiries', id), { status });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const updateNotes = async (id: string, notes: string) => {
    try {
      await updateDoc(doc(db, 'inquiries', id), { notes });
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    const adminRef = doc(db, 'adminStatus', 'global');
    const unsubAdmin = onSnapshot(adminRef, (doc) => {
      if (doc.exists()) setIsAdminOnline(doc.data().isOnline);
    });
    
    const sessionsRef = collection(db, 'chatSessions');
    const q = query(sessionsRef, orderBy('createdAt', 'desc'));
    const unsubSessions = onSnapshot(q, (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const inquiriesRef = collection(db, 'inquiries');
    const qInquiries = query(inquiriesRef, orderBy('createdAt', 'desc'));
    const unsubInquiries = onSnapshot(qInquiries, (snapshot) => {
      setInquiries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    return () => { unsubAdmin(); unsubSessions(); unsubInquiries(); };
  }, [isLoggedIn]);

  useEffect(() => {
    if (selectedSession) {
      setPinnedNotes(selectedSession.notes || '');
      const messagesRef = collection(db, 'chatSessions', selectedSession.id, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'asc'));
      const unsubMessages = onSnapshot(q, (snapshot) => {
        setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubMessages();
    }
  }, [selectedSession]);

  useEffect(() => {
    if (selectedSession && selectedSession.hasUnreadMessages) {
      updateDoc(doc(db, 'chatSessions', selectedSession.id), {
        hasUnreadMessages: false
      }).catch(e => console.error(e));
    }
  }, [selectedSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleStatus = async () => {
    try {
      await setDoc(doc(db, 'adminStatus', 'global'), { isOnline: !isAdminOnline }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'adminStatus/global');
    }
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedSession) return;
    try {
      await addDoc(collection(db, 'chatSessions', selectedSession.id, 'messages'), {
        senderId: 'admin',
        senderName: adminName,
        text: reply,
        timestamp: serverTimestamp()
      });
      await updateDoc(doc(db, 'chatSessions', selectedSession.id), {
        hasUnreadMessages: false,
        updatedAt: serverTimestamp()
      });
      setReply('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chatSessions/' + selectedSession.id + '/messages');
    }
  };

  const updateSessionStatus = async (sessionId, newStatus) => {
    try {
      await updateDoc(doc(db, 'chatSessions', sessionId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      // Add system message about status change
      let statusMessage = '';
      if (newStatus === 'done') statusMessage = "Session status changed to 'Done'.";
      else if (newStatus === 'cancelled') statusMessage = "Session status changed to 'Cancelled'.";
      else if (newStatus === 'spam') statusMessage = "Session status changed to 'Spam'.";

      if (statusMessage) {
        await addDoc(collection(db, 'chatSessions', sessionId, 'messages'), {
          senderId: 'system',
          senderName: 'System',
          text: statusMessage,
          timestamp: serverTimestamp()
        });
      }

    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'chatSessions/' + sessionId);
    }
  };

  const confirmEndSession = (sessionId) => {
    setConfirmModal({
      isOpen: true,
      title: 'End Session',
      message: 'Are you sure you want to end this chat session?',
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'chatSessions', sessionId), {
            status: 'ended',
            endedAt: serverTimestamp()
          });
          if (selectedSession?.id === sessionId) {
            setSelectedSession(null);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, 'chatSessions/' + sessionId);
        }
        setConfirmModal(null);
      }
    });
  };

  const confirmDeleteSession = (sessionId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Session',
      message: 'Are you sure you want to permanently delete this session and all its messages?',
      onConfirm: async () => {
        try {
          // Delete all messages in the subcollection first
          const messagesRef = collection(db, 'chatSessions', sessionId, 'messages');
          const messagesSnapshot = await getDocs(messagesRef);
          const deletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deletePromises);

          // Then delete the session document
          await deleteDoc(doc(db, 'chatSessions', sessionId));
          
          if (selectedSession?.id === sessionId) {
            setSelectedSession(null);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'chatSessions/' + sessionId);
        }
        setConfirmModal(null);
      }
    });
  };

  const requestPhone = async (sessionId) => {
    try {
      await updateDoc(doc(db, 'chatSessions', sessionId), {
        phoneRequested: true
      });
      await addDoc(collection(db, 'chatSessions', sessionId, 'messages'), {
        senderId: 'system',
        senderName: 'System',
        text: 'Phone number requested from visitor.',
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'chatSessions/' + sessionId);
    }
  };

  const saveNotes = async () => {
    if (!selectedSession) return;
    try {
      await updateDoc(doc(db, 'chatSessions', selectedSession.id), {
        notes: pinnedNotes
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'chatSessions/' + selectedSession.id);
    }
  };

  const confirmSendEmailTranscript = (session) => {
    setConfirmModal({
      isOpen: true,
      title: 'Send Transcript',
      message: `Send chat transcript to ${session.email}?`,
      onConfirm: async () => {
        try {
          // Add a system message to the chat
          await addDoc(collection(db, 'chatSessions', session.id, 'messages'), {
            senderId: 'system',
            senderName: 'System',
            text: `Transcript sent to ${session.email}`,
            timestamp: serverTimestamp()
          });

          // Fetch all messages to send
          const messagesRef = collection(db, 'chatSessions', session.id, 'messages');
          const q = query(messagesRef, orderBy('timestamp', 'asc'));
          const snapshot = await getDocs(q);
          const allMessages = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              ...data,
              timestamp: data.timestamp?.toMillis() || Date.now()
            };
          });

          // Call the API
          const response = await fetch('/api/send-transcript', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: session.name,
              email: session.email,
              phone: session.phone,
              messages: allMessages
            })
          });

          if (!response.ok) {
            console.error('Failed to send transcript via API');
          }

          await updateDoc(doc(db, 'chatSessions', session.id), {
            transcriptSent: true,
            transcriptSentAt: serverTimestamp()
          });
          
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, 'chatSessions/' + session.id);
        }
        setConfirmModal(null);
      }
    });
  };

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, 'adminrodney@rnepremiermobilenotary.com', 'passrodney');
      setIsLoggedIn(true);
    } catch (err) {
      alert('Login failed');
    }
  };

  const filteredSessions = sessions.filter(session => {
    const status = session.status || 'active';
    if (activeTab === 'Active') return ['active', 'email_transferred'].includes(status);
    if (activeTab === 'Ongoing') return status === 'ongoing';
    if (activeTab === 'Done') return status === 'done';
    if (activeTab === 'Cancelled') return status === 'cancelled';
    if (activeTab === 'Spam') return status === 'spam';
    return false;
  });

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-dark)] flex items-center justify-center p-4 font-sans relative overflow-hidden">
        {/* Animated Background Effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-[var(--color-accent-gold)]/10 rounded-full mix-blend-screen filter blur-[120px] animate-blob"></div>
          <div className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] bg-blue-500/10 rounded-full mix-blend-screen filter blur-[120px] animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-[-20%] left-[20%] w-[40vw] h-[40vw] bg-[var(--color-accent-navy-light)]/20 rounded-full mix-blend-screen filter blur-[120px] animate-blob animation-delay-4000"></div>
        </div>
        
        <motion.form 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          onSubmit={login} 
          className="max-w-md w-full glass-panel p-8 rounded-2xl relative z-10"
        >
          <div className="flex justify-center mb-6">
            <motion.div 
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
              className="w-16 h-16 bg-gradient-to-br from-[var(--color-accent-gold)] to-[var(--color-accent-gold-dark)] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.3)]"
            >
              <Shield className="w-8 h-8 text-[var(--color-bg-dark)]" />
            </motion.div>
          </div>
          <h2 className="text-2xl font-bold text-center text-white mb-8">Admin Portal</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input type="text" placeholder="admin@example.com" className="w-full p-3 rounded-xl glass-input text-white outline-none transition-all placeholder-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <input type="password" placeholder="••••••••" className="w-full p-3 rounded-xl glass-input text-white outline-none transition-all placeholder-gray-500" />
            </div>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit" 
              className="w-full bg-gradient-to-r from-[var(--color-accent-gold)] to-[var(--color-accent-gold-dark)] hover:from-[var(--color-accent-gold-light)] hover:to-[var(--color-accent-gold)] p-3 rounded-xl text-[var(--color-bg-dark)] font-bold transition-all mt-6 shadow-[0_0_15px_rgba(212,175,55,0.2)] relative overflow-hidden group"
            >
              <span className="relative z-10">Secure Login</span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
            </motion.button>
          </div>
        </motion.form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-dark)] font-sans text-white relative overflow-hidden">
      {/* Background Gradients / Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Animated Grid Overlay with Radial Mask */}
        <motion.div 
          className="absolute inset-0 opacity-[0.06]" 
          style={{ 
            backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', 
            backgroundSize: '4rem 4rem',
            maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, #000 20%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, #000 20%, transparent 100%)'
          }}
          animate={{
            backgroundPosition: ['0px 0px', '64px 64px']
          }}
          transition={{
            duration: 15,
            ease: "linear",
            repeat: Infinity
          }}
        />

        {/* Floating Particles */}
        {[...Array(25)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute rounded-full bg-[var(--color-accent-gold)]/40"
            style={{
              width: Math.random() * 4 + 1 + 'px',
              height: Math.random() * 4 + 1 + 'px',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -150 - Math.random() * 100],
              x: [0, (Math.random() - 0.5) * 100],
              opacity: [0, Math.random() * 0.5 + 0.3, 0],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 10
            }}
          />
        ))}

        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.1, 0.3, 0.1],
            x: [0, 150, -100, 0],
            y: [0, -150, 100, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[10%] left-[10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.4, 1],
            opacity: [0.1, 0.2, 0.1],
            x: [0, -150, 100, 0],
            y: [0, 150, -100, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[10%] right-[10%] w-[50%] h-[50%] bg-[var(--color-accent-gold)]/10 rounded-full blur-[150px] mix-blend-screen"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.3, 0.1],
            x: [0, 100, -150, 0],
            y: [0, 100, -150, 0]
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-[40%] left-[40%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] mix-blend-screen"
        />
      </div>
      
      {/* Header */}
      <motion.header 
        initial={{ y: -100 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 100 }}
        className="glass-panel border-b border-[var(--color-accent-gold)]/20 px-4 sm:px-6 py-4 sticky top-0 z-20"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--color-accent-gold)] to-[var(--color-accent-gold-dark)] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.3)]">
              <Shield className="w-6 h-6 text-[var(--color-bg-dark)]" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">RNE Premier Mobile Notary Support</h1>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6">
            <button 
              onClick={() => setShowInquiriesModal(true)}
              className="bg-[var(--color-accent-gold)] text-[var(--color-bg-dark)] px-4 py-2 rounded-full text-sm font-bold hover:scale-105 transition-transform"
            >
              Manage Inquiries
            </button>
            <div className="flex items-center gap-3 bg-[var(--color-accent-navy-light)]/50 px-4 py-2 rounded-full border border-[var(--color-accent-gold)]/20">
              <User className="w-4 h-4 text-[var(--color-accent-gold)]" />
              <input 
                type="text" 
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-white w-32 placeholder-gray-400"
                placeholder="Display Name"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full shadow-[0_0_8px_currentColor] ${isAdminOnline ? 'bg-green-400 text-green-400' : 'bg-gray-500 text-gray-500'}`}></span>
              <span className="text-sm font-medium text-gray-300">{isAdminOnline ? 'System Online' : 'System Offline'}</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={isAdminOnline} 
                onChange={toggleStatus} 
              />
              <div className="w-12 h-6 bg-[var(--color-accent-navy-light)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-accent-gold)] peer-checked:after:bg-white shadow-inner"></div>
            </label>
          </div>
        </div>
      </motion.header>
      
      <main className="max-w-[95%] mx-auto p-4 sm:p-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[calc(100vh-140px)]">
          
          {/* Sessions List */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            className="lg:col-span-1 h-[400px] lg:h-full glass-panel rounded-2xl flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-[var(--color-accent-gold)]/20 bg-[var(--color-accent-navy-light)]/20 flex justify-between items-center">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--color-accent-gold)]" />
                Conversations
                <span className="bg-[var(--color-accent-gold)]/20 text-[var(--color-accent-gold)] py-0.5 px-2.5 rounded-full text-xs border border-[var(--color-accent-gold)]/30">{filteredSessions.length}</span>
              </h2>
            </div>
            <div className="flex overflow-x-auto border-b border-[var(--color-accent-gold)]/20 bg-[var(--color-bg-dark)]/20 custom-scrollbar relative">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 min-w-[80px] py-3 px-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap relative ${
                    activeTab === tab 
                      ? 'text-[var(--color-accent-gold)]' 
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-accent-gold)] shadow-[0_0_8px_rgba(212,175,55,0.8)]"
                    />
                  )}
                </button>
              ))}
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-2 custom-scrollbar">
                <AnimatePresence>
                  {filteredSessions.map((session: any) => (
                    <motion.button 
                      layout
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                      key={session.id}
                      onClick={() => { setSelectedSession(session); }}
                      className={`w-full text-left p-4 rounded-xl transition-all duration-300 relative overflow-hidden ${
                        selectedSession?.id === session.id 
                          ? 'bg-[var(--color-accent-navy-light)]/80 shadow-[0_0_15px_rgba(212,175,55,0.15)]' 
                          : 'bg-[var(--color-bg-dark)]/30 hover:bg-[var(--color-accent-navy-light)]/40'
                      }`}
                    >
                      {selectedSession?.id === session.id && (
                        <motion.div 
                          layoutId="activeSessionBorder"
                          className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[var(--color-accent-gold-light)] to-[var(--color-accent-gold-dark)] shadow-[0_0_10px_rgba(212,175,55,0.8)]"
                        />
                      )}
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-white truncate pr-2 flex items-center gap-2">
                          {session.name}
                          {session.hasUnreadMessages && <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]" title="Unread messages"></div>}
                          {session.status === 'email_transferred' && <Mail className="w-3 h-3 text-[var(--color-accent-gold)]" />}
                        </div>
                        <div className="text-[10px] text-[var(--color-accent-gold)]/80 whitespace-nowrap bg-[var(--color-accent-gold)]/10 px-2 py-0.5 rounded">
                          {session.createdAt?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 truncate flex items-center gap-2">
                        <Mail className="w-3 h-3" />
                        {session.email}
                      </div>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          session.status === 'active' || session.status === 'ongoing' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                          session.status === 'done' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          session.status === 'cancelled' || session.status === 'spam' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          session.status === 'email_transferred' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                          'bg-gray-500/10 text-gray-400 border-gray-500/20'
                        }`}>
                          {session.status || 'active'}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              {filteredSessions.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4 p-8">
                  <div className="w-16 h-16 rounded-full bg-[var(--color-accent-navy-light)]/30 flex items-center justify-center border border-[var(--color-accent-gold)]/10">
                    <CheckCircle2 className="w-8 h-8 text-[var(--color-accent-gold)]/50" />
                  </div>
                  <p className="text-sm text-center">No {activeTab.toLowerCase()} communications.</p>
                </motion.div>
              )}
            </div>
          </motion.div>
          
          {/* Chat Area */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            className="lg:col-span-2 h-[500px] lg:h-full glass-panel rounded-2xl flex flex-row overflow-hidden relative"
          >
            {selectedSession ? (
              <>
                {/* Main Chat Section */}
                <div className="flex-1 flex flex-col h-full relative">
                  {/* Chat Header */}
                  <div className="p-4 border-b border-[var(--color-accent-gold)]/20 bg-[var(--color-accent-navy-light)]/20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--color-accent-gold)] to-[var(--color-accent-gold-dark)] flex items-center justify-center text-[var(--color-bg-dark)] font-bold text-xl shadow-[0_0_10px_rgba(212,175,55,0.3)]">
                        {selectedSession.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <h2 className="font-bold text-white text-lg leading-tight truncate">{selectedSession.name}</h2>
                        <div className="text-sm text-[var(--color-accent-gold)]/80 truncate">{selectedSession.email} • {selectedSession.phone}</div>
                      </div>
                    </div>
                    
                    {/* Admin Controls */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
                      <div className="relative hidden sm:block">
                        <select
                          value={selectedSession.status || 'active'}
                          onChange={(e) => updateSessionStatus(selectedSession.id, e.target.value)}
                          className={`appearance-none pl-3 pr-8 py-1.5 rounded-full text-xs font-bold border outline-none cursor-pointer transition-colors ${
                            ['active', 'ongoing'].includes(selectedSession.status || 'active') ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20' :
                            selectedSession.status === 'done' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20' :
                            selectedSession.status === 'email_transferred' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20' :
                            'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                          }`}
                        >
                          <option value="active" className="bg-[var(--color-bg-dark)] text-white">🟢 Active</option>
                          <option value="ongoing" className="bg-[var(--color-bg-dark)] text-white">🔵 Ongoing</option>
                          <option value="done" className="bg-[var(--color-bg-dark)] text-white">✓ Done</option>
                          <option value="cancelled" className="bg-[var(--color-bg-dark)] text-white">✕ Cancelled</option>
                          <option value="spam" className="bg-[var(--color-bg-dark)] text-white">⚠️ Spam</option>
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                          <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </div>

                      <div className="w-px h-6 bg-[var(--color-accent-gold)]/20 mx-1 hidden sm:block"></div>
                      
                      <button 
                        onClick={() => requestPhone(selectedSession.id)}
                        className="p-1.5 sm:p-2 text-gray-400 hover:text-[var(--color-accent-gold)] hover:bg-[var(--color-accent-gold)]/10 rounded-lg transition-colors"
                        title="Request Phone Number"
                      >
                        <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <button 
                        onClick={() => confirmSendEmailTranscript(selectedSession)}
                        className="p-1.5 sm:p-2 text-gray-400 hover:text-[var(--color-accent-gold)] hover:bg-[var(--color-accent-gold)]/10 rounded-lg transition-colors"
                        title="Send Transcript"
                      >
                        <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <button 
                        onClick={() => confirmDeleteSession(selectedSession.id)}
                        className="p-1.5 sm:p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Delete Session"
                      >
                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[var(--color-bg-dark)]/20 custom-scrollbar">
                    {messages.length === 0 && (
                      <div className="text-center text-gray-500 text-sm mt-4">
                        Communication channel open. Waiting for messages.
                      </div>
                    )}
                    <AnimatePresence>
                    {messages.map((msg: any) => (
                      <motion.div 
                        key={msg.id} 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={`flex ${msg.senderId === 'admin' ? 'justify-end' : msg.senderId === 'system' ? 'justify-center' : 'justify-start'}`}
                      >
                        {msg.senderId === 'system' ? (
                          <div className="bg-[var(--color-accent-navy-light)]/40 backdrop-blur-md text-[var(--color-accent-gold)] text-xs py-2 px-4 rounded-full border border-[var(--color-accent-gold)]/20 text-center max-w-[80%] shadow-sm">
                            {msg.text}
                          </div>
                        ) : (
                          <div className={`max-w-[75%] p-4 rounded-2xl text-sm shadow-md backdrop-blur-md ${
                            msg.senderId === 'admin' 
                              ? 'bg-gradient-to-br from-[var(--color-accent-navy-light)]/90 to-[var(--color-bg-card)]/90 text-white rounded-tr-sm border border-[var(--color-accent-gold)]/30 shadow-[0_4px_15px_rgba(0,0,0,0.2)]' 
                              : 'bg-gradient-to-br from-[var(--color-accent-gold)] to-[var(--color-accent-gold-dark)] text-[var(--color-bg-dark)] rounded-tl-sm font-medium shadow-[0_4px_15px_rgba(212,175,55,0.2)]'
                          }`}>
                            {msg.senderId === 'admin' && (
                              <div className="text-[10px] font-bold text-[var(--color-accent-gold)] mb-1 uppercase tracking-wider">
                                {msg.senderName}
                              </div>
                            )}
                            {msg.text}
                            <div className={`text-[10px] mt-2 text-right ${
                              msg.senderId === 'admin' ? 'text-gray-400' : 'text-[var(--color-bg-dark)]/70'
                            }`}>
                              {msg.timestamp?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                    </AnimatePresence>
                    
                    {selectedSession?.visitorTyping && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex justify-start"
                      >
                        <div className="bg-gradient-to-br from-[var(--color-accent-gold)] to-[var(--color-accent-gold-dark)] text-[var(--color-bg-dark)] rounded-2xl rounded-tl-sm p-4 shadow-md backdrop-blur-md flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-[var(--color-bg-dark)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-1.5 h-1.5 bg-[var(--color-bg-dark)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-1.5 h-1.5 bg-[var(--color-bg-dark)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </motion.div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                  
                  {/* Input Area */}
                  <div className="p-4 border-t border-[var(--color-accent-gold)]/20 bg-[var(--color-accent-navy-light)]/20 backdrop-blur-md">
                    <div className="relative flex items-center">
                      <input 
                        type="text" 
                        value={reply} 
                        onChange={e => {
                          setReply(e.target.value);
                          handleTyping();
                        }}
                        className="w-full glass-input rounded-full py-3 pl-5 pr-14 text-white text-sm outline-none transition-all placeholder-gray-500"
                        placeholder={`Type your reply as ${adminName}...`}
                        onKeyDown={e => { if(e.key === 'Enter') sendReply(); }}
                      />
                      <button 
                        onClick={sendReply} 
                        disabled={!reply.trim()}
                        className="absolute right-2 bg-gradient-to-r from-[var(--color-accent-gold)] to-[var(--color-accent-gold-dark)] p-2 rounded-full text-[var(--color-bg-dark)] hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(212,175,55,0.3)]"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Pinned Info Area (Collapsible Right Sidebar) */}
                <div className={`h-full border-l border-[var(--color-accent-gold)]/20 flex flex-col transition-all duration-300 bg-[var(--color-bg-dark)]/40 ${isPinnedOpen ? 'w-64' : 'w-12'}`}>
                  <div 
                    className={`p-4 border-b border-[var(--color-accent-gold)]/20 bg-[var(--color-accent-navy-light)]/20 flex items-center cursor-pointer h-[81px] ${!isPinnedOpen ? 'justify-center' : 'justify-between'}`} 
                    onClick={() => setIsPinnedOpen(!isPinnedOpen)}
                  >
                    {isPinnedOpen ? (
                      <h2 className="font-bold text-white flex items-center gap-2 whitespace-nowrap">
                        <Pin className="w-4 h-4 text-[var(--color-accent-gold)]" />
                        Pinned Info
                      </h2>
                    ) : (
                      <Pin className="w-5 h-5 text-[var(--color-accent-gold)]" />
                    )}
                  </div>
                  {isPinnedOpen && (
                    <div className="flex-1 p-4 flex flex-col w-full overflow-hidden">
                      <p className="text-xs text-gray-400 mb-2">Save important details like address, phone, or specific requests here. Only visible to admins.</p>
                      <textarea
                        value={pinnedNotes}
                        onChange={(e) => setPinnedNotes(e.target.value)}
                        onBlur={saveNotes}
                        placeholder="Add notes here..."
                        className="flex-1 w-full glass-input rounded-xl p-3 text-white text-sm outline-none transition-all placeholder-gray-500 resize-none custom-scrollbar"
                      />
                      <div className="mt-3 flex justify-end">
                        <button 
                          onClick={saveNotes}
                          className="bg-gradient-to-r from-[var(--color-accent-gold)] to-[var(--color-accent-gold-dark)] text-[var(--color-bg-dark)] font-bold py-1.5 px-4 rounded-lg text-sm hover:scale-105 transition-transform shadow-[0_0_10px_rgba(212,175,55,0.3)]"
                        >
                          Save Notes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-[var(--color-bg-dark)]/10 w-full">
                <div className="w-24 h-24 bg-[var(--color-accent-navy-light)]/30 rounded-full flex items-center justify-center mb-6 border border-[var(--color-accent-gold)]/10 shadow-inner">
                  <MessageCircle className="w-12 h-12 text-[var(--color-accent-gold)]/50" />
                </div>
                <p className="text-xl font-medium text-white mb-2">Select a Communication Channel</p>
                <p className="text-sm text-gray-400">Choose an active session from the sidebar to begin.</p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>
      
      {/* Custom Confirmation Modal */}
      <AnimatePresence>
      {confirmModal && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            className="glass-panel rounded-2xl p-6 max-w-sm w-full"
          >
            <h3 className="text-xl font-bold text-white mb-2">{confirmModal.title}</h3>
            <p className="text-gray-300 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmModal(null)} className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">Cancel</button>
              <button onClick={confirmModal.onConfirm} className="px-4 py-2 rounded-lg bg-gradient-to-r from-[var(--color-accent-gold)] to-[var(--color-accent-gold-dark)] text-[var(--color-bg-dark)] font-bold hover:scale-105 transition-transform shadow-[0_0_15px_rgba(212,175,55,0.3)]">Confirm</button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Inquiries Modal */}
      <AnimatePresence>
        {showInquiriesModal && (
          <InquiriesModal onClose={() => setShowInquiriesModal(false)} updateStatus={updateStatus} updateNotes={updateNotes} />
        )}
      </AnimatePresence>
    </div>
  );
}

function InquiriesModal({ onClose, updateStatus, updateNotes }: { onClose: () => void, updateStatus: (id: string, status: string) => Promise<void>, updateNotes: (id: string, notes: string) => Promise<void> }) {
  const [inquiries, setInquiries] = useState([]);

  useEffect(() => {
    const inquiriesRef = collection(db, 'inquiries');
    const q = query(inquiriesRef, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setInquiries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="glass-panel rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] flex flex-col"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Manage Inquiries</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
        </div>
        <div className="overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {inquiries.map((inquiry: any) => {
            const statusColors: Record<string, string> = {
              'Started': 'border-orange-500/50',
              'Ongoing': 'border-yellow-500/50',
              'Done': 'border-green-500/50',
              'Cancelled': 'border-red-500/50'
            };
            const borderColor = statusColors[inquiry.status] || 'border-white/10';
            return (
              <div key={inquiry.id} className={`bg-[var(--color-bg-dark)]/50 p-4 rounded-xl border-l-4 ${borderColor}`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white">{inquiry.name}</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      inquiry.status === 'Started' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                      inquiry.status === 'Ongoing' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                      inquiry.status === 'Done' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {inquiry.status}
                    </span>
                  </div>
                  <select
                    value={inquiry.status}
                    onChange={(e) => updateStatus(inquiry.id, e.target.value)}
                    className="bg-[var(--color-bg-dark)] text-white text-xs p-2 rounded-lg border border-white/10 cursor-pointer hover:border-white/30 transition-colors"
                  >
                    <option value="Started">Started</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Done">Done</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <p className="mt-2 text-sm text-gray-300">{inquiry.message}</p>
                <div className="mt-4">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 font-semibold flex items-center gap-1">
                    <Pin className="w-2 h-2" />
                    Admin Notes:
                  </div>
                  <textarea
                    value={inquiry.notes || ''}
                    onChange={(e) => updateNotes(inquiry.id, e.target.value)}
                    placeholder="Add a short note about this client..."
                    className="w-full bg-[var(--color-bg-dark)]/50 text-white text-xs p-3 rounded-lg border border-white/10 hover:border-white/30 transition-colors resize-none focus:outline-none focus:border-[var(--color-accent-gold)]/50"
                    rows={2}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
