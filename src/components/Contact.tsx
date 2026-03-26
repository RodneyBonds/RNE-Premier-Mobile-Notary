import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, CheckCircle2, X } from 'lucide-react';

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'success') return;
    
    setStatus('submitting');
    setErrorMessage(null);
    try {
      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to send message';
        // Clone the response so we can try parsing it as JSON, then as text
        const responseClone = response.clone();
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, try to get text from the clone
          try {
            const text = await responseClone.text();
            if (text) errorMessage = text;
          } catch (textError) {
            // Ignore text parsing error
          }
        }
        throw new Error(errorMessage);
      }
      
      setStatus('success');
      setShowModal(true);
      setFormData({ name: '', phone: '', email: '', message: '' });
    } catch (error) {
      console.error('Form submission error:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    }
  };

  return (
    <section id="contact" className="py-32 bg-[#050B14] rounded-t-[3rem] -mt-12 relative z-20 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-full h-full pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3], x: [0, -150, 100, 0], y: [0, 100, -150, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-500/20 rounded-full blur-[150px] mix-blend-screen"
        />
        <motion.div 
          animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.5, 0.3], x: [0, 150, -100, 0], y: [0, -150, 100, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-500/20 rounded-full blur-[150px] mix-blend-screen"
        />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2], x: [0, 100, -100, 0], y: [0, 100, -100, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute top-[30%] left-[20%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] mix-blend-screen"
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">
          
          {/* Text Content */}
          <div className="w-full lg:w-1/2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 mb-8 shadow-[0_0_15px_rgba(212,175,55,0.1)]"
            >
              <span className="text-sm font-medium text-accent-gold">No Limitations</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-6xl font-bold tracking-tight mb-8 text-white"
            >
              Why is there a need for <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-gold to-amber-300">RNE Premier?</span>
            </motion.h2>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-6 text-lg text-white/70"
            >
              <p>
                Physical document management has hyperscale webs. Complex layers of rapidly changing needs, requirements, decisions, and objectives demand constant alignment, coordination, and accountability.
              </p>
              <p>
                Huge outcomes ride on typical company tracks. People largely chase facts and compile context. Endless intricate actions create taxing complexity.
              </p>
              <p className="text-accent-gold font-medium pt-4 text-xl">
                We simplify the process. We come to you.
              </p>
              
            </motion.div>
          </div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="w-full lg:w-1/2 relative group"
          >
            {/* Animated Glow Behind Form */}
            <div className="absolute inset-0 bg-accent-gold/10 blur-3xl rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

            <div className="relative bg-white/[0.02] border border-white/10 p-8 md:p-10 rounded-3xl backdrop-blur-sm group-hover:border-accent-gold/30 transition-colors duration-500 shadow-2xl group-hover:shadow-[0_0_40px_rgba(212,175,55,0.15)] overflow-hidden">
              <h3 className="text-2xl font-bold text-white mb-8">Get in touch</h3>
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium text-white/60">Full Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={status === 'success' || status === 'submitting'}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-accent-gold focus:ring-1 focus:ring-accent-gold focus:shadow-[0_0_15px_rgba(212,175,55,0.2)] outline-none transition-all placeholder:text-white/20 disabled:opacity-50"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium text-white/60">Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={status === 'success' || status === 'submitting'}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-accent-gold focus:ring-1 focus:ring-accent-gold focus:shadow-[0_0_15px_rgba(212,175,55,0.2)] outline-none transition-all placeholder:text-white/20 disabled:opacity-50"
                      placeholder="(480) 555-0123"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-white/60">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={status === 'success' || status === 'submitting'}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-accent-gold focus:ring-1 focus:ring-accent-gold focus:shadow-[0_0_15px_rgba(212,175,55,0.2)] outline-none transition-all placeholder:text-white/20 disabled:opacity-50"
                    placeholder="john@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium text-white/60">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    disabled={status === 'success' || status === 'submitting'}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-accent-gold focus:ring-1 focus:ring-accent-gold focus:shadow-[0_0_15px_rgba(212,175,55,0.2)] outline-none transition-all resize-none placeholder:text-white/20 disabled:opacity-50"
                    placeholder="How can we help you?"
                  ></textarea>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    type="submit"
                    disabled={status === 'submitting' || status === 'success'}
                    className={`flex-1 font-semibold px-8 py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group/btn ${
                      status === 'success' 
                        ? 'bg-gray-600 text-white/50 cursor-not-allowed' 
                        : 'bg-accent-gold hover:bg-accent-gold-dark text-[#050B14] shadow-lg shadow-accent-gold/20 hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:-translate-y-1'
                    }`}
                  >
                    {status === 'success' ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        SUBMITTED
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                        {status === 'submitting' ? 'SENDING...' : 'SEND MESSAGE'}
                      </>
                    )}
                  </button>
                </div>
                {status === 'error' && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-red-500 text-center text-sm font-medium">
                      {errorMessage || 'Something went wrong. Please try again.'}
                    </p>
                  </div>
                )}
              </form>

              {/* Success Modal - Now Absolute to the Form Container */}
              <AnimatePresence>
                {showModal && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-[#050B14]/90 backdrop-blur-md">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 20 }}
                      className="bg-[#0A111E] border border-accent-gold/30 p-8 rounded-3xl max-w-sm w-full shadow-[0_0_50px_rgba(212,175,55,0.15)] relative overflow-hidden"
                    >
                      {/* Decorative background element */}
                      <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent-gold/10 rounded-full blur-3xl"></div>
                      
                      <button 
                        onClick={() => setShowModal(false)}
                        className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>

                      <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-accent-gold/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
                          <CheckCircle2 className="w-8 h-8 text-accent-gold" />
                        </div>
                        <h4 className="text-xl font-bold text-white mb-2">Message Received!</h4>
                        <p className="text-white/60 text-sm mb-6">
                          Thank you for reaching out to RNE Premier. We'll get back to you as soon as possible.
                        </p>
                        <button
                          onClick={() => setShowModal(false)}
                          className="w-full bg-accent-gold hover:bg-accent-gold-dark text-[#050B14] font-bold py-3 rounded-xl transition-all duration-300 text-sm"
                        >
                          Close
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Contact form ends */}
    </section>
  );
}
