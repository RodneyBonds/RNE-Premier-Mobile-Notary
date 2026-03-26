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
    
    try {
      const sessionRef = await addDoc(collection(db, 'chatSessions'), {
        ...formData,
        status: 'active',
        createdAt: serverTimestamp()
      });
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
      handleFirestoreError(error, OperationType.CREATE, 'chatSessions');
    }
  };

  const sendMessage = async (text) => {
    try {
      await addDoc(collection(db, 'chatSessions', sessionId, 'messages'), {
        senderId: 'visitor',
        senderName: formData.name,
        text: text,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chatSessions/' + sessionId + '/messages');
    }
  };

  if (!isAdminOnline) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-accent-gold p-4 rounded-full shadow-lg hover:scale-110 transition-transform"
      >
        <MessageCircle className="w-8 h-8 text-[#050B14]" />
      </button>

      {isOpen && (
        <div className="absolute bottom-20 right-0 w-80 bg-[#0A111E] border border-accent-gold/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-96">
          <div className="p-4 bg-accent-gold text-[#050B14] font-bold flex justify-between items-center">
            <span>RNE Premier Chat</span>
            <X onClick={() => setIsOpen(false)} className="cursor-pointer" />
          </div>
          
          {!chatStarted ? (
            <form onSubmit={startChat} className="p-4 space-y-3">
              <input type="text" placeholder="Name" required className="w-full p-2 rounded bg-white/10 text-white" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input type="email" placeholder="Email" required className="w-full p-2 rounded bg-white/10 text-white" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              <input type="tel" placeholder="Phone" required className="w-full p-2 rounded bg-white/10 text-white" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              <textarea placeholder="Message" required className="w-full p-2 rounded bg-white/10 text-white" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
              <button type="submit" className="w-full bg-accent-gold py-2 rounded font-bold">Start Chat</button>
            </form>
          ) : (
            <div className="flex-1 p-4 overflow-y-auto space-y-2">
              {messages.map(msg => (
                <div key={msg.id} className={msg.senderId === 'visitor' ? 'text-right' : 'text-left'}>
                  <span className={`inline-block p-2 rounded text-sm ${msg.senderId === 'visitor' ? 'bg-accent-gold text-[#050B14]' : 'bg-white/10 text-white'}`}>{msg.text}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
              <div className="flex gap-2 mt-2">
                <input type="text" id="chatInput" className="flex-1 p-2 rounded bg-white/10 text-white" onKeyDown={e => { if(e.key === 'Enter') { sendMessage(e.target.value); e.target.value = ''; } }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
