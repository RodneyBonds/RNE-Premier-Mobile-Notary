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
  serverTimestamp 
} from 'firebase/firestore';
import { io, Socket } from 'socket.io-client';

interface ChatMessage {
  text: string;
  createdAt: any;
  sender: 'admin' | 'client';
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

export default function ChatWindow({ isOpen, onClose, visitorInfo }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize Chat
  useEffect(() => {
    if (isOpen && !chatId) {
      const startChat = async () => {
        try {
          const docRef = await addDoc(collection(db, 'messages'), {
            ...visitorInfo,
            type: 'chat',
            chatStatus: 'active',
            createdAt: serverTimestamp(),
            status: 'unread',
            replies: visitorInfo.message ? [{
              text: visitorInfo.message,
              sender: 'client',
              createdAt: Timestamp.now()
            }] : []
          });
          setChatId(docRef.id);

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
    }
  }, [isOpen, chatId, visitorInfo]);

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
        // Map 'visitor' to 'client' for UI consistency
        const mappedMessages = updatedMessages.map(msg => ({
          ...msg,
          sender: msg.sender === 'visitor' ? 'client' : msg.sender
        }));
        setMessages(mappedMessages);
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
    <AnimatePresence>
      {isOpen && (
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
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar"
          >
            {isConnecting ? (
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
                    initial={{ opacity: 0, x: msg.sender === 'client' ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={idx}
                    className={`flex ${msg.sender === 'client' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                      msg.sender === 'client' 
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
                onClick={onClose}
                className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all text-sm"
              >
                Close Chat
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
