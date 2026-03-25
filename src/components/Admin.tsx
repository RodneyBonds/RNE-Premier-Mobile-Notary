import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogIn, 
  LogOut, 
  Mail, 
  Phone, 
  User, 
  Clock, 
  CheckCircle2, 
  Circle, 
  Reply, 
  Trash2,
  ChevronRight,
  ShieldCheck,
  Lock,
  AlertCircle
} from 'lucide-react';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword,
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  getDoc,
  arrayUnion,
  Timestamp
} from 'firebase/firestore';
import { format } from 'date-fns';

interface Reply {
  text: string;
  createdAt: any;
}

interface Message {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  createdAt: any;
  status: 'unread' | 'read' | 'replied';
  replies?: Reply[];
}

export default function Admin() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  
  // Reply state
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  
  // Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Check if user is admin
        const userDocRef = doc(db, 'users', currentUser.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists() && userDoc.data().role === 'admin') {
            setIsAdmin(true);
          } else if (currentUser.email?.toLowerCase() === 'rodbonds1169@gmail.com') {
            // Fallback for the primary admin
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch (e) {
          // If we can't read the user doc, check if it's the hardcoded admin
          if (currentUser.email?.toLowerCase() === 'rodbonds1169@gmail.com') {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Message[];
        setMessages(msgs);
      }, (error) => {
        console.error("Firestore error:", error);
      });
      return () => unsubscribe();
    }
  }, [isAdmin]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setLoginError('Invalid email or password.');
      } else if (error.code === 'auth/too-many-requests') {
        setLoginError('Too many failed attempts. Please try again later.');
      } else {
        setLoginError('An error occurred. Please try again.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMessage || !replyText.trim()) return;
    
    setIsSendingReply(true);
    try {
      const reply = {
        text: replyText.trim(),
        createdAt: Timestamp.now()
      };
      
      await updateDoc(doc(db, 'messages', selectedMessage.id), {
        replies: arrayUnion(reply),
        status: 'replied'
      });
      
      setReplyText('');
    } catch (error) {
      console.error('Send reply error:', error);
    } finally {
      setIsSendingReply(false);
    }
  };

  const updateStatus = async (id: string, status: Message['status']) => {
    try {
      await updateDoc(doc(db, 'messages', id), { status });
    } catch (error) {
      console.error('Update status error:', error);
    }
  };

  const deleteMessage = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        await deleteDoc(doc(db, 'messages', id));
        if (selectedMessage?.id === id) setSelectedMessage(null);
      } catch (error) {
        console.error('Delete message error:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050B14] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#050B14] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white/[0.02] border border-white/10 p-8 md:p-12 rounded-[2rem] backdrop-blur-xl"
        >
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-accent-gold/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-10 h-10 text-accent-gold" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Login</h1>
            <p className="text-white/40 text-sm">
              Enter your credentials to access the dashboard
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:border-accent-gold outline-none transition-all"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-white/40 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:border-accent-gold outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {loginError && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-4 rounded-xl border border-red-400/20"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {loginError}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-accent-gold hover:bg-accent-gold-dark text-[#050B14] font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-accent-gold/20 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <div className="w-5 h-5 border-2 border-[#050B14] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {!isAdmin && user && (
            <div className="mt-8 text-center">
              <p className="text-red-400 text-sm mb-4">
                Access denied. Your account is not authorized.
              </p>
              <button onClick={handleLogout} className="text-white/40 hover:text-white text-sm underline">
                Sign out and try another account
              </button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050B14] text-white flex flex-col">
      {/* Header */}
      <header className="border-bottom border-white/10 bg-white/[0.02] backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-accent-gold rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-[#050B14]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Admin Dashboard</h1>
              <p className="text-xs text-white/40">RNE Premier Mobile Notary</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-medium">{user.displayName}</span>
              <span className="text-xs text-white/40">{user.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-all border border-white/10"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 flex flex-col lg:flex-row gap-8">
        {/* Sidebar - Message List */}
        <div className="w-full lg:w-[400px] flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold flex items-center gap-2">
              Messages
              <span className="bg-accent-gold/20 text-accent-gold text-xs px-2 py-0.5 rounded-full">
                {messages.length}
              </span>
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar max-h-[calc(100vh-250px)]">
            {messages.length === 0 ? (
              <div className="text-center py-20 bg-white/[0.01] border border-dashed border-white/10 rounded-2xl">
                <Mail className="w-10 h-10 text-white/10 mx-auto mb-4" />
                <p className="text-white/40">No messages yet</p>
              </div>
            ) : (
              messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  layoutId={msg.id}
                  onClick={() => {
                    setSelectedMessage(msg);
                    if (msg.status === 'unread') updateStatus(msg.id, 'read');
                  }}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden ${
                    selectedMessage?.id === msg.id
                      ? 'bg-accent-gold/10 border-accent-gold/30 shadow-[0_0_20px_rgba(212,175,55,0.1)]'
                      : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-white/20'
                  }`}
                >
                  {msg.status === 'unread' && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-accent-gold"></div>
                  )}
                  
                  <div className="flex justify-between items-start mb-2">
                    <h3 className={`font-bold truncate pr-4 ${msg.status === 'unread' ? 'text-white' : 'text-white/70'}`}>
                      {msg.name}
                    </h3>
                    <span className="text-[10px] text-white/30 whitespace-nowrap">
                      {msg.createdAt ? format(msg.createdAt.toDate(), 'MMM d, h:mm a') : '...'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-white/50 line-clamp-2 mb-3">
                    {msg.message}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {msg.status === 'unread' && <Circle className="w-2 h-2 fill-accent-gold text-accent-gold" />}
                      {msg.status === 'read' && <CheckCircle2 className="w-3 h-3 text-white/30" />}
                      {msg.status === 'replied' && <Reply className="w-3 h-3 text-blue-400" />}
                      <span className="text-[10px] uppercase tracking-wider text-white/30">
                        {msg.status}
                      </span>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform ${selectedMessage?.id === msg.id ? 'translate-x-1 text-accent-gold' : 'text-white/20 group-hover:translate-x-1'}`} />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Content Area - Message Detail */}
        <div className="flex-1 min-h-[500px]">
          <AnimatePresence mode="wait">
            {selectedMessage ? (
              <motion.div
                key={selectedMessage.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-8 md:p-12 h-full flex flex-col"
              >
                <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-12">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-accent-gold/20 rounded-2xl flex items-center justify-center text-accent-gold text-2xl font-bold">
                      {selectedMessage.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold mb-1">{selectedMessage.name}</h2>
                      <div className="flex flex-wrap gap-4 text-white/50 text-sm">
                        <a href={`mailto:${selectedMessage.email}`} className="flex items-center gap-2 hover:text-accent-gold transition-colors">
                          <Mail className="w-4 h-4" />
                          {selectedMessage.email}
                        </a>
                        <a href={`tel:${selectedMessage.phone}`} className="flex items-center gap-2 hover:text-accent-gold transition-colors">
                          <Phone className="w-4 h-4" />
                          {selectedMessage.phone}
                        </a>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {selectedMessage.createdAt ? format(selectedMessage.createdAt.toDate(), 'MMMM d, yyyy p') : '...'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => deleteMessage(selectedMessage.id)}
                      className="p-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all border border-red-500/20"
                      title="Delete Message"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 bg-white/[0.01] border border-white/10 rounded-2xl p-8 mb-8 overflow-y-auto custom-scrollbar flex flex-col gap-8">
                  <div>
                    <h4 className="text-xs uppercase tracking-widest text-white/30 mb-4 font-bold">Message Content</h4>
                    <p className="text-lg leading-relaxed text-white/80 whitespace-pre-wrap">
                      {selectedMessage.message}
                    </p>
                  </div>

                  {selectedMessage.replies && selectedMessage.replies.length > 0 && (
                    <div className="space-y-6 pt-8 border-t border-white/5">
                      <h4 className="text-xs uppercase tracking-widest text-white/30 font-bold">Replies</h4>
                      {selectedMessage.replies.map((reply, idx) => (
                        <div key={idx} className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-5 ml-8 relative">
                          <div className="absolute -left-4 top-6 w-4 h-[1px] bg-blue-500/20"></div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Admin Reply</span>
                            <span className="text-[10px] text-white/20">
                              {reply.createdAt ? format(reply.createdAt.toDate(), 'MMM d, h:mm a') : '...'}
                            </span>
                          </div>
                          <p className="text-white/70 whitespace-pre-wrap">{reply.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form onSubmit={handleSendReply} className="space-y-4">
                  <div className="relative">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply here..."
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white focus:border-accent-gold outline-none transition-all resize-none placeholder:text-white/20"
                    />
                    <button
                      type="submit"
                      disabled={isSendingReply || !replyText.trim()}
                      className="absolute bottom-4 right-4 bg-accent-gold hover:bg-accent-gold-dark text-[#050B14] p-3 rounded-xl transition-all shadow-lg shadow-accent-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSendingReply ? (
                        <div className="w-5 h-5 border-2 border-[#050B14] border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Reply className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-4">
                    <a
                      href={`mailto:${selectedMessage.email}?subject=Re: Contact Form Submission - RNE Premier`}
                      onClick={() => updateStatus(selectedMessage.id, 'replied')}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 border border-white/10"
                    >
                      <Mail className="w-5 h-5" />
                      Open in Email Client
                    </a>
                    <div className="flex gap-2">
                      {selectedMessage.status !== 'replied' && (
                        <button
                          type="button"
                          onClick={() => updateStatus(selectedMessage.id, 'replied')}
                          className="px-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm font-medium"
                        >
                          Mark as Replied
                        </button>
                      )}
                      {selectedMessage.status === 'replied' && (
                        <button
                          type="button"
                          onClick={() => updateStatus(selectedMessage.id, 'read')}
                          className="px-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm font-medium"
                        >
                          Mark as Read
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </motion.div>
            ) : (
              <div className="h-full bg-white/[0.01] border border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center text-center p-12">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8">
                  <Mail className="w-10 h-10 text-white/20" />
                </div>
                <h3 className="text-2xl font-bold mb-2">No Message Selected</h3>
                <p className="text-white/40 max-w-xs">
                  Select a message from the list on the left to view details and reply.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
