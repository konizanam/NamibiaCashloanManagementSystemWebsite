import { Link } from 'react-router-dom';
import { Logo } from './Logo';

export const Footer = () => (
  <footer className="bg-brand-navy text-slate-300 mt-20">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid md:grid-cols-3 gap-10">
      <div>
        <Logo variant="light" className="h-16 w-auto" />
        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          NAMFISA-aligned, secure, and built for Namibian microlenders. Delivered by{' '}
          <a
            href="https://it.konizanam.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white font-semibold hover:text-brand-amber underline-offset-2 hover:underline"
          >
            Koniza Information Technology
          </a>
          .
        </p>
      </div>

      <div>
        <div className="text-white font-semibold mb-3">Quick Links</div>
        <ul className="space-y-2 text-sm">
          <li><Link to="/" className="hover:text-white">Home</Link></li>
          <li><Link to="/about" className="hover:text-white">About</Link></li>
          <li><Link to="/features" className="hover:text-white">Features</Link></li>
          <li><Link to="/pricing" className="hover:text-white">Pricing</Link></li>
          <li><Link to="/apply" className="hover:text-white">Apply Online</Link></li>
          <li>
            <a
              href="https://demo.konizafs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-amber hover:text-yellow-300 font-semibold"
            >
              Live Demo ↗
            </a>
          </li>
          <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
        </ul>
      </div>

      <div>
        <div className="text-white font-semibold mb-3">Koniza Information Technology</div>
        <ul className="space-y-2 text-sm text-slate-400">
          <li>ERF 6239, Samuel Shikomba Street</li>
          <li>Windhoek, Namibia</li>
          <li><a href="tel:+264814657337" className="hover:text-white">+264 81 465 7337</a></li>
          <li><a href="mailto:it@konizanam.com" className="hover:text-white">it@konizanam.com</a></li>
          <li>
            <a
              href="https://it.konizanam.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white font-semibold text-brand-amber"
            >
              it.konizanam.com ↗
            </a>
          </li>
        </ul>
      </div>
    </div>
    <div className="border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-xs text-slate-500 flex flex-col sm:flex-row justify-between gap-2">
        <div>© {new Date().getFullYear()} Koniza Information Technology. All rights reserved.</div>
        <div>NAMFISA-aligned reporting only. Does not replace accounting, tax, or legal services.</div>
      </div>
    </div>
  </footer>
);
