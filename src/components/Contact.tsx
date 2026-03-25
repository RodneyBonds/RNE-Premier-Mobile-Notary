import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Send } from 'lucide-react';

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setStatus('success');
        setFormData({ name: '', phone: '', email: '', message: '' });
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
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

            <div className="relative bg-white/[0.02] border border-white/10 p-8 md:p-10 rounded-3xl backdrop-blur-sm group-hover:border-accent-gold/30 transition-colors duration-500 shadow-2xl group-hover:shadow-[0_0_40px_rgba(212,175,55,0.15)]">
              <h3 className="text-2xl font-bold text-white mb-8">Get in touch</h3>
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium text-white/60">Full Name</label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-accent-gold focus:ring-1 focus:ring-accent-gold focus:shadow-[0_0_15px_rgba(212,175,55,0.2)] outline-none transition-all placeholder:text-white/20"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium text-white/60">Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-accent-gold focus:ring-1 focus:ring-accent-gold focus:shadow-[0_0_15px_rgba(212,175,55,0.2)] outline-none transition-all placeholder:text-white/20"
                      placeholder="(480) 555-0123"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-white/60">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-accent-gold focus:ring-1 focus:ring-accent-gold focus:shadow-[0_0_15px_rgba(212,175,55,0.2)] outline-none transition-all placeholder:text-white/20"
                    placeholder="john@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium text-white/60">Message</label>
                  <textarea
                    id="message"
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-accent-gold focus:ring-1 focus:ring-accent-gold focus:shadow-[0_0_15px_rgba(212,175,55,0.2)] outline-none transition-all resize-none placeholder:text-white/20"
                    placeholder="How can we help you?"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full bg-accent-gold hover:bg-accent-gold-dark text-[#050B14] font-semibold px-8 py-4 rounded-xl transition-all duration-300 shadow-lg shadow-accent-gold/20 hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:-translate-y-1 flex items-center justify-center gap-2 group/btn disabled:opacity-50"
                >
                  <Send className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                  {status === 'submitting' ? 'Sending...' : 'Send Message'}
                </button>
                {status === 'success' && <p className="text-green-500 text-center">Message sent successfully!</p>}
                {status === 'error' && <p className="text-red-500 text-center">Failed to send message. Please try again.</p>}
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
