import { motion } from 'motion/react';
import { ShieldCheck, FileCheck, MapPin, Clock, Briefcase, Map } from 'lucide-react';

const reasons = [
  { icon: ShieldCheck, title: 'Bonded & Insured', desc: 'Protected for your peace of mind with comprehensive coverage.' },
  { icon: FileCheck, title: 'Background Checked', desc: 'Verified and trusted professionals handling your documents.' },
  { icon: MapPin, title: 'Mobile Service', desc: 'We travel to your home, office, or any convenient location.' },
  { icon: Clock, title: 'Flexible Scheduling', desc: 'Same day, evening, and weekend appointments available.' },
  { icon: Briefcase, title: 'Professional', desc: 'Expert handling of all your critical notarization needs.' },
  { icon: Map, title: 'Maricopa County', desc: 'Serving Scottsdale, Phoenix, and the greater Maricopa area.' },
];

export default function WhyChooseUs() {
  return (
    <section id="why-us" className="py-32 bg-white rounded-t-[3rem] -mt-12 relative z-20 overflow-hidden">
      {/* Background Graphic */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none opacity-20">
        <motion.div 
          animate={{ scale: [0.5, 0.55, 0.5], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 border-[2px] border-accent-gold/30 rounded-full"
        />
        <motion.div 
          animate={{ scale: [0.75, 0.8, 0.75], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute inset-0 border-[1px] border-accent-gold/40 rounded-full"
        />
        <motion.div 
          animate={{ scale: [1, 1.05, 1], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute inset-0 border-[1px] border-accent-gold/50 rounded-full"
        />
        <motion.div 
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-gradient-to-tr from-accent-gold/20 via-accent-gold-light/20 to-accent-gold-dark/20 rounded-full blur-3xl"
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 mb-8 shadow-[0_0_15px_rgba(212,175,55,0.15)]"
          >
            <span className="text-sm font-medium text-accent-gold-dark">Freedom & Flexibility</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-black"
          >
            Stop stressing over documents.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-gold-dark to-amber-500">Enjoy peace of mind.</span>
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
          {reasons.map((reason, index) => (
            <motion.div
              key={reason.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5, borderColor: "rgba(212, 175, 55, 0.3)", boxShadow: "0 15px 40px -10px rgba(212, 175, 55, 0.2)" }}
              className="flex flex-col items-start p-8 rounded-3xl bg-white border border-black/5 group relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent-gold to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#050B14] to-[#1a2b4c] flex items-center justify-center mb-6 shadow-lg group-hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] relative overflow-hidden">
                <div className="absolute inset-0 bg-accent-gold/20 opacity-0 group-hover:opacity-100"></div>
                <motion.div
                  whileHover={{ rotate: 10, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  <reason.icon className="w-7 h-7 text-accent-gold relative z-10" />
                </motion.div>
              </div>
              <h3 className="text-xl font-bold text-black mb-3 group-hover:text-accent-gold-dark">
                {reason.title}
              </h3>
              <p className="text-black/60 leading-relaxed group-hover:text-black/80">
                {reason.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
