import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto border-t border-gray-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <Link to="/" className="text-2xl font-display font-bold text-white hover:text-primary-400 transition-colors">Feedo</Link>
            <p className="mt-4 text-sm text-gray-400 max-w-md leading-relaxed">
              Fresh eats & groceries, right at your feet. Our premier food delivery service, where convenience meets quality.
            </p>
          </div>
          <div>
            <h4 className="font-display font-semibold text-white mb-5">Quick Links</h4>
            <ul className="space-y-3.5">
              <li><Link to="/" className="text-sm hover:text-primary-400 transition-colors">Home</Link></li>
              <li><Link to="/restaurants" className="text-sm hover:text-primary-400 transition-colors">Restaurants</Link></li>
              <li><Link to="/orders" className="text-sm hover:text-primary-400 transition-colors">Orders</Link></li>
              <li><Link to="/profile" className="text-sm hover:text-primary-400 transition-colors">Account</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-semibold text-white mb-5">Support</h4>
            <ul className="space-y-3.5">
              <li><button className="text-sm hover:text-primary-400 transition-colors bg-none border-none p-0 cursor-pointer">Help Center</button></li>
              <li><button className="text-sm hover:text-primary-400 transition-colors bg-none border-none p-0 cursor-pointer">Contact Us</button></li>
              <li><button className="text-sm hover:text-primary-400 transition-colors bg-none border-none p-0 cursor-pointer">Partner With Us</button></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-10 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">© {new Date().getFullYear()} Feedo. All rights reserved.</p>
          <div className="flex gap-6">
            <button className="text-gray-500 hover:text-gray-300 transition-colors bg-none border-none p-0 cursor-pointer">
              <span className="sr-only">Twitter</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </button>
            <button className="text-gray-500 hover:text-gray-300 transition-colors bg-none border-none p-0 cursor-pointer">
              <span className="sr-only">Instagram</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/></svg>
            </button>
            <button className="text-gray-500 hover:text-gray-300 transition-colors bg-none border-none p-0 cursor-pointer">
              <span className="sr-only">Facebook</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
