import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { X, Send, Mail } from 'lucide-react';
import { sendBulkEmail } from '../../redux/slices/crmSlice';
import { toast } from 'react-hot-toast';

export default function EmailSlideOver({ 
    isOpen, 
    onClose, 
    selectedItems, 
    onSuccess 
}) {
    const dispatch = useDispatch();
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    // Extract valid emails. Assuming selectedItems comes as array of { _id, email, name, ... }.
    // For deals, we might need contactId.email or accountId.email depending on what's available.
    // For now, we expect the sender to pass normalized `selectedItems` objects containing `{ email, name }`.
    const validRecipients = selectedItems.filter(item => item.email);

    const handleSend = async (e) => {
        e.preventDefault();
        if (validRecipients.length === 0) {
            return toast.error("None of the selected records have a valid email address.");
        }
        if (!subject.trim() || !message.trim()) {
            return toast.error("Subject and Message are required.");
        }

        setIsSending(true);
        const emails = validRecipients.map(r => r.email);
        
        try {
            const res = await dispatch(sendBulkEmail({ emails, subject, message }));
            if (sendBulkEmail.fulfilled.match(res)) {
                toast.success('Emails sent successfully!');
                setSubject('');
                setMessage('');
                if (onSuccess) onSuccess();
                onClose();
            } else {
                toast.error(res.payload || 'Failed to send emails');
            }
        } catch (err) {
            toast.error('An error occurred');
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex justify-end">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] transition-opacity" 
                onClick={onClose}
            ></div>

            {/* Slide-over Panel */}
            <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col transform translate-x-0 transition-transform duration-300 animate-in slide-in-from-right">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                            <Mail className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                                Compose Email
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400">
                                Sending to {validRecipients.length} recipient(s)
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Body */}
                <form id="emailForm" onSubmit={handleSend} className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {/* To Field */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            To :
                        </label>
                        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl min-h-[44px]">
                            {validRecipients.length > 0 ? (
                                validRecipients.map((rec, i) => (
                                    <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 shadow-sm whitespace-nowrap">
                                        <span className="text-slate-800">{rec.name || 'No Name'}</span>
                                        <span className="text-slate-400 font-medium">&lt;{rec.email}&gt;</span>
                                    </div>
                                ))
                            ) : (
                                <span className="text-xs text-red-500 font-medium my-auto">No valid email addresses found in selection</span>
                            )}
                        </div>
                    </div>

                    {/* Subject Field */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            Subject *
                        </label>
                        <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none"
                            placeholder="Enter email subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            required
                        />
                    </div>

                    {/* Rich text equivalent (textarea for now) */}
                    <div className="flex-1 flex flex-col">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            Message Body *
                        </label>
                        <textarea 
                            className="w-full flex-1 min-h-[300px] bg-slate-50 border border-slate-100 p-4 rounded-xl text-[13px] font-medium leading-relaxed resize-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none"
                            placeholder="Type your message here..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            required
                        />
                    </div>
                </form>

                {/* Footer Action */}
                <div className="p-4 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 mt-auto">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-200/50 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        form="emailForm"
                        type="submit" 
                        disabled={isSending || validRecipients.length === 0}
                        className="btn-primary px-8 py-2.5 text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-100 hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {isSending ? (
                            'Sending...'
                        ) : (
                            <>
                                <Send className="w-3.5 h-3.5" /> Send Email
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}
