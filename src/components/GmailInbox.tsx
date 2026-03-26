import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, RefreshCw, ChevronLeft, Reply, Send, AlertCircle, Clock } from 'lucide-react';

interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
  unread: boolean;
}

interface FullMessage {
  id: string;
  threadId: string;
  snippet: string;
  payload: any;
  labelIds: string[];
}

export default function GmailInbox({ user }: { user: any }) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<FullMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setLoading(true);
    try {
      const redirectUri = `${window.location.origin}/api/auth/google/callback`;
      const res = await fetch(`/api/gmail/inbox?uid=${user.uid}&redirectUri=${encodeURIComponent(redirectUri)}`);
      if (res.ok) {
        const data = await res.json();
        setIsConnected(true);
        setMessages(data.messages || []);
      } else {
        setIsConnected(false);
      }
    } catch (err) {
      console.error(err);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setError('');
      const redirectUri = `${window.location.origin}/api/auth/google/callback`;
      const res = await fetch(`/api/auth/google/url?redirectUri=${encodeURIComponent(redirectUri)}&uid=${user.uid}`);
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get auth URL. Please check your Google OAuth credentials in Settings.');
      }
      
      const authWindow = window.open(data.url, 'oauth_popup', 'width=600,height=700');
      
      if (!authWindow) {
        setError('Please allow popups to connect your Gmail account.');
        return;
      }

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
          window.removeEventListener('message', handleMessage);
          checkConnection();
        }
      };
      window.addEventListener('message', handleMessage);
    } catch (err: any) {
      console.error('Failed to get auth URL:', err);
      setError(err.message);
    }
  };

  const loadMessage = async (id: string) => {
    try {
      const redirectUri = `${window.location.origin}/api/auth/google/callback`;
      const res = await fetch(`/api/gmail/message/${id}?uid=${user.uid}&redirectUri=${encodeURIComponent(redirectUri)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedMessage(data);
        // Mark as read locally
        setMessages(msgs => msgs.map(m => m.id === id ? { ...m, unread: false } : m));
      }
    } catch (err) {
      console.error('Failed to load message:', err);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMessage || !replyText.trim()) return;

    setIsSending(true);
    try {
      const headers = selectedMessage.payload.headers;
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
      const from = headers.find((h: any) => h.name === 'From')?.value || '';
      const messageId = headers.find((h: any) => h.name === 'Message-ID')?.value || '';
      
      // Extract email address from "Name <email@domain.com>"
      const toMatch = from.match(/<(.+)>/);
      const to = toMatch ? toMatch[1] : from;

      const redirectUri = `${window.location.origin}/api/auth/google/callback`;
      const res = await fetch('/api/gmail/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          redirectUri,
          to,
          subject,
          text: replyText,
          threadId: selectedMessage.threadId,
          messageId
        })
      });

      if (!res.ok) throw new Error('Failed to send reply');
      
      setReplyText('');
      alert('Reply sent successfully!');
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const getMessageBody = (payload: any): string => {
    let body = '';
    if (payload.parts) {
      const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html');
      const textPart = payload.parts.find((p: any) => p.mimeType === 'text/plain');
      
      if (htmlPart && htmlPart.body.data) {
        body = atob(htmlPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      } else if (textPart && textPart.body.data) {
        body = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        // Convert plain text to simple HTML
        body = `<div style="white-space: pre-wrap; font-family: sans-serif;">${body}</div>`;
      } else if (payload.parts.length > 0) {
        // Recursive search for nested parts
        body = getMessageBody(payload.parts[0]);
      }
    } else if (payload.body && payload.body.data) {
      body = atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      if (payload.mimeType === 'text/plain') {
        body = `<div style="white-space: pre-wrap; font-family: sans-serif;">${body}</div>`;
      }
    }
    return body;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
          <Mail className="w-10 h-10 text-white/40" />
        </div>
        <h2 className="text-2xl font-bold mb-4">Connect Your Gmail</h2>
        <p className="text-white/50 text-center max-w-md mb-8">
          Connect your Gmail account to read and reply to all your emails directly from the Admin Panel.
        </p>
        
        {error && (
          <div className="mb-6 flex items-start gap-3 text-red-400 text-sm bg-red-400/10 p-4 rounded-xl border border-red-400/20 max-w-md">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <button
          onClick={handleConnect}
          className="bg-white text-[#050B14] hover:bg-gray-200 font-bold py-4 px-8 rounded-xl transition-all flex items-center gap-3 shadow-lg"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden max-h-[calc(100vh-120px)]">
      {/* Sidebar - Email List */}
      <div className={`w-full md:w-[400px] flex flex-col ${selectedMessage ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Inbox</h2>
          <button 
            onClick={checkConnection}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/50 hover:text-white"
            title="Refresh Inbox"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-white/30">
              No recent emails found.
            </div>
          ) : (
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => loadMessage(msg.id)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden ${
                  selectedMessage?.id === msg.id 
                    ? 'bg-white/10 border-white/20' 
                    : 'bg-white/[0.02] border-white/5 hover:bg-white/5'
                }`}
              >
                {msg.unread && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                )}
                <div className="flex justify-between items-start mb-1">
                  <h3 className={`font-bold truncate pr-4 ${msg.unread ? 'text-white' : 'text-white/70'}`}>
                    {msg.from.split('<')[0].trim() || msg.from}
                  </h3>
                  <span className="text-[10px] text-white/30 whitespace-nowrap">
                    {msg.date ? new Date(msg.date).toLocaleDateString() : ''}
                  </span>
                </div>
                <h4 className={`text-sm truncate mb-2 ${msg.unread ? 'text-white/90 font-medium' : 'text-white/50'}`}>
                  {msg.subject}
                </h4>
                <p className="text-xs text-white/40 line-clamp-2">
                  {msg.snippet}
                </p>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Content Area - Email Detail */}
      <div className={`flex-1 flex flex-col ${!selectedMessage ? 'hidden md:flex' : 'flex'}`}>
        {selectedMessage ? (
          <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 md:p-8 h-full flex flex-col">
            <button 
              onClick={() => setSelectedMessage(null)}
              className="md:hidden flex items-center gap-2 text-white/50 hover:text-white mb-6"
            >
              <ChevronLeft className="w-5 h-5" />
              Back to Inbox
            </button>

            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">
                {selectedMessage.payload.headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject'}
              </h2>
              <div className="flex items-center justify-between text-sm text-white/50">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white font-bold">
                    {(selectedMessage.payload.headers.find((h: any) => h.name === 'From')?.value || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-white/90 font-medium">
                      {selectedMessage.payload.headers.find((h: any) => h.name === 'From')?.value}
                    </div>
                    <div className="text-xs">
                      To: {selectedMessage.payload.headers.find((h: any) => h.name === 'To')?.value}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {new Date(selectedMessage.payload.headers.find((h: any) => h.name === 'Date')?.value || '').toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex-1 bg-white rounded-2xl p-6 mb-6 overflow-y-auto">
              <iframe
                title="Email Content"
                srcDoc={getMessageBody(selectedMessage.payload)}
                className="w-full h-full border-none bg-transparent"
                sandbox="allow-same-origin allow-popups"
              />
            </div>

            <form onSubmit={handleReply} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-xl border border-red-400/20">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              <div className="relative">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply here..."
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white focus:border-blue-500 outline-none transition-all resize-none placeholder:text-white/20"
                />
                <button
                  type="submit"
                  disabled={isSending || !replyText.trim()}
                  className="absolute bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-white/20 border border-white/5 rounded-[2rem] bg-white/[0.01]">
            <Mail className="w-16 h-16 mb-4 opacity-50" />
            <p>Select an email to view</p>
          </div>
        )}
      </div>
    </div>
  );
}
