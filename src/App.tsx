/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { animate } from 'motion/react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Services from './components/Services';
import About from './components/About';
import WhyChooseUs from './components/WhyChooseUs';
import ServiceArea from './components/ServiceArea';
import Contact from './components/Contact';
import Footer from './components/Footer';
import LiveChat from './components/LiveChat';
import AdminPanel from './components/AdminPanel';

function HomePage() {
  const mainRef = useRef<HTMLElement>(null);
  const animationRef = useRef<any>(null);
  const previousYRef = useRef<number>(0);

  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      
      if (!anchor) return;
      
      const href = anchor.getAttribute('href');
      if (!href || !href.startsWith('#') || href === '#') return;
      
      const targetElement = document.querySelector(href);
      if (!targetElement) return;

      e.preventDefault();

      // Stop any ongoing scroll animation
      if (animationRef.current) {
        animationRef.current.stop();
      }

      // Calculate the target scroll position (accounting for fixed navbar)
      const navbarHeight = 96; // 6rem
      const targetY = targetElement.getBoundingClientRect().top + window.scrollY - navbarHeight;
      const currentY = window.scrollY;
      previousYRef.current = currentY;
      const distance = Math.abs(targetY - currentY);
      
      // Dynamic duration based on distance, capped between 0.8s and 1.5s
      const duration = Math.min(Math.max(distance / 1500, 0.8), 1.5);
      
      animationRef.current = animate(currentY, targetY, {
        duration: duration,
        ease: [0.22, 1, 0.36, 1], // Custom smooth easing (easeOutQuint)
        onUpdate: (latest) => {
          window.scrollTo(0, latest);
          
          // Calculate velocity (change in position)
          const velocity = Math.abs(latest - previousYRef.current);
          previousYRef.current = latest;
          
          // Map velocity to blur (e.g., 0 to 12px)
          // Higher velocity = more blur
          const blurIntensity = Math.min(velocity * 0.2, 12);
          
          if (mainRef.current) {
            mainRef.current.style.transition = 'filter 0.1s ease-out';
            mainRef.current.style.filter = `blur(${blurIntensity}px)`;
          }
        },
        onComplete: () => {
          // Remove motion blur effect
          if (mainRef.current) {
            mainRef.current.style.filter = 'blur(0px)';
            setTimeout(() => {
              if (mainRef.current) {
                mainRef.current.style.transition = '';
              }
            }, 300);
          }
          // Update URL hash without jumping
          window.history.pushState(null, '', href);
          animationRef.current = null;
        }
      });
    };

    // Cancel animation on manual scroll
    const handleManualScroll = () => {
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
        if (mainRef.current) {
          mainRef.current.style.filter = 'blur(0px)';
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);
    window.addEventListener('wheel', handleManualScroll, { passive: true });
    window.addEventListener('touchmove', handleManualScroll, { passive: true });

    return () => {
      document.removeEventListener('click', handleAnchorClick);
      window.removeEventListener('wheel', handleManualScroll);
      window.removeEventListener('touchmove', handleManualScroll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-light font-sans text-navy selection:bg-gold/30 selection:text-navy">
      <Navbar />
      <main ref={mainRef}>
        <Hero />
        <Services />
        <About />
        <WhyChooseUs />
        <ServiceArea />
        <Contact />
      </main>
      <Footer />
      <LiveChat />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Router>
  );
}
