import React from 'react';
import { X, Copy, Check, MessageCircle, Twitter, Facebook } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './Button';
import { useState } from 'react';
import { cn } from '../lib/utils';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

export default function ShareModal({ isOpen, onClose, url, title }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLinks = [
    {
      name: 'WhatsApp',
      icon: <MessageCircle className="text-white" size={24} />,
      href: `https://wa.me/?text=${encodeURIComponent(`${title} - ${url}`)}`,
      color: 'bg-[#25D366] hover:shadow-[#25D366]/40'
    },
    {
      name: 'Twitter',
      icon: <Twitter className="text-white" size={24} />,
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
      color: 'bg-[#1DA1F2] hover:shadow-[#1DA1F2]/40'
    },
    {
      name: 'Facebook',
      icon: <Facebook className="text-white" size={24} />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      color: 'bg-[#1877F2] hover:shadow-[#1877F2]/40'
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            role="dialog" aria-modal="true" aria-label="Compartilhar"
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
          />
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[101] p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-sm pointer-events-auto overflow-hidden shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter text-brand-black">Compartilhar</h3>
                  <button onClick={onClose} aria-label="Fechar" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-3">
                    {shareLinks.map((link) => (
                      <motion.a
                        key={link.name}
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        whileHover={{ y: -4, scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`flex flex-col items-center justify-center gap-2 p-5 rounded-[2rem] transition-all shadow-lg ${link.color}`}
                      >
                        {link.icon}
                        <span className="text-[9px] font-black uppercase tracking-widest text-white">
                          {link.name}
                        </span>
                      </motion.a>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Link do restaurante</label>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl p-2 pl-4">
                      <input 
                        type="text" 
                        readOnly 
                        value={url} 
                        className="bg-transparent border-none outline-none text-xs font-bold text-slate-600 flex-1 truncate"
                      />
                      <Button 
                        size="sm" 
                        onClick={handleCopy}
                        className={cn(
                          "h-10 px-4 rounded-xl transition-all",
                          copied ? "bg-green-500 text-white" : "bg-brand-black text-white"
                        )}
                      >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
