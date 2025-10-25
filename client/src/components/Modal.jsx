import React from 'react';
import { FaTimes } from 'react-icons/fa';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) {
    return null;
  }

  return (
    // Backdrop
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center"
      onClick={onClose} 
    >
      {/* Modal Content - Removed dark: classes */}
      <div
        className="bg-white p-6 rounded-lg shadow-xl z-50 w-full max-w-lg"
        onClick={e => e.stopPropagation()} 
      >
        {/* Modal Header - Removed dark: classes */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <FaTimes size={20} />
          </button>
        </div>
        
        {/* Modal Body */}
        <div>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;