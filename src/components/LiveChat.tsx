import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, User, Mail, CheckCircle2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { useChat } from '../context/ChatContext';

export default function LiveChat() {
  const { isOpen, setIsOpen, formData: contextFormData } = useChat();
  const [isAdminOnline, setIsAdminOnline] = useState(false);
  const [messages, setMessages] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [chatStarted, setChatStarted] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [emailSent, setEmailSent] = useState(false);
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

  const startChat = async (e) => {
    e.preventDefault();
    if (!isAdminOnline) return;
    
    try {
      const sessionRef = await addDoc(collection(db, 'chatSessions'), {
        ...formData,
        status: 'active',
        createdAt: serverTimestamp()
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
        if (currentStatus !== 'spam') {
          await updateDoc(sessionRef, {
            status: 'active',
            updatedAt: serverTimestamp(),
            hasUnreadMessages: true
          });
          console.log(`[SIMULATION] Email Notification: New message received from ${formData.name}`);
          
          setTimeout(async () => {
            const checkSnap = await getDoc(sessionRef);
            if (checkSnap.exists() && checkSnap.data().hasUnreadMessages) {
              console.log(`[SIMULATION] Follow-up Email Notification: Unanswered message from ${formData.name}`);
            }
          }, 60000);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chatSessions/' + sessionId + '/messages');
    }
  };

  const requestEmailContinuation = async () => {
    if (!sessionId) return;
    try {
      // Simulate sending email by updating session status
      await updateDoc(doc(db, 'chatSessions', sessionId), {
        emailRequested: true,
        status: 'email_transferred'
      });
      
      // Add a system message
      await addDoc(collection(db, 'chatSessions', sessionId, 'messages'), {
        senderId: 'system',
        senderName: 'System',
        text: 'A copy of this conversation has been sent to your email. We will continue our conversation there.',
        timestamp: serverTimestamp()
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
      {isOpen && (
        <div className="mb-4 w-[calc(100vw-2rem)] sm:w-[380px] h-[500px] max-h-[calc(100vh-8rem)] bg-[var(--color-bg-card)]/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-[var(--color-accent-gold)]/30">
          {/* Header */}
          <div className="bg-gradient-to-r from-[var(--color-accent-navy-light)] to-[var(--color-bg-dark)] p-4 flex justify-between items-center shadow-md z-10 border-b border-[var(--color-accent-gold)]/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--color-accent-gold)]/20 flex items-center justify-center relative border border-[var(--color-accent-gold)]/50">
                <User className="w-6 h-6 text-[var(--color-accent-gold)]" />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-[var(--color-bg-card)] rounded-full"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-white font-bold text-lg leading-tight">Live Support</span>
                <span className="text-[var(--color-accent-gold)]/80 text-xs font-medium">We typically reply in minutes</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
            <div className="flex-1 overflow-y-auto bg-[var(--color-bg-dark)]/50">
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
                    className="w-full bg-[var(--color-accent-navy-light)]/50 border border-[var(--color-accent-gold)]/30 rounded-lg p-3 text-white outline-none focus:border-[var(--color-accent-gold)] focus:ring-1 focus:ring-[var(--color-accent-gold)] transition-all placeholder-gray-500" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
                  <input 
                    type="email" 
                    required 
                    className="w-full bg-[var(--color-accent-navy-light)]/50 border border-[var(--color-accent-gold)]/30 rounded-lg p-3 text-white outline-none focus:border-[var(--color-accent-gold)] focus:ring-1 focus:ring-[var(--color-accent-gold)] transition-all placeholder-gray-500" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                  />
                </div>
                
                <button type="submit" className="w-full bg-gradient-to-r from-[var(--color-accent-gold)] to-[var(--color-accent-gold-dark)] hover:from-[var(--color-accent-gold-light)] hover:to-[var(--color-accent-gold)] text-[var(--color-bg-dark)] font-bold py-3 rounded-lg transition-all mt-2 shadow-[0_0_10px_rgba(212,175,55,0.2)]">
                  Start Chat
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col h-full bg-[var(--color-bg-dark)]/50">
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 text-sm mt-4">
                    Send a message to start the conversation.
                  </div>
                )}
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.senderId === 'visitor' ? 'justify-end' : msg.senderId === 'system' ? 'justify-center' : 'justify-start'}`}>
                    {msg.senderId === 'system' ? (
                      <div className="bg-[var(--color-accent-navy-light)]/60 text-[var(--color-accent-gold)] text-xs py-2 px-4 rounded-full border border-[var(--color-accent-gold)]/20 text-center max-w-[90%]">
                        {msg.text}
                      </div>
                    ) : (
                      <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
                        msg.senderId === 'visitor' 
                          ? 'bg-gradient-to-br from-[var(--color-accent-gold)] to-[var(--color-accent-gold-dark)] text-[var(--color-bg-dark)] rounded-tr-sm font-medium' 
                          : 'bg-[var(--color-accent-navy-light)] text-white border border-[var(--color-accent-gold)]/20 rounded-tl-sm'
                      }`}>
                        {msg.senderId === 'admin' && (
                          <div className="text-[10px] font-bold text-[var(--color-accent-gold)] mb-1">
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
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 bg-[var(--color-bg-card)] border-t border-[var(--color-accent-gold)]/20">
                <div className="relative flex items-center">
                  <input 
                    type="text" 
                    id="chatInput" 
                    className="w-full bg-[var(--color-accent-navy-light)]/50 border border-[var(--color-accent-gold)]/30 rounded-full py-3 pl-4 pr-12 text-white text-sm outline-none focus:border-[var(--color-accent-gold)] focus:ring-1 focus:ring-[var(--color-accent-gold)] transition-all placeholder-gray-500" 
                    placeholder="Type your message..."
                    onKeyDown={e => { 
                      if(e.key === 'Enter' && e.currentTarget.value.trim()) { 
                        sendMessage(e.currentTarget.value); 
                        e.currentTarget.value = ''; 
                      } 
                    }} 
                  />
                  <button 
                    onClick={() => {
                      const input = document.getElementById('chatInput') as HTMLInputElement;
                      if(input.value.trim()) { 
                        sendMessage(input.value); 
                        input.value = ''; 
                      }
                    }}
                    className="absolute right-2 bg-gradient-to-r from-[var(--color-accent-gold)] to-[var(--color-accent-gold-dark)] p-2 rounded-full text-[var(--color-bg-dark)] hover:scale-105 transition-transform shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gradient-to-r from-[var(--color-accent-gold)] to-[var(--color-accent-gold-dark)] p-4 rounded-full shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:shadow-[0_0_25px_rgba(212,175,55,0.5)] hover:scale-105 transition-all duration-300 border border-[var(--color-accent-gold-light)]/50"
      >
        {isOpen ? <X className="w-7 h-7 text-[var(--color-bg-dark)]" /> : <MessageCircle className="w-7 h-7 text-[var(--color-bg-dark)]" />}
      </button>
    </div>
  );
}
