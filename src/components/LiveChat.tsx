import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { useChat } from '../context/ChatContext';

export default function LiveChat() {
  const { isOpen, setIsOpen, formData: contextFormData } = useChat();
  const [isAdminOnline, setIsAdminOnline] = useState(false);
  const [messages, setMessages] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [chatStarted, setChatStarted] = useState(false);
  const [sessionId, setSessionId] = useState(null);
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

  const startChat = async (e) => {
    e.preventDefault();
    if (!isAdminOnline) return;
    
    console.log('Starting chat with formData:', formData);
    try {
      const sessionRef = await addDoc(collection(db, 'chatSessions'), {
        ...formData,
        status: 'active',
        createdAt: serverTimestamp()
      });
      console.log('Chat session created:', sessionRef.id);
      setSessionId(sessionRef.id);
      setChatStarted(true);
      
      // Send first message
      await addDoc(collection(db, 'chatSessions', sessionRef.id, 'messages'), {
        senderId: 'visitor',
        senderName: formData.name,
        text: formData.message,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error starting chat:', error);
      handleFirestoreError(error, OperationType.CREATE, 'chatSessions');
    }
  };

  const sendMessage = async (text) => {
    console.log('Sending message to sessionId:', sessionId, 'text:', text);
    if (!sessionId) {
      console.error('No sessionId found for message');
      return;
    }
    try {
      await addDoc(collection(db, 'chatSessions', sessionId, 'messages'), {
        senderId: 'visitor',
        senderName: formData.name,
        text: text,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending message:', error);
      handleFirestoreError(error, OperationType.CREATE, 'chatSessions/' + sessionId + '/messages');
    }
  };

  if (!isAdminOnline) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#D4AF37] p-4 rounded-full shadow-lg hover:scale-110 transition-transform"
      >
        <MessageCircle className="w-8 h-8 text-[#050B14]" />
      </button>

      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[350px] max-w-[90vw] bg-[#111111] border border-[#D4AF37]/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 bg-[#111111] border-b border-[#D4AF37]/20 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-white font-bold">Live Chat</span>
            </div>
            <X onClick={() => setIsOpen(false)} className="cursor-pointer text-white hover:text-[#D4AF37]" />
          </div>
          
          {!chatStarted ? (
            <form onSubmit={startChat} className="p-6 space-y-4 flex-1 flex flex-col justify-center">
              <h3 className="text-white text-xl font-bold text-center mb-2">Welcome!</h3>
              <p className="text-white/60 text-center text-sm mb-4">Please enter your details to start chatting with us.</p>
              <input type="text" placeholder="Your Name" required className="w-full p-3 rounded-xl bg-[#1A1A1A] text-white border border-white/10 focus:border-[#D4AF37] outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input type="email" placeholder="Your Email" required className="w-full p-3 rounded-xl bg-[#1A1A1A] text-white border border-white/10 focus:border-[#D4AF37] outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              <textarea placeholder="Message" required className="w-full p-3 rounded-xl bg-[#1A1A1A] text-white border border-white/10 focus:border-[#D4AF37] outline-none h-24" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
              <button type="submit" className="w-full bg-[#D4AF37] text-[#111111] py-3 rounded-xl font-bold hover:bg-[#B8962D] transition-colors">Start Chat</button>
            </form>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.senderId === 'visitor' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.senderId === 'visitor' ? 'bg-[#D4AF37] text-[#111111] rounded-br-none' : 'bg-[#1A1A1A] text-white rounded-bl-none'}`}>
                      {msg.text}
                      <div className="text-[10px] opacity-50 mt-1">{msg.timestamp?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 bg-[#111111] border-t border-[#D4AF37]/20 flex gap-2">
                <input 
                  type="text" 
                  id="chatInput" 
                  className="flex-1 p-3 rounded-xl bg-[#1A1A1A] text-white border border-white/10 focus:border-[#D4AF37] outline-none" 
                  placeholder="Type your message..."
                  onKeyDown={e => { if(e.key === 'Enter' && e.target.value.trim()) { sendMessage(e.target.value); e.target.value = ''; } }} 
                />
                <button 
                  onClick={() => {
                    const input = document.getElementById('chatInput') as HTMLInputElement;
                    if(input.value.trim()) { sendMessage(input.value); input.value = ''; }
                  }}
                  className="bg-[#D4AF37] p-3 rounded-xl text-[#111111] hover:bg-[#B8962D] transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
