import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
    Mail, ShieldCheck, ExternalLink, Trash2, 
    RefreshCcw, Search, ChevronRight, User, 
    Calendar, Send, MessageSquare
} from 'lucide-react';
import EmailSettings from './EmailSettings';

const Inbox = () => {
    const [status, setStatus] = useState({ connected: false, email: '' });
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchingMessages, setFetchingMessages] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [sendingReply, setSendingReply] = useState(false);

    const API_URL = import.meta.env.VITE_BACKEND_URL || 'https://taskmanagerapp-backend-kv8n.onrender.com';

    const fetchStatus = async () => {
        try {
            const token = localStorage.getItem('teamflow_token');
            const res = await axios.get(`${API_URL}/api/crm/auth/google/status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStatus({ connected: res.data.connected, email: res.data.email });
            if (res.data.connected) {
                fetchMessages();
            }
        } catch (error) {
            console.error('Fetch status error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async () => {
        setFetchingMessages(true);
        try {
            const token = localStorage.getItem('teamflow_token');
            const res = await axios.get(`${API_URL}/api/crm/auth/google/messages`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(res.data);
        } catch (error) {
            console.error('Fetch messages error:', error);
            toast.error('Failed to fetch emails');
        } finally {
            setFetchingMessages(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const handleSendReply = async () => {
        if (!replyText.trim()) return;
        setSendingReply(true);
        try {
            const token = localStorage.getItem('teamflow_token');
            // Assuming we use the same send-email endpoint but with specific thread/reply logic
            // For now, let's use the bulk-email logic but targeted at the sender
            const senderEmail = selectedMessage.from.match(/<(.+)>/)?.[1] || selectedMessage.from;
            
            await axios.post(`${API_URL}/api/crm/send-email`, {
                emails: [senderEmail],
                subject: `Re: ${selectedMessage.subject}`,
                message: replyText
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success('Reply sent!');
            setReplyText('');
            setSelectedMessage(null);
        } catch (error) {
            toast.error('Failed to send reply');
        } finally {
            setSendingReply(false);
        }
    };

    if (loading) return (
        <div className="flex animate-pulse items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 bg-gray-100 rounded-full"></div>
                <div className="h-4 w-48 bg-gray-100 rounded"></div>
            </div>
        </div>
    );

    if (!status.connected) {
        return (
            <div className="max-w-xl mx-auto py-20 text-center">
                <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-blue-600 shadow-sm shadow-blue-100">
                    <Mail className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Gmail Not Connected</h2>
                <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                    Connect your business Gmail account to see your messages, <br />
                    track lead conversations, and reply directly from TeamFlow.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button 
                        onClick={() => window.location.search = '?tab=settings'}
                        className="btn-primary pl-6 pr-8 py-3.5 text-xs font-black uppercase tracking-widest flex items-center gap-3 shadow-blue-200"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Setup Email Connection
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto h-[calc(100vh-200px)] flex flex-col">
            {/* INBOX HEADER */}
            <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-blue-50 rounded-xl">
                        <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Shared Inbox</h2>
                        <p className="text-xs text-slate-400 font-medium">{status.email}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={fetchMessages}
                        disabled={fetchingMessages}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                        <RefreshCcw className={`w-4 h-4 ${fetchingMessages ? 'animate-spin' : ''}`} />
                    </button>
                    <button 
                        onClick={() => window.location.hash = 'settings'} // Placeholder or internal state
                        className="btn-secondary px-3 py-1.5 text-[11px] font-bold"
                    >
                        Account Settings
                    </button>
                </div>
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden">
                {/* MESSAGES LIST */}
                <div className={`flex-1 flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ${selectedMessage ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-slate-50 flex items-center gap-3 bg-slate-50/30">
                        <Search className="w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search in inbox..." 
                            className="bg-transparent text-xs font-medium w-full focus:outline-none"
                        />
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                                <MessageSquare className="w-8 h-8 opacity-20" />
                                <p className="text-xs font-bold uppercase tracking-widest">No messages found</p>
                            </div>
                        ) : (
                            messages.map((msg) => (
                                <div 
                                    key={msg.id}
                                    onClick={() => setSelectedMessage(msg)}
                                    className={`p-4 border-b border-slate-50 cursor-pointer transition-all hover:bg-blue-50/30 relative ${selectedMessage?.id === msg.id ? 'bg-blue-50/50 border-l-4 border-l-blue-600' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="text-[11px] font-black text-slate-800 truncate pr-4">{msg.from.split('<')[0] || msg.from}</p>
                                        <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">
                                            {new Date(msg.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <h4 className="text-[11px] font-bold text-slate-600 truncate mb-1">{msg.subject}</h4>
                                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{msg.snippet}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* MESSAGE DETAIL & REPLY */}
                <div className={`flex-[1.5] bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col ${!selectedMessage ? 'hidden md:flex items-center justify-center bg-slate-50/30' : 'flex'}`}>
                    {selectedMessage ? (
                        <>
                            <div className="p-6 border-b border-slate-50">
                                <div className="flex items-center justify-between mb-6">
                                    <button 
                                        onClick={() => setSelectedMessage(null)}
                                        className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600"
                                    >
                                        <ChevronRight className="w-5 h-5 rotate-180" />
                                    </button>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                            {selectedMessage.from[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-800">{selectedMessage.from}</h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Calendar className="w-3 h-3 text-slate-400" />
                                                <span className="text-[10px] text-slate-400 font-medium">{selectedMessage.date}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <h1 className="text-lg font-bold text-slate-800 leading-tight">{selectedMessage.subject}</h1>
                            </div>

                            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar text-sm text-slate-600 leading-relaxed">
                                <div dangerouslySetInnerHTML={{ __html: selectedMessage.snippet + "..." }} />
                                <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100 italic text-xs text-slate-400">
                                    Note: This is a preview. To see full HTML formatting, open in Gmail or we can implement full parsing later.
                                </div>
                            </div>

                            {/* REPLY AREA */}
                            <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                                <div className="relative bg-white border border-slate-200 rounded-2xl overflow-hidden focus-within:border-blue-400 transition-all shadow-sm">
                                    <textarea 
                                        placeholder={`Reply to ${selectedMessage.from}...`}
                                        rows="4"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        className="w-full p-4 text-xs font-medium focus:outline-none resize-none"
                                    />
                                    <div className="px-4 py-3 bg-slate-50/50 flex justify-between items-center">
                                        <p className="text-[10px] text-slate-400">Sending as {status.email}</p>
                                        <button 
                                            onClick={handleSendReply}
                                            disabled={sendingReply || !replyText.trim()}
                                            className="btn-primary pl-4 pr-5 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-blue-200"
                                        >
                                            {sendingReply ? (
                                                <RefreshCcw className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <Send className="w-3 h-3" />
                                            )}
                                            Send Reply
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-4">
                                <Mail className="w-8 h-8 text-slate-200" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-400 tracking-wider">SELECT A MESSAGE TO READ</h3>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Inbox;
