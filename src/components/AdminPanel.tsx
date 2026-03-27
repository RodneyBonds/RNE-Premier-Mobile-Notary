import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, doc, setDoc, onSnapshot, query, orderBy, addDoc, serverTimestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { MessageCircle, Power, Send, User, Clock, CheckCircle2, Trash2, Mail, Settings, Shield } from 'lucide-react';

export default function AdminPanel() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdminOnline, setIsAdminOnline] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [adminName, setAdminName] = useState('Support Agent');
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('Active'); // 'Active', 'Ongoing', 'Done', 'Cancelled', 'Spam'
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void} | null>(null);
  const messagesEndRef = useRef(null);
  const TABS = ['Active', 'Ongoing', 'Done', 'Cancelled', 'Spam'];

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
    
    return () => { unsubAdmin(); unsubSessions(); };
  }, [isLoggedIn]);

  useEffect(() => {
    if (selectedSession) {
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
      if (newStatus === 'ongoing') statusMessage = 'Conversation marked as ongoing.';
      if (newStatus === 'done') statusMessage = 'Conversation marked as done.';
      if (newStatus === 'cancelled') statusMessage = 'Conversation cancelled.';
      if (newStatus === 'spam') statusMessage = 'Conversation marked as spam.';

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

  const confirmSendEmailTranscript = (session) => {
    setConfirmModal({
      isOpen: true,
      title: 'Send Transcript',
      message: `Send chat transcript to ${session.email}?`,
      onConfirm: async () => {
        try {
          // In a real app, this would trigger a Cloud Function to send the email
          await updateDoc(doc(db, 'chatSessions', session.id), {
            transcriptSent: true,
            transcriptSentAt: serverTimestamp()
          });
          
          // Add a system message to the chat
          await addDoc(collection(db, 'chatSessions', session.id, 'messages'), {
            senderId: 'system',
            senderName: 'System',
            text: `Transcript sent to ${session.email}`,
            timestamp: serverTimestamp()
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
    return true;
  });

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-dark)] flex items-center justify-center p-4 font-sans relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--color-accent-gold)]/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--color-accent-navy-light)]/30 rounded-full blur-[120px] pointer-events-none"></div>
        
        <form onSubmit={login} className="max-w-md w-full bg-[var(--color-bg-card)]/80 backdrop-blur-xl p-8 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-[var(--color-accent-gold)]/20 relative z-10">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-[var(--color-accent-gold)] to-[var(--color-accent-gold-dark)] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.3)]">
              <Shield className="w-8 h-8 text-[var(--color-bg-dark)]" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-white mb-8">Admin Portal</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input type="text" placeholder="admin@example.com" className="w-full p-3 rounded-xl bg-[var(--color-accent-navy-light)]/50 border border-[var(--color-accent-gold)]/30 text-white outline-none focus:border-[var(--color-accent-gold)] focus:ring-1 focus:ring-[var(--color-accent-gold)] transition-all placeholder-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <input type="password" placeholder="••••••••" className="w-full p-3 rounded-xl bg-[var(--color-accent-navy-light)]/50 border border-[var(--color-accent-gold)]/30 text-white outline-none focus:border-[var(--color-accent-gold)] focus:ring-1 focus:ring-[var(--color-accent-gold)] transition-all placeholder-gray-500" />
            </div>
            <button type="submit" className="w-full bg-gradient-to-r from-[var(--color-accent-gold)] to-[var(--color-accent-gold-dark)] hover:from-[var(--color-accent-gold-light)] hover:to-[var(--color-accent-gold)] p-3 rounded-xl text-[var(--color-bg-dark)] font-bold transition-all mt-6 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              Secure Login
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-dark)] font-sans text-white relative">
      {/* Background Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[200px] bg-[var(--color-accent-gold)]/5 rounded-full blur-[100px] pointer-events-none"></div>
      
      {/* Header */}
      <header className="bg-[var(--color-bg-card)]/80 backdrop-blur-md shadow-md border-b border-[var(--color-accent-gold)]/20 px-4 sm:px-6 py-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--color-accent-gold)] to-[var(--color-accent-gold-dark)] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.3)]">
              <Shield className="w-6 h-6 text-[var(--color-bg-dark)]" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Command Center</h1>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6">
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
      </header>
      
      <main className="max-w-7xl mx-auto p-4 sm:p-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[calc(100vh-140px)]">
          
          {/* Sessions List */}
          <div className="lg:col-span-1 h-[400px] lg:h-full bg-[var(--color-bg-card)]/60 backdrop-blur-md rounded-2xl shadow-xl border border-[var(--color-accent-gold)]/20 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[var(--color-accent-gold)]/20 bg-[var(--color-accent-navy-light)]/30 flex justify-between items-center">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--color-accent-gold)]" />
                Conversations
                <span className="bg-[var(--color-accent-gold)]/20 text-[var(--color-accent-gold)] py-0.5 px-2.5 rounded-full text-xs border border-[var(--color-accent-gold)]/30">{filteredSessions.length}</span>
              </h2>
            </div>
            <div className="flex overflow-x-auto border-b border-[var(--color-accent-gold)]/20 bg-[var(--color-bg-dark)]/40 custom-scrollbar">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 min-w-[80px] py-2.5 px-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                    activeTab === tab 
                      ? 'border-[var(--color-accent-gold)] text-[var(--color-accent-gold)] bg-[var(--color-accent-gold)]/5' 
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-white/5'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-2 custom-scrollbar">
              {filteredSessions.map(session => (
                <button 
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                    selectedSession?.id === session.id 
                      ? 'bg-[var(--color-accent-navy-light)] border-l-4 border-[var(--color-accent-gold)] shadow-md' 
                      : 'bg-[var(--color-bg-dark)]/50 hover:bg-[var(--color-accent-navy-light)]/50 border-l-4 border-transparent'
                  }`}
                >
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
                </button>
              ))}
              {filteredSessions.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4 p-8">
                  <div className="w-16 h-16 rounded-full bg-[var(--color-accent-navy-light)]/50 flex items-center justify-center border border-[var(--color-accent-gold)]/10">
                    <CheckCircle2 className="w-8 h-8 text-[var(--color-accent-gold)]/50" />
                  </div>
                  <p className="text-sm text-center">No {activeTab.toLowerCase()} communications.</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Chat Area */}
          <div className="lg:col-span-2 h-[500px] lg:h-full bg-[var(--color-bg-card)]/60 backdrop-blur-md rounded-2xl shadow-xl border border-[var(--color-accent-gold)]/20 flex flex-col overflow-hidden relative">
            {selectedSession ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-[var(--color-accent-gold)]/20 bg-[var(--color-accent-navy-light)]/30 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--color-accent-gold)] to-[var(--color-accent-gold-dark)] flex items-center justify-center text-[var(--color-bg-dark)] font-bold text-xl shadow-[0_0_10px_rgba(212,175,55,0.3)]">
                      {selectedSession.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-bold text-white text-lg leading-tight">{selectedSession.name}</h2>
                      <div className="text-sm text-[var(--color-accent-gold)]/80">{selectedSession.email} • {selectedSession.phone}</div>
                    </div>
                  </div>
                  
                  {/* Admin Controls */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
                    <div className="relative">
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

                    <div className="w-px h-6 bg-[var(--color-accent-gold)]/20 mx-1"></div>
                    
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
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[var(--color-bg-dark)]/40 custom-scrollbar">
                  {messages.length === 0 && (
                    <div className="text-center text-gray-500 text-sm mt-4">
                      Communication channel open. Waiting for messages.
                    </div>
                  )}
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.senderId === 'admin' ? 'justify-end' : msg.senderId === 'system' ? 'justify-center' : 'justify-start'}`}>
                      {msg.senderId === 'system' ? (
                        <div className="bg-[var(--color-accent-navy-light)]/60 text-[var(--color-accent-gold)] text-xs py-2 px-4 rounded-full border border-[var(--color-accent-gold)]/20 text-center max-w-[80%] shadow-sm">
                          {msg.text}
                        </div>
                      ) : (
                        <div className={`max-w-[75%] p-4 rounded-2xl text-sm shadow-md ${
                          msg.senderId === 'admin' 
                            ? 'bg-gradient-to-br from-[var(--color-accent-navy-light)] to-[var(--color-bg-card)] text-white rounded-tr-sm border border-[var(--color-accent-gold)]/30' 
                            : 'bg-gradient-to-br from-[var(--color-accent-gold)] to-[var(--color-accent-gold-dark)] text-[var(--color-bg-dark)] rounded-tl-sm font-medium'
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
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Input Area */}
                <div className="p-4 border-t border-[var(--color-accent-gold)]/20 bg-[var(--color-accent-navy-light)]/30">
                  <div className="relative flex items-center">
                    <input 
                      type="text" 
                      value={reply} 
                      onChange={e => setReply(e.target.value)}
                      className="w-full bg-[var(--color-bg-dark)]/80 border border-[var(--color-accent-gold)]/30 rounded-full py-3 pl-5 pr-14 text-white text-sm outline-none focus:border-[var(--color-accent-gold)] focus:ring-1 focus:ring-[var(--color-accent-gold)] transition-all shadow-inner placeholder-gray-500"
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
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-[var(--color-bg-dark)]/30">
                <div className="w-24 h-24 bg-[var(--color-accent-navy-light)]/50 rounded-full flex items-center justify-center mb-6 border border-[var(--color-accent-gold)]/10 shadow-inner">
                  <MessageCircle className="w-12 h-12 text-[var(--color-accent-gold)]/50" />
                </div>
                <p className="text-xl font-medium text-white mb-2">Select a Communication Channel</p>
                <p className="text-sm text-gray-400">Choose an active session from the sidebar to begin.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Custom Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-accent-gold)]/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">{confirmModal.title}</h3>
            <p className="text-gray-300 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmModal(null)} className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">Cancel</button>
              <button onClick={confirmModal.onConfirm} className="px-4 py-2 rounded-lg bg-gradient-to-r from-[var(--color-accent-gold)] to-[var(--color-accent-gold-dark)] text-[var(--color-bg-dark)] font-bold hover:scale-105 transition-transform">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
