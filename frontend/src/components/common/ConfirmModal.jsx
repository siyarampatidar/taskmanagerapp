import React from 'react';
import { AlertCircle } from 'lucide-react';

const ConfirmModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = 'Confirm Action', 
    message = 'Are you sure you want to proceed?', 
    confirmText = 'Confirm', 
    cancelText = 'Cancel',
    type = 'danger' // 'danger', 'warning', 'info'
}) => {
    if (!isOpen) return null;

    const colors = {
        danger: 'bg-red-500 hover:bg-red-600 shadow-red-100',
        warning: 'bg-amber-500 hover:bg-amber-600 shadow-amber-100',
        info: 'bg-blue-500 hover:bg-blue-600 shadow-blue-100'
    };

    const iconColors = {
        danger: 'bg-red-50 text-red-500',
        warning: 'bg-amber-50 text-amber-500',
        info: 'bg-blue-50 text-blue-500'
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[300] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl animate-in zoom-in duration-200">
                <div className={`w-16 h-16 ${iconColors[type]} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                <p className="text-slate-500 text-xs mt-2">{message}</p>
                <div className="flex gap-3 mt-8">
                    <button 
                        onClick={onClose} 
                        className="flex-1 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 border-none outline-none transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button 
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }} 
                        className={`flex-1 ${colors[type]} text-white py-2 rounded-lg text-xs font-bold shadow-lg border-none outline-none transition-all active:scale-95`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
