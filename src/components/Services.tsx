import { motion } from 'motion/react';
import {
  FileSignature,
  Home,
  Briefcase,
  ScrollText,
  ShieldAlert,
  Hospital,
  Building,
  MapPin
} from 'lucide-react';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileSignature,
  Home,
  Briefcase,
  ScrollText,
  ShieldAlert,
  Hospital,
  Building,
  MapPin,
  ChevronDown
} from 'lucide-react';

const services = [
  { 
    icon: FileSignature, 
    title: 'Mobile Notary', 
    desc: 'General notarization services at your preferred location.',
    details: 'Includes acknowledgments, jurats, oaths, and affirmations. We ensure all signers are properly identified and documents are correctly executed.'
  },
  { 
    icon: Home, 
    title: 'Loan Signing', 
    desc: 'Expert handling of mortgage and loan document packages.',
    details: 'Certified Notary Signing Agents (NSA) experienced with buyer, seller, refinance, HELOC, and reverse mortgage packages. We guide signers through the documents.'
  },
  { 
    icon: Briefcase, 
    title: 'Refinance', 
    desc: 'Secure and accurate notarization for property refinancing.',
    details: 'We handle time-sensitive refinance documents with precision, ensuring no missed signatures or dates that could delay your funding.'
  },
  { 
    icon: ScrollText, 
    title: 'Power of Attorney', 
    desc: 'Legally binding notarization for POA documents.',
    details: 'Specialized in General, Durable, Medical, and Limited Power of Attorney documents, ensuring all legal requirements for witnessing and notarization are met.'
  },
  { 
    icon: ShieldAlert, 
    title: 'Affidavits', 
    desc: 'Sworn statements and legal affidavits notarized promptly.',
    details: 'Administering oaths and affirmations for legal affidavits, financial statements, and identity verification documents with strict adherence to state laws.'
  },
  { 
    icon: Hospital, 
    title: 'Hospital Notary', 
    desc: 'Compassionate service for patients in medical facilities.',
    details: 'Discreet and patient-focused notarization for advanced healthcare directives, living wills, and medical POAs directly at the bedside.'
  },
  { 
    icon: Building, 
    title: 'Jail Notary', 
    desc: 'Discreet and professional notarization at detention centers.',
    details: 'Experienced in navigating the specific protocols and clearance requirements for notarizing documents for inmates at local and county facilities.'
  },
  { 
    icon: MapPin, 
    title: 'Travel Notary', 
    desc: 'We travel to your home, office, or any convenient location.',
    details: 'Skip the traffic and waiting rooms. We bring the notary seal to your preferred location, offering ultimate convenience and flexibility for your schedule.'
  },
];

export default function Services() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="services" className="py-32 bg-[#030712] relative overflow-hidden border-t border-white/5">
      {/* Background glow */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ 
            x: [0, 200, -150, 0],
            y: [0, -150, 200, 0],
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[30%] left-[20%] w-[800px] h-[800px] bg-violet-600/20 rounded-full blur-[150px]"
        />
        <motion.div 
          animate={{ 
            x: [0, -200, 150, 0],
            y: [0, 200, -150, 0],
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.5, 0.2]
          }}
          transition={{ duration: 28, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute bottom-[10%] right-[10%] w-[600px] h-[600px] bg-amber-500/15 rounded-full blur-[150px]"
        />
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-16 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 mb-6"
          >
            <span className="text-sm font-medium text-accent-gold">Comprehensive Services</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight"
          >
            Realize new ideas and opportunities <span className="text-gradient">without the hassle.</span>
          </motion.h2>
        </div>

        <div className="space-y-4">
          {services.map((service, index) => {
            const isOpen = openIndex === index;
            return (
              <motion.div
                key={service.title}
                initial={false}
                className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full p-6 flex items-center justify-between text-left hover:bg-white/[0.05] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl border ${isOpen ? 'border-accent-gold/50 bg-accent-gold/10' : 'border-white/10 bg-white/5'}`}>
                      <service.icon className={`w-6 h-6 ${isOpen ? 'text-accent-gold' : 'text-white/70'}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{service.title}</h3>
                      <p className="text-sm text-white/50">{service.desc}</p>
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown className="w-6 h-6 text-white/50" />
                  </motion.div>
                </button>
                
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="px-6 pb-6 pt-0 text-white/60 text-sm leading-relaxed border-t border-white/5">
                        <p className="pt-4">{service.details}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
