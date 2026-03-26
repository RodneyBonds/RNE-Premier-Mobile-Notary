import React, { createContext, useContext, useState } from 'react';

const ChatContext = createContext({
  isOpen: false,
  setIsOpen: (open: boolean) => {},
  formData: { name: '', email: '', phone: '', message: '' },
  setFormData: (data: any) => {},
});

export const ChatProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });

  return (
    <ChatContext.Provider value={{ isOpen, setIsOpen, formData, setFormData }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
