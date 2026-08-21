import { useEffect, useRef, useCallback } from 'react';
import { X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, description, children, maxWidth = 'max-w-2xl' }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus trap
  const handleTabKey = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !modalRef.current) return;
    
    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      handleTabKey(e);
    };

    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      
      // Focus the modal on open
      requestAnimationFrame(() => {
        modalRef.current?.focus();
      });
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
      
      // Restore focus
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose, handleTabKey]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          
          {/* Panel */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            ref={modalRef}
            tabIndex={-1}
            className={`relative w-full ${maxWidth} bg-canvas border border-border-subtle rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border-subtle shrink-0">
              <div>
                <h2 id="modal-title" className="text-h2 text-content-primary">{title}</h2>
                {description && <p className="text-body-sm text-content-secondary mt-1">{description}</p>}
              </div>
              <button 
                onClick={onClose}
                aria-label="Close dialog"
                className="p-2 text-content-muted hover:text-content-primary hover:bg-panel-hover rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
