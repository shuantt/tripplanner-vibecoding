import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const [visible, setVisible] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setVisible(true);
    else setTimeout(() => setVisible(false), 300); // Animation delay
  }, [isOpen]);

  if (!visible) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center pointer-events-none`}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Content */}
      <div
        className={`bg-white w-full sm:w-[500px] sm:rounded-2xl rounded-t-2xl shadow-2xl pointer-events-auto transform transition-transform duration-300 max-h-[90vh] flex flex-col ${isOpen ? 'translate-y-0' : 'translate-y-full sm:translate-y-10 sm:opacity-0'}`}
      >
        {/* Sticky Header with Background */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white/95 backdrop-blur-sm rounded-t-2xl z-10 sticky top-0">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-6 pb-20 sm:pb-6">
          {children}
        </div>
      </div>
    </div>
  );
};