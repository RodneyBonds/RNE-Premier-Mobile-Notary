import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, doc, setDoc, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { MessageCircle, Power, Send } from 'lucide-react';

export default function AdminPanel() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdminOnline, setIsAdminOnline] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');

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
        senderName: 'Admin',
        text: reply,
        timestamp: serverTimestamp()
      });
      setReply('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chatSessions/' + selectedSession.id + '/messages');
    }
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

  if (!isLoggedIn) {
    return (
      <div className="p-10 bg-[#050B14] min-h-screen text-white flex items-center justify-center">
        <form onSubmit={login} className="max-w-sm w-full space-y-4 bg-[#0A111E] p-8 rounded-3xl border border-white/10">
          <h2 className="text-2xl font-bold text-center">Admin Login</h2>
          <input type="text" placeholder="Username" className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white" />
          <input type="password" placeholder="Password" className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white" />
          <button type="submit" className="w-full bg-accent-gold p-3 rounded-xl text-[#050B14] font-bold">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-10 bg-[#050B14] min-h-screen text-white">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <label className="relative inline-flex items-center cursor-pointer">
          <input 
            type="checkbox" 
            className="sr-only peer" 
            checked={isAdminOnline} 
            onChange={toggleStatus} 
          />
          <div className="w-14 h-7 bg-red-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
          <span className="ml-3 text-sm font-bold text-white">Admin is {isAdminOnline ? 'Online' : 'Offline'}</span>
        </label>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-[#0A111E] p-6 rounded-3xl border border-white/10">
          <h2 className="text-xl font-bold mb-4">Chat Sessions</h2>
          <div className="space-y-2">
            {sessions.map(session => (
              <button 
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className={`w-full text-left p-4 rounded-xl ${selectedSession?.id === session.id ? 'bg-accent-gold/20' : 'bg-white/5'}`}
              >
                <div className="font-bold">{session.name}</div>
                <div className="text-sm text-white/60">{session.email}</div>
              </button>
            ))}
          </div>
        </div>
        
        <div className="lg:col-span-2 bg-[#0A111E] p-6 rounded-3xl border border-white/10 flex flex-col h-[600px]">
          {selectedSession ? (
            <>
              <h2 className="text-xl font-bold mb-4">Chat with {selectedSession.name}</h2>
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {messages.map(msg => (
                  <div key={msg.id} className={msg.senderId === 'admin' ? 'text-right' : 'text-left'}>
                    <div className={`inline-block p-3 rounded-2xl ${msg.senderId === 'admin' ? 'bg-accent-gold text-[#050B14]' : 'bg-white/10'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={reply} 
                  onChange={e => setReply(e.target.value)}
                  className="flex-1 p-3 rounded-xl bg-white/5 border border-white/10 text-white"
                  placeholder="Type a reply..."
                  onKeyDown={e => { if(e.key === 'Enter') sendReply(); }}
                />
                <button onClick={sendReply} className="bg-accent-gold p-3 rounded-xl text-[#050B14]"><Send /></button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/40">Select a session to chat</div>
          )}
        </div>
      </div>
    </div>
  );
}
