import { motion } from 'motion/react';
import { Award, ShieldCheck, FileCheck, CheckCircle } from 'lucide-react';

const credentials = [
  { icon: Award, title: 'Arizona Notary Public', desc: 'Commissioned by the State of Arizona' },
  { icon: ShieldCheck, title: 'Bonded', desc: 'Protected for your peace of mind' },
  { icon: FileCheck, title: 'Insured', desc: 'Comprehensive E&O Insurance' },
  { icon: CheckCircle, title: 'Background Checked', desc: 'Verified and trusted professional' },
];

export default function Credentials() {
  return (
    <section className="py-24 bg-[#050B14] relative overflow-hidden border-y border-white/5">
      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3],
            x: [0, 150, -100, 0],
            y: [0, -100, 150, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[10%] left-[20%] w-[600px] h-[600px] bg-amber-500/15 rounded-full blur-[120px] mix-blend-screen"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.5, 0.2],
            x: [0, -150, 100, 0],
            y: [0, 150, -100, 0]
          }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[10%] right-[20%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen"
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 mb-6 shadow-[0_0_15px_rgba(212,175,55,0.1)]"
          >
            <span className="text-sm font-medium text-accent-gold">Verified Trust</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold text-white mb-4"
          >
            Our Credentials
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-white/60 max-w-2xl mx-auto"
          >
            We operate with the highest standards of professionalism and compliance.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {credentials.map((cred, index) => (
            <motion.div
              key={cred.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5, borderColor: "rgba(212, 175, 55, 0.3)", backgroundColor: "rgba(255, 255, 255, 0.05)", boxShadow: "0 0 30px rgba(212, 175, 55, 0.15)" }}
              className="flex flex-col items-center text-center p-8 rounded-3xl bg-white/[0.02] border border-white/10 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-accent-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#050B14] to-[#1a2b4c] border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] group-hover:border-accent-gold/50">
                <cred.icon className="w-8 h-8 text-accent-gold group-hover:text-white" />
              </div>
              <h3 className="relative z-10 text-lg font-bold text-white mb-2 group-hover:text-accent-gold">{cred.title}</h3>
              <p className="relative z-10 text-sm text-white/60 group-hover:text-white/80">{cred.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm font-medium text-white/40"
        >
          <div className="flex items-center gap-2 group cursor-default">
            <span className="w-2 h-2 rounded-full bg-accent-gold group-hover:shadow-[0_0_10px_rgba(212,175,55,0.8)] transition-shadow"></span>
            Commission Number: <span className="text-white/80 group-hover:text-white transition-colors">691790</span>
          </div>
          <div className="hidden sm:block w-px h-4 bg-white/10"></div>
          <div className="flex items-center gap-2 group cursor-default">
            <span className="w-2 h-2 rounded-full bg-accent-gold-dark group-hover:shadow-[0_0_10px_rgba(212,175,55,0.8)] transition-shadow"></span>
            Expiration Date: <span className="text-white/80 group-hover:text-white transition-colors">January 20, 2030</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
