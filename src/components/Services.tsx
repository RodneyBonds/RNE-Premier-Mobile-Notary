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
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    },
  };

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col justify-center items-center text-center mb-16 gap-8">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 mb-6"
            >
              <span className="text-sm font-medium text-accent-gold">Comprehensive Services</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-tight"
            >
              Realize new ideas and opportunities <span className="text-accent-gold">without the hassle.</span>
            </motion.h2>
          </div>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {services.map((service, index) => (
            <motion.div
              key={service.title}
              variants={itemVariants}
              whileHover={{ y: -8, scale: 1.02 }}
              className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 hover:bg-white/[0.05] hover:border-accent-gold/30 transition-all duration-300 group relative overflow-hidden flex flex-col"
            >
              {/* Hover gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="inline-flex items-center gap-2 border border-white/20 rounded-full px-4 py-1.5 mb-6 text-sm text-white/80 group-hover:border-accent-gold/50 group-hover:text-white transition-colors self-start">
                  <service.icon className="w-4 h-4 text-accent-gold group-hover:scale-110 transition-transform duration-300" />
                  {service.title}
                </div>
                <p className="text-white/60 leading-relaxed text-sm group-hover:text-white/80 transition-colors">
                  {service.desc}
                </p>
                
                {/* Expandable Details */}
                <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-500 ease-in-out">
                  <div className="overflow-hidden">
                    <div className="pt-4 mt-4 border-t border-white/10 text-white/50 text-sm leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                      {service.details}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
