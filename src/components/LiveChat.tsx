import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, User, Mail, CheckCircle2, Loader2, Phone } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, getDoc, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { useChat } from '../context/ChatContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function LiveChat() {
  const { isOpen, setIsOpen, formData: contextFormData } = useChat();
  const [isAdminOnline, setIsAdminOnline] = useState(false);
  const [messages, setMessages] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [chatStarted, setChatStarted] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [emailSent, setEmailSent] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [phoneRequested, setPhoneRequested] = useState(false);
  const [visitorPhone, setVisitorPhone] = useState('');
  const [tempPhone, setTempPhone] = useState('');
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const savedSessionId = localStorage.getItem('chatSessionId');
    if (savedSessionId) {
      setSessionId(savedSessionId);
      setChatStarted(true);
    }
  }, []);

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem('chatSessionId', sessionId);
    } else {
      localStorage.removeItem('chatSessionId');
    }
  }, [sessionId]);

  useEffect(() => {
    if (contextFormData.name) setFormData(contextFormData);
  }, [contextFormData]);

  useEffect(() => {
    // Check admin status
    const adminRef = doc(db, 'adminStatus', 'global');
    const unsubAdmin = onSnapshot(adminRef, (doc) => {
      if (doc.exists()) {
        setIsAdminOnline(doc.data().isOnline);
      }
    });
    return () => unsubAdmin();
  }, []);

  const resetChat = () => {
    setSessionId(null);
    setChatStarted(false);
    setMessages([]);
    setPhoneRequested(false);
    setVisitorPhone('');
    localStorage.removeItem('chatSessionId');
  };

  useEffect(() => {
    if (sessionId) {
      const sessionRef = doc(db, 'chatSessions', sessionId);
      const unsubSession = onSnapshot(sessionRef, (docSnap) => {
        if (!docSnap.exists()) {
          resetChat();
        } else {
          const data = docSnap.data();
          if (data.status === 'deleted' || data.status === 'spam') {
            resetChat();
          } else {
            setPhoneRequested(data.phoneRequested || false);
            setVisitorPhone(data.phone || '');
            setHasUnreadMessages(data.hasUnreadMessages || false);
          }
        }
      });
      return () => unsubSession();
    }
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) {
      const messagesRef = collection(db, 'chatSessions', sessionId, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'asc'));
      const unsubMessages = onSnapshot(q, (snapshot) => {
        setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubMessages();
    }
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const submitPhone = async (e) => {
    e.preventDefault();
    if (!tempPhone.trim() || !sessionId) return;
    
    try {
      await updateDoc(doc(db, 'chatSessions', sessionId), {
        phone: tempPhone,
        phoneRequested: false
      });
      await addDoc(collection(db, 'chatSessions', sessionId, 'messages'), {
        senderId: 'visitor',
        senderName: formData.name || 'Visitor',
        text: `Provided phone number: ${tempPhone}`,
        timestamp: serverTimestamp()
      });
      setVisitorPhone(tempPhone);
      setPhoneRequested(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'chatSessions/' + sessionId);
    }
  };

  const startChat = async (e) => {
    e.preventDefault();
    if (!isAdminOnline) return;
    
    setIsStartingChat(true);
    try {
      const sessionRef = await addDoc(collection(db, 'chatSessions'), {
        ...formData,
        status: 'active',
        createdAt: serverTimestamp(),
        lastNotificationAt: serverTimestamp()
      });
      setSessionId(sessionRef.id);
      setChatStarted(true);
      
      // Send first message
      if (formData.message) {
        await addDoc(collection(db, 'chatSessions', sessionRef.id, 'messages'), {
          senderId: 'visitor',
          senderName: formData.name,
          text: formData.message,
          timestamp: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chatSessions');
    } finally {
      setIsStartingChat(false);
    }
  };

  const sendMessage = async (text) => {
    if (!sessionId) return;
    try {
      await addDoc(collection(db, 'chatSessions', sessionId, 'messages'), {
        senderId: 'visitor',
        senderName: formData.name,
        text: text,
        timestamp: serverTimestamp()
      });

      const sessionRef = doc(db, 'chatSessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        const currentStatus = sessionSnap.data().status;
        const sessionData = sessionSnap.data();
        const visitorName = sessionData.name || formData.name;
        const visitorEmail = sessionData.email || formData.email;

        if (currentStatus !== 'spam') {
          await updateDoc(sessionRef, {
            status: 'active',
            updatedAt: serverTimestamp(),
            hasUnreadMessages: true
          });
          
          // Always send a notification immediately when a new message is received
          fetch('/api/notify-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: visitorName,
              email: visitorEmail,
              message: text,
              type: 'new'
            })
          }).catch(e => console.error('Failed to send notification', e));
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chatSessions/' + sessionId + '/messages');
    }
  };

  const requestEmailContinuation = async () => {
    if (!sessionId) return;
    try {
      // Add a system message
      await addDoc(collection(db, 'chatSessions', sessionId, 'messages'), {
        senderId: 'system',
        senderName: 'System',
        text: 'A copy of this conversation has been sent to your email. We will continue our conversation there.',
        timestamp: serverTimestamp()
      });

      // Fetch session data to get user details
      const sessionRef = doc(db, 'chatSessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);
      let sessionData = formData;
      if (sessionSnap.exists()) {
        const data = sessionSnap.data();
        sessionData = {
          name: data.name || formData.name,
          email: data.email || formData.email,
          phone: data.phone || formData.phone,
          message: ''
        };
      }

      // Fetch all messages to send
      const messagesRef = collection(db, 'chatSessions', sessionId, 'messages');
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
          name: sessionData.name,
          email: sessionData.email,
          phone: sessionData.phone,
          messages: allMessages
        })
      });

      if (!response.ok) {
        console.error('Failed to send transcript via API');
      }

      // Update session status
      await updateDoc(doc(db, 'chatSessions', sessionId), {
        emailRequested: true,
        status: 'email_transferred',
        transcriptSentAt: serverTimestamp()
      });
      
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'chatSessions/' + sessionId);
    }
  };

  if (!isAdminOnline) return null;

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 font-sans flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mb-4 w-[calc(100vw-2rem)] sm:w-[380px] h-[500px] max-h-[calc(100vh-8rem)] glass-panel rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-[var(--color-accent-gold)]/30"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[var(--color-accent-navy-light)]/80 to-[var(--color-bg-dark)]/80 backdrop-blur-md p-4 flex justify-between items-center shadow-md z-10 border-b border-[var(--color-accent-gold)]/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-accent-gold)]/5 to-transparent opacity-50"></div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-full bg-[var(--color-accent-gold)]/20 flex items-center justify-center relative border border-[var(--color-accent-gold)]/50 shadow-[0_0_10px_rgba(212,175,55,0.2)]">
                  <User className="w-6 h-6 text-[var(--color-accent-gold)]" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-[var(--color-bg-card)] rounded-full shadow-[0_0_5px_rgba(74,222,128,0.5)]"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-white font-bold text-lg leading-tight">Live Support</span>
                  <span className="text-[var(--color-accent-gold)]/80 text-xs font-medium">We typically reply in minutes</span>
                </div>
              </div>
              <div className="flex items-center gap-2 relative z-10">
                {chatStarted && (
                  <button 
                    onClick={requestEmailContinuation} 
                    title="Continue in Email"
                    className="text-[var(--color-accent-gold)]/80 hover:text-[var(--color-accent-gold)] transition-colors p-1"
                  >
                    {emailSent ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Mail className="w-5 h-5" />}
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition-colors p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {!chatStarted ? (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-1 overflow-y-auto bg-[var(--color-bg-dark)]/30 backdrop-blur-sm"
              >
                <form onSubmit={startChat} className="p-6 flex flex-col gap-4">
                  <div className="text-center mb-2">
                    <h3 className="text-white text-xl font-bold mb-1">Welcome!</h3>
                    <p className="text-gray-400 text-sm">Please fill in the form below to start chatting with us.</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full glass-input rounded-lg p-3 text-white outline-none transition-all placeholder-gray-500" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
                    <input 
                      type="email" 
                      required 
                      className="w-full glass-input rounded-lg p-3 text-white outline-none transition-all placeholder-gray-500" 
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})} 
                    />
                  </div>
                  
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit" 
                    disabled={isStartingChat}
                    className="w-full bg-gradient-to-r from-[var(--color-accent-gold)] to-[var(--color-accent-gold-dark)] hover:from-[var(--color-accent-gold-light)] hover:to-[var(--color-accent-gold)] text-[var(--color-bg-dark)] font-bold py-3 rounded-lg transition-all mt-2 shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:shadow-[0_0_25px_rgba(212,175,55,0.5)] relative overflow-hidden group disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isStartingChat ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        'Start Chat'
                      )}
                    </span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                  </motion.button>
                </form>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col h-full bg-[var(--color-bg-dark)]/30 backdrop-blur-sm"
              >
                <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar relative">
                  {phoneRequested && !visitorPhone && (
                    <div className="absolute inset-0 z-20 bg-[var(--color-bg-dark)]/90 backdrop-blur-md flex flex-col items-center justify-center p-6">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        className="glass-panel p-6 rounded-2xl w-full max-w-sm text-center border border-[var(--color-accent-gold)]/30 shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                      >
                        <div className="w-12 h-12 bg-[var(--color-accent-gold)]/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--color-accent-gold)]/50">
                          <Phone className="w-6 h-6 text-[var(--color-accent-gold)]" />
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2">Phone Number Required</h3>
                        <p className="text-gray-400 text-sm mb-6">Our agent has requested your phone number to continue providing support.</p>
                        <form onSubmit={submitPhone} className="flex flex-col gap-3">
                          <input 
                            type="tel" 
                            required 
                            placeholder="Enter your phone number"
                            className="w-full glass-input rounded-lg p-3 text-white outline-none text-center placeholder-gray-500"
                            value={tempPhone}
                            onChange={(e) => setTempPhone(e.target.value)}
                          />
                          <button 
                            type="submit"
                            className="w-full bg-gradient-to-r from-[var(--color-accent-gold)] to-[var(--color-accent-gold-dark)] text-[var(--color-bg-dark)] font-bold py-3 rounded-lg hover:scale-105 transition-transform shadow-[0_0_15px_rgba(212,175,55,0.3)]"
                          >
                            Submit & Continue
                          </button>
                        </form>
                      </motion.div>
                    </div>
                  )}
                  {messages.length === 0 && (
                    <div className="text-center text-gray-500 text-sm mt-4">
                      Send a message to start the conversation.
                    </div>
                  )}
                  <AnimatePresence>
                    {messages.map((msg: any) => (
                      <motion.div 
                        key={msg.id} 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={`flex ${msg.senderId === 'visitor' ? 'justify-end' : msg.senderId === 'system' ? 'justify-center' : 'justify-start'}`}
                      >
                        {msg.senderId === 'system' ? (
                          <div className="bg-[var(--color-accent-navy-light)]/40 backdrop-blur-md text-[var(--color-accent-gold)] text-xs py-2 px-4 rounded-full border border-[var(--color-accent-gold)]/20 text-center max-w-[90%] shadow-sm">
                            {msg.text}
                          </div>
                        ) : (
                          <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-md backdrop-blur-md ${
                            msg.senderId === 'visitor' 
                              ? 'bg-gradient-to-br from-[var(--color-accent-gold)] to-[var(--color-accent-gold-dark)] text-[var(--color-bg-dark)] rounded-tr-sm font-medium shadow-[0_4px_15px_rgba(212,175,55,0.2)]' 
                              : 'bg-[var(--color-accent-navy-light)]/80 text-white border border-[var(--color-accent-gold)]/20 rounded-tl-sm shadow-[0_4px_15px_rgba(0,0,0,0.2)]'
                          }`}>
                            {msg.senderId === 'admin' && (
                              <div className="text-[10px] font-bold text-[var(--color-accent-gold)] mb-1 uppercase tracking-wider">
                                {msg.senderName || 'Admin'}
                              </div>
                            )}
                            {msg.text}
                            <div className={`text-[10px] mt-1 text-right ${
                              msg.senderId === 'visitor' ? 'text-[var(--color-bg-dark)]/70' : 'text-gray-400'
                            }`}>
                              {msg.timestamp?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
                <div className="p-4 bg-[var(--color-bg-card)]/80 backdrop-blur-md border-t border-[var(--color-accent-gold)]/20">
                  <div className="relative flex items-center">
                    <input 
                      type="text" 
                      id="chatInput" 
                      disabled={phoneRequested && !visitorPhone}
                      className="w-full glass-input rounded-full py-3 pl-4 pr-12 text-white text-sm outline-none transition-all placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed" 
                      placeholder={phoneRequested && !visitorPhone ? "Please provide phone number..." : "Type your message..."}
                      onKeyDown={e => { 
                        if(e.key === 'Enter' && e.currentTarget.value.trim() && !(phoneRequested && !visitorPhone)) { 
                          sendMessage(e.currentTarget.value); 
                          e.currentTarget.value = ''; 
                        } 
                      }} 
                    />
                    <button 
                      onClick={() => {
                        const input = document.getElementById('chatInput') as HTMLInputElement;
                        if(input && input.value.trim() && !(phoneRequested && !visitorPhone)) { 
                          sendMessage(input.value); 
                          input.value = ''; 
                        }
                      }}
                      disabled={phoneRequested && !visitorPhone}
                      className="absolute right-2 bg-gradient-to-r from-[var(--color-accent-gold)] to-[var(--color-accent-gold-dark)] p-2 rounded-full text-[var(--color-bg-dark)] hover:scale-105 transition-transform shadow-[0_0_10px_rgba(212,175,55,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gradient-to-r from-[var(--color-accent-gold)] to-[var(--color-accent-gold-dark)] p-4 rounded-full shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] transition-shadow duration-300 border border-[var(--color-accent-gold-light)]/50 z-50 relative group"
      >
        {/* Pulse effect behind button */}
        {!isOpen && (
          <>
            <div className="absolute inset-0 rounded-full bg-[var(--color-accent-gold)] animate-ping opacity-30"></div>
            <div className="absolute inset-[-4px] rounded-full bg-gradient-to-r from-[var(--color-accent-gold)] to-[var(--color-accent-gold-dark)] opacity-20 group-hover:opacity-40 transition-opacity duration-300 blur-sm"></div>
          </>
        )}
        
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <X className="w-7 h-7 text-[var(--color-bg-dark)] relative z-10" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <MessageCircle className="w-7 h-7 text-[var(--color-bg-dark)] relative z-10" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
