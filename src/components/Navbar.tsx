import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'What We Do', href: '#services' },
    { name: 'Our Approach', href: '#why-us' },
    { name: 'About Us', href: '#about' },
    { name: 'Service Areas', href: '#areas' },
  ];

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl z-50">
      <motion.div 
        initial={false}
        animate={{
          paddingTop: isScrolled ? "0.4rem" : "0.6rem",
          paddingBottom: isScrolled ? "0.4rem" : "0.6rem",
          backgroundColor: isScrolled ? "rgba(255, 255, 255, 0.9)" : "rgba(255, 255, 255, 1)",
          backdropFilter: isScrolled ? "blur(12px)" : "blur(0px)",
          boxShadow: isScrolled ? "0 10px 40px -10px rgba(0,0,0,0.15)" : "0 8px 30px rgba(0,0,0,0.12)",
        }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="rounded-full px-6 md:px-8 flex justify-between items-center border border-black/5"
      >
        {/* Logo */}
        <a href="#" className="flex items-center gap-3 shrink-0">
          <motion.img 
            initial={false}
            animate={{ height: isScrolled ? "2rem" : "2.75rem" }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            src="https://i.imgur.com/wXlz80g.png" 
            alt="RNE Premier Mobile Notary" 
            className="w-auto"
            referrerPolicy="no-referrer"
          />
          <span className="font-bold text-base md:text-lg tracking-tight text-black hidden sm:block whitespace-nowrap">
            RNE Premier Mobile Notary
          </span>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 lg:gap-10">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-sm font-medium text-black/70 hover:text-black transition-colors"
            >
              {link.name}
            </a>
          ))}
        </nav>

        {/* CTA Button */}
        <div className="hidden md:block shrink-0">
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
            className="bg-accent-gold hover:bg-accent-gold-dark text-black font-semibold px-6 py-2.5 rounded-full transition-all duration-300 text-sm shadow-lg shadow-accent-gold/30 inline-block whitespace-nowrap"
          >
            Contact
          </motion.a>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden text-black p-2 shrink-0"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </motion.div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden absolute top-full left-4 right-4 mt-2 bg-white rounded-3xl shadow-xl border border-black/5 overflow-hidden pointer-events-auto"
          >
            <div className="px-6 py-6 flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-base font-medium text-black/80 hover:text-black transition-colors block py-2"
                >
                  {link.name}
                </a>
              ))}
              <a
                href="#contact"
                onClick={() => setIsMobileMenuOpen(false)}
                className="bg-accent-gold text-black font-semibold px-6 py-3 rounded-full text-center mt-2"
              >
                Contact
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
