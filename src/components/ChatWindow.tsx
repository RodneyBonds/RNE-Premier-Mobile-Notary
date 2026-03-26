import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Mail, Clock, User, ShieldCheck, Loader2 } from 'lucide-react';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  Timestamp, 
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { io, Socket } from 'socket.io-client';
import { Minimize2, Maximize2 } from 'lucide-react';

interface ChatMessage {
  text: string;
  createdAt: any;
  sender: 'admin' | 'visitor';
}

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  visitorInfo: {
    name: string;
    email: string;
    phone: string;
    message?: string;
  };
}

export default function ChatWindow({ isOpen: initialIsOpen, onClose, visitorInfo: initialVisitorInfo }: ChatWindowProps) {
  const [isOpen, setIsOpen] = useState(initialIsOpen);
  const [visitorInfo, setVisitorInfo] = useState(initialVisitorInfo);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isAdminOnline, setIsAdminOnline] = useState(false);
  const [showPreChatForm, setShowPreChatForm] = useState(false);
  const [lastReadCount, setLastReadCount] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Update lastReadCount when window is open and not minimized
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setLastReadCount(messages.length);
    }
  }, [isOpen, isMinimized, messages.length]);

  // Sync with props and custom event
  useEffect(() => {
    setIsOpen(initialIsOpen);
  }, [initialIsOpen]);

  useEffect(() => {
    const handleOpenChat = (e: any) => {
      setIsOpen(true);
      setIsMinimized(false);
      if (e.detail) {
        setVisitorInfo(e.detail);
        setShowPreChatForm(false);
      }
    };
    window.addEventListener('open-chat', handleOpenChat);
    return () => window.removeEventListener('open-chat', handleOpenChat);
  }, []);

  useEffect(() => {
    if (initialVisitorInfo.name) {
      setVisitorInfo(initialVisitorInfo);
    }
  }, [initialVisitorInfo]);

  // Listen for Admin Online Status
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'chat'), (snapshot) => {
      if (snapshot.exists()) {
        setIsAdminOnline(snapshot.data().isOnline);
      }
    });
    return () => unsubscribe();
  }, []);

  // Initialize Chat when info is available and window is open
  useEffect(() => {
    if (isOpen && visitorInfo.name && visitorInfo.email && !chatId) {
      const startChat = async () => {
        setIsConnecting(true);
        try {
          const initialReplies = [];
          if (visitorInfo.message) {
            initialReplies.push({
              text: visitorInfo.message,
              sender: 'visitor',
              createdAt: Timestamp.now()
            });
          }

          const docRef = await addDoc(collection(db, 'messages'), {
            name: visitorInfo.name,
            email: visitorInfo.email,
            phone: visitorInfo.phone,
            message: visitorInfo.message || '',
            type: 'chat',
            chatStatus: 'active',
            createdAt: serverTimestamp(),
            status: 'unread',
            replies: initialReplies
          });
          setChatId(docRef.id);
          setMessages(initialReplies as ChatMessage[]);

          // Notify Admin
          await fetch('/api/start-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...visitorInfo,
              sessionId: docRef.id,
              time: new Date().toLocaleString()
            })
          });
        } catch (error) {
          console.error('Error starting chat:', error);
        } finally {
          setIsConnecting(false);
        }
      };
      startChat();
    } else if (isOpen && !visitorInfo.name && !chatId) {
      setShowPreChatForm(true);
    }
  }, [isOpen, chatId, visitorInfo]);

  const handlePreChatSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const info = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
    };
    if (info.name && info.email && info.phone) {
      setVisitorInfo(info);
      setShowPreChatForm(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  // ... rest of the logic (WebSocket, SendMessage, etc.)

  // WebSocket Connection
  useEffect(() => {
    if (chatId && !isClosed) {
      const newSocket = io(window.location.origin);
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('Connected to chat server');
        newSocket.emit('join-chat', chatId);
      });

      newSocket.on('chat-update', (updatedMessages: any[]) => {
        const formattedMessages = updatedMessages.map(msg => ({
          ...msg,
          createdAt: msg.createdAt && typeof msg.createdAt.toDate === 'function'
            ? msg.createdAt
            : (msg.createdAt?._seconds 
                ? new Timestamp(msg.createdAt._seconds, msg.createdAt._nanoseconds)
                : (msg.createdAt ? Timestamp.fromDate(new Date(msg.createdAt)) : Timestamp.now()))
        }));
        setMessages(formattedMessages);
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [chatId, isClosed]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !chatId || isClosed || !socket) return;

    const text = inputText.trim();
    setInputText('');

    try {
      socket.emit('send-message', {
        sessionId: chatId,
        text,
        sender: 'visitor',
        name: visitorInfo.name,
        email: visitorInfo.email
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleTransitionToEmail = async () => {
    if (!chatId || isClosed) return;
    setIsTransitioning(true);

    try {
      // Send transcript
      await fetch('/api/transition-to-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: visitorInfo.name,
          email: visitorInfo.email,
          sessionId: chatId,
          transcript: messages
        })
      });

      // Close chat in Firestore
      await updateDoc(doc(db, 'messages', chatId), {
        chatStatus: 'closed',
        status: 'done'
      });

      setIsClosed(true);
    } catch (error) {
      console.error('Error transitioning to email:', error);
    } finally {
      setIsTransitioning(false);
    }
  };

  return (
    <>
      {/* Floating Bubble - Always visible if admin is online and chat is not open */}
      <AnimatePresence>
        {isAdminOnline && !isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-16 h-16 bg-accent-gold rounded-full shadow-2xl z-[100] flex items-center justify-center text-[#050B14] hover:scale-110 transition-transform group"
          >
            <MessageSquare className="w-8 h-8 group-hover:rotate-12 transition-transform" />
            {messages.length > lastReadCount ? (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#050B14]">
                {messages.length - lastReadCount}
              </div>
            ) : (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#050B14] animate-pulse" />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && isAdminOnline && (
          <>
            {isMinimized ? (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                onClick={() => setIsMinimized(false)}
                className="fixed bottom-6 right-6 w-16 h-16 bg-accent-gold rounded-full shadow-2xl z-[100] flex items-center justify-center text-[#050B14] hover:scale-110 transition-transform"
              >
                <MessageSquare className="w-8 h-8" />
                {messages.length > lastReadCount && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#050B14]">
                    {messages.length - lastReadCount}
                  </div>
                )}
              </motion.button>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed bottom-6 right-6 w-full max-w-[400px] h-[600px] bg-[#0A111E] border border-white/10 rounded-[2rem] shadow-2xl z-[100] flex flex-col overflow-hidden backdrop-blur-xl"
              >
                {/* Header */}
                <div className="p-6 bg-white/[0.02] border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent-gold/20 rounded-full flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-accent-gold" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">Live Support</h3>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Online</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsMinimized(true)}
                      className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
                    >
                      <Minimize2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={handleClose}
                      className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Messages Area */}
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar"
                >
                  {showPreChatForm ? (
                    <div className="h-full flex flex-col justify-center p-4">
                      <div className="text-center mb-8">
                        <h4 className="text-xl font-bold text-white mb-2">Start a Chat</h4>
                        <p className="text-white/40 text-sm">Please provide your details to connect with us.</p>
                      </div>
                      <form onSubmit={handlePreChatSubmit} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Name</label>
                          <input name="name" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-accent-gold" placeholder="John Doe" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Email</label>
                          <input name="email" type="email" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-accent-gold" placeholder="john@example.com" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Phone</label>
                          <input name="phone" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-accent-gold" placeholder="(480) 555-0123" />
                        </div>
                        <button type="submit" className="w-full bg-accent-gold text-[#050B14] font-bold py-4 rounded-xl mt-4 hover:bg-white transition-colors shadow-lg shadow-accent-gold/20">
                          Start Chatting
                        </button>
                      </form>
                    </div>
                  ) : isConnecting ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-12 h-12 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
                      <p className="text-white/40 text-sm">Connecting to support...</p>
                    </div>
                  ) : (
                    <>
                      <div className="text-center mb-8">
                        <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold mb-2">Chat Started</p>
                        <p className="text-xs text-white/40">Our team will be with you shortly.</p>
                      </div>

                      {messages.map((msg, idx) => (
                        <motion.div
                          initial={{ opacity: 0, x: msg.sender === 'visitor' ? 20 : -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          key={idx}
                          className={`flex ${msg.sender === 'visitor' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                            msg.sender === 'visitor' 
                              ? 'bg-accent-gold text-[#050B14] font-medium rounded-tr-none' 
                              : 'bg-white/5 border border-white/10 text-white rounded-tl-none'
                          }`}>
                            {msg.text}
                          </div>
                        </motion.div>
                      ))}

                      {isClosed && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center space-y-2">
                          <ShieldCheck className="w-8 h-8 text-accent-gold mx-auto mb-2 opacity-50" />
                          <p className="text-white font-bold">Chat Session Closed</p>
                          <p className="text-white/40 text-xs">This conversation has been transitioned to email.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Footer / Input */}
                {!showPreChatForm && (
                  <div className="p-6 bg-white/[0.02] border-t border-white/10 space-y-4">
                    {!isClosed ? (
                      <>
                        <form onSubmit={handleSendMessage} className="relative">
                          <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Type a message..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-white focus:border-accent-gold outline-none transition-all placeholder:text-white/20"
                          />
                          <button
                            type="submit"
                            disabled={!inputText.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-accent-gold hover:text-white transition-colors disabled:opacity-30"
                          >
                            <Send className="w-5 h-5" />
                          </button>
                        </form>
                        
                        <button
                          onClick={handleTransitionToEmail}
                          disabled={isTransitioning}
                          className="w-full flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/30 hover:text-accent-gold transition-colors"
                        >
                          {isTransitioning ? (
                            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Mail className="w-3 h-3" />
                          )}
                          Continue this conversation by email
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleClose}
                        className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all text-sm"
                      >
                        Close Chat
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </>
  );
}
