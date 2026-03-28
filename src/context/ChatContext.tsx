import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const ChatContext = createContext({
  isOpen: false,
  setIsOpen: (open: boolean) => {},
  formData: { name: '', email: '', phone: '', message: '' },
  setFormData: (data: any) => {},
  isAdminOnline: false,
});

export const ChatProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [isAdminOnline, setIsAdminOnline] = useState(false);

  useEffect(() => {
    const adminRef = doc(db, 'adminStatus', 'global');
    const unsubAdmin = onSnapshot(adminRef, (doc) => {
      if (doc.exists()) {
        setIsAdminOnline(doc.data().isOnline);
      }
    });
    return () => unsubAdmin();
  }, []);

  return (
    <ChatContext.Provider value={{ isOpen, setIsOpen, formData, setFormData, isAdminOnline }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
