import { Phone, Mail, MapPin, Clock } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#050B14] pt-20 pb-10 relative overflow-hidden text-white/60">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Brand */}
          <div className="space-y-6">
            <a href="#" className="inline-block">
              <img 
                src="https://i.imgur.com/wXlz80g.png" 
                alt="RNE Premier Mobile Notary" 
                className="h-16 w-auto"
                referrerPolicy="no-referrer"
              />
            </a>
            <p className="text-sm leading-relaxed max-w-xs">
              Fast, reliable, and professional mobile notary services in Scottsdale, Phoenix, and throughout Maricopa County. We come to you.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-lg mb-6">Quick Links</h4>
            <ul className="space-y-4">
              {['Home', 'Services', 'About', 'Contact'].map((link) => (
                <li key={link}>
                  <a href={`#${link.toLowerCase()}`} className="text-sm hover:text-white transition-colors flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-accent-gold/50"></span>
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-white font-bold text-lg mb-6">Our Services</h4>
            <ul className="space-y-4">
              {['Mobile Notary', 'Loan Signing', 'Real Estate Documents', 'Trust Documents', 'Power of Attorney'].map((service) => (
                <li key={service}>
                  <a href="#services" className="text-sm hover:text-white transition-colors flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-accent-gold-dark/50"></span>
                    {service}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-bold text-lg mb-6">Contact Us</h4>
            <ul className="space-y-4">
              <li>
                <a href="tel:4805285873" className="text-sm hover:text-white transition-colors flex items-start gap-3">
                  <Phone className="w-4 h-4 text-accent-gold shrink-0 mt-0.5" />
                  <span>(480) 528-5873</span>
                </a>
              </li>
              <li>
                <a href="mailto:rodney@rnepremiermobilenotary.com" className="text-sm hover:text-white transition-colors flex items-start gap-3 break-all">
                  <Mail className="w-4 h-4 text-accent-gold-light shrink-0 mt-0.5" />
                  <span>rodney@rnepremiermobilenotary.com</span>
                </a>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <MapPin className="w-4 h-4 text-accent-gold-dark shrink-0 mt-0.5" />
                <span>Scottsdale, AZ<br/>Serving Maricopa County</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <Clock className="w-4 h-4 text-accent-gold shrink-0 mt-0.5" />
                <span>Mon - Sun: 7:00 AM - 9:00 PM<br/>Evenings & Weekends Available</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <p>&copy; {currentYear} RNE Premier Mobile Notary. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
