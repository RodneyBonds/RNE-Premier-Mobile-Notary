import { motion } from 'motion/react';
import { FileSignature, Stamp, Scale, ShieldCheck, ScrollText } from 'lucide-react';
import { useMemo } from 'react';

export default function Hero() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
    },
  };

  const floatingVariants = {
    float: (custom: number) => ({
      y: [0, -15, 0],
      rotate: [0, custom, 0],
      transition: {
        duration: 4 + Math.random() * 2,
        repeat: Infinity,
        ease: "easeInOut",
        delay: Math.random() * 2
      }
    })
  };

  const particles = useMemo(() => {
    return [...Array(25)].map((_, i) => ({
      id: i,
      width: Math.random() * 4 + 1 + 'px',
      height: Math.random() * 4 + 1 + 'px',
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      yOffset: -150 - Math.random() * 100,
      xOffset: (Math.random() - 0.5) * 100,
      maxOpacity: Math.random() * 0.5 + 0.3,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 10
    }));
  }, []);

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center bg-[#030712] overflow-hidden pt-32 pb-20">
      {/* Background Gradients / Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        {/* Animated Grid Overlay with Radial Mask */}
        <motion.div 
          className="absolute inset-0 opacity-[0.06]" 
          style={{ 
            backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', 
            backgroundSize: '4rem 4rem',
            maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, #000 20%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, #000 20%, transparent 100%)'
          }}
          animate={{
            backgroundPosition: ['0px 0px', '64px 64px']
          }}
          transition={{
            duration: 15,
            ease: "linear",
            repeat: Infinity
          }}
        />

        {/* Floating Particles */}
        {particles.map((p) => (
          <motion.div
            key={`particle-${p.id}`}
            className="absolute rounded-full bg-accent-gold/40"
            style={{
              width: p.width,
              height: p.height,
              left: p.left,
              top: p.top,
            }}
            animate={{
              y: [0, p.yOffset],
              x: [0, p.xOffset],
              opacity: [0, p.maxOpacity, 0],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: "linear",
              delay: p.delay
            }}
          />
        ))}

        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, 150, -100, 0],
            y: [0, -150, 100, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[10%] left-[10%] w-[40%] h-[40%] bg-blue-600/30 rounded-full blur-[120px] mix-blend-screen"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.4, 1],
            opacity: [0.2, 0.4, 0.2],
            x: [0, -150, 100, 0],
            y: [0, 150, -100, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[10%] right-[10%] w-[50%] h-[50%] bg-amber-500/20 rounded-full blur-[150px] mix-blend-screen"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.5, 0.2],
            x: [0, 100, -150, 0],
            y: [0, 100, -150, 0]
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-[40%] left-[40%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen"
        />
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center"
      >
        <motion.div
          variants={itemVariants}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-amber-500/20 bg-amber-500/10 backdrop-blur-sm mb-10"
        >
          <Scale className="w-4 h-4 text-accent-gold" />
          <span className="text-sm font-medium text-accent-gold tracking-wide">Trusted Legal Notarization</span>
        </motion.div>

        <motion.h1
          variants={itemVariants}
          className="text-5xl md:text-7xl lg:text-8xl font-bold text-white leading-[1.1] mb-8 tracking-tight"
        >
          Sign and notarize <br className="hidden md:block" />
          <span className="text-gradient">with confidence.</span>
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-lg md:text-xl text-white/60 font-medium max-w-3xl mb-12 leading-relaxed"
        >
          RNE Premier helps individuals, real estate professionals, and businesses execute critical document notarization without the heavy lifting. We unify regions and requirements with precision.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
        >
          <motion.a
            href="#contact"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{
              boxShadow: [
                "0 10px 15px -3px rgba(212, 175, 55, 0.3)",
                "0 20px 25px -5px rgba(212, 175, 55, 0.2)",
                "0 10px 15px -3px rgba(212, 175, 55, 0.3)"
              ]
            }}
            transition={{
              boxShadow: {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }
            }}
            className="bg-accent-gold hover:bg-accent-gold-dark text-black font-semibold px-8 py-4 rounded-full transition-all duration-300 shadow-lg shadow-accent-gold/30 inline-block whitespace-nowrap text-lg"
          >
            Book Appointment
          </motion.a>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="w-full max-w-4xl h-64 md:h-96 relative rounded-3xl overflow-hidden border border-white/10 bg-white/[0.02] backdrop-blur-md flex items-center justify-center shadow-2xl"
        >
          {/* Central Document Graphic */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#030712]/80 z-10"></div>
          
          <div className="relative z-20 w-full h-full flex items-center justify-center">
            {/* Main Document */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ 
                opacity: 1, 
                scale: [1, 1.02, 1], 
                y: [0, -20, 0] 
              }}
              transition={{ 
                opacity: { duration: 1, delay: 0.8 },
                scale: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.8 },
                y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.8 }
              }}
              className="w-48 md:w-64 h-64 md:h-80 bg-white/5 border border-white/20 rounded-xl shadow-2xl flex flex-col p-6 relative backdrop-blur-xl"
            >
              <div className="w-full h-2 bg-white/20 rounded-full mb-4"></div>
              <div className="w-3/4 h-2 bg-white/20 rounded-full mb-8"></div>
              
              <div className="w-full h-1 bg-white/10 rounded-full mb-3"></div>
              <div className="w-full h-1 bg-white/10 rounded-full mb-3"></div>
              <div className="w-5/6 h-1 bg-white/10 rounded-full mb-3"></div>
              <div className="w-full h-1 bg-white/10 rounded-full mb-3"></div>
              
              <div className="mt-auto flex justify-between items-end">
                <div className="w-1/2">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.5, delay: 1.5, ease: "easeInOut" }}
                    className="h-0.5 bg-accent-gold mb-1"
                  ></motion.div>
                  <div className="text-[8px] text-white/40 uppercase tracking-wider">Signature</div>
                </div>
                <motion.div 
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 2.5 }}
                  className="w-10 h-10 rounded-full border-2 border-accent-gold flex items-center justify-center text-accent-gold"
                >
                  <Stamp className="w-5 h-5" />
                </motion.div>
              </div>
            </motion.div>

            {/* Floating Icons */}
            <motion.div custom={10} variants={floatingVariants} animate="float" className="absolute top-1/4 left-1/4 md:left-1/3 text-white/30">
              <FileSignature className="w-12 h-12" />
            </motion.div>
            <motion.div custom={-15} variants={floatingVariants} animate="float" className="absolute bottom-1/4 right-1/4 md:right-1/3 text-accent-gold/40">
              <ShieldCheck className="w-16 h-16" />
            </motion.div>
            <motion.div custom={20} variants={floatingVariants} animate="float" className="absolute top-1/3 right-1/4 md:right-1/5 text-white/20">
              <ScrollText className="w-10 h-10" />
            </motion.div>
            <motion.div custom={-10} variants={floatingVariants} animate="float" className="absolute bottom-1/3 left-1/4 md:left-1/5 text-blue-400/30">
              <Scale className="w-14 h-14" />
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
