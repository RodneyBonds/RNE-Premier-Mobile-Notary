import { motion } from 'motion/react';
import { MapPin } from 'lucide-react';

const cities = [
  'Phoenix',
  'Scottsdale',
  'Tempe',
  'Mesa',
  'Chandler',
  'Glendale',
  'Gilbert',
  'Peoria',
  'Surprise',
  'Paradise Valley',
];

export default function ServiceArea() {
  return (
    <section id="areas" className="py-32 bg-[#FAFAFA] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-black/10 bg-black/[0.02] mb-8"
          >
            <span className="text-sm font-medium text-black/60">Dependable Precision</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-black/40"
          >
            One practical, holistic service.<br />
            <span className="text-gradient">Exponential daily value.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-black/60 max-w-2xl mx-auto"
          >
            RNE Premier teams secure, align, validate and curate exactly what keeps your documents moving across Maricopa County.
          </motion.p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {cities.map((city, index) => (
            <motion.div
              key={city}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              whileHover={{ scale: 1.05, borderColor: "rgba(212, 175, 55, 0.3)", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" }}
              className="flex items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-black/5 group"
            >
              <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center group-hover:bg-accent-gold/10 transition-colors">
                <MapPin className="w-4 h-4 text-black/40 group-hover:text-accent-gold-dark transition-colors" />
              </div>
              <span className="text-black/80 font-medium text-sm">{city}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
