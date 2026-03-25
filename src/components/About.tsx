import { motion } from 'motion/react';
import { CheckCircle, Shield, Award } from 'lucide-react';

export default function About() {
  return (
    <section id="about" className="py-32 bg-[#050B14] relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
            x: [0, -150, 100, 0],
            y: [0, 150, -100, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[20%] left-[20%] w-[600px] h-[600px] bg-cyan-600/20 rounded-full blur-[120px] mix-blend-screen"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.5, 0.2],
            x: [0, 150, -100, 0],
            y: [0, -150, 100, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen"
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
          
          {/* Image Section */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full lg:w-1/2 relative group"
          >
            {/* Animated Glow Behind Image */}
            <div className="absolute inset-0 bg-accent-gold/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            
            <div className="relative rounded-3xl overflow-hidden aspect-[4/5] lg:aspect-square border border-white/10 bg-white/[0.02] group-hover:border-accent-gold/30 transition-colors duration-500 shadow-2xl group-hover:shadow-[0_0_40px_rgba(212,175,55,0.15)]">
              <img
                src="https://i.imgur.com/tER0736.jpeg"
                alt="Professional Notary Signing Documents"
                className="w-full h-full object-cover opacity-80 mix-blend-luminosity group-hover:mix-blend-normal group-hover:scale-105 transition-all duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050B14] via-[#050B14]/20 to-transparent"></div>
              
              {/* Floating Badge */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-8 left-8 bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 flex items-center gap-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-accent-gold to-accent-gold-dark rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.5)]">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-xl">Certified</p>
                  <p className="text-white/80 text-sm">Arizona Notary Public</p>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Text Section */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full lg:w-1/2"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 mb-8 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
              <Shield className="w-4 h-4 text-accent-gold" />
              <span className="text-sm font-medium text-accent-gold uppercase tracking-wider">Trusted Professionals</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              About <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-gold to-amber-300">RNE Premier</span> Mobile Notary
            </h2>
            
            <div className="space-y-6 text-lg text-white/70 leading-relaxed">
              <p>
                At RNE Premier Mobile Notary, we understand that your time is valuable. That's why we bring our professional notarization services directly to you, whether you're at home, in the office, or at a specialized facility.
              </p>
              <p>
                Serving Scottsdale, Phoenix, and the greater Maricopa County area, our mission is to provide secure, accurate, and efficient document handling. We pride ourselves on our meticulous attention to detail and our commitment to client confidentiality.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                'Bonded & Insured',
                'Background Checked',
                'Flexible Scheduling',
                'Mobile Convenience'
              ].map((item, index) => (
                <motion.div 
                  key={index} 
                  whileHover={{ x: 5 }}
                  className="flex items-center gap-3 group/item cursor-default"
                >
                  <div className="w-6 h-6 rounded-full bg-accent-gold/20 flex items-center justify-center shrink-0 group-hover/item:bg-accent-gold/40 transition-colors group-hover/item:shadow-[0_0_10px_rgba(212,175,55,0.4)]">
                    <CheckCircle className="w-4 h-4 text-accent-gold" />
                  </div>
                  <span className="text-white font-medium group-hover/item:text-accent-gold transition-colors">{item}</span>
                </motion.div>
              ))}
            </div>

            <div className="mt-12">
              <a
                href="#contact"
                className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-[#050B14] transition-all duration-300 bg-accent-gold border border-accent-gold-light rounded-full hover:bg-accent-gold-dark hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-gold focus:ring-offset-[#050B14]"
              >
                Schedule a Signing
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
