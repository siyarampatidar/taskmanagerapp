import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Mail, ShieldCheck, ExternalLink, Trash2 } from 'lucide-react';
import ConfirmModal from '../common/ConfirmModal';

const EmailSettings = () => {
    const [status, setStatus] = useState({ connected: false, email: '' });
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const fetchStatus = async () => {
        try {
            const token = localStorage.getItem('teamflow_token');
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/crm/auth/google/status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStatus({ connected: res.data.connected, email: res.data.email });
        } catch (error) {
            console.error('Fetch status error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const handleConnect = async () => {
        try {
            const token = localStorage.getItem('teamflow_token');
            const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/crm/auth/google/url`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            window.location.href = res.data.url;
        } catch (error) {
            toast.error('Failed to get authorization URL');
        }
    };

    const handleDisconnect = () => {
        setShowDeleteModal(true);
    };

    const confirmDisconnect = async () => {
        try {
            const token = localStorage.getItem('teamflow_token');
            await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/crm/auth/google/disconnect`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStatus({ connected: false, email: '' });
            toast.success('Gmail disconnected successfully');
        } catch (error) {
            toast.error('Failed to disconnect');
        }
    };

    if (loading) return (
        <div className="flex animate-pulse items-center justify-center py-12">
            <div className="h-6 w-32 bg-gray-200 rounded"></div>
        </div>
    );

    return (
        <div className="max-w-2xl mx-auto py-8">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Mail className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Email Connection</h2>
                            <p className="text-sm text-gray-500 text-nowrap">Send emails using your own business account</p>
                        </div>
                    </div>
                    {status.connected ? (
                        <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Connected
                        </span>
                    ) : (
                        <span className="px-3 py-1 bg-gray-50 text-gray-600 text-xs font-medium rounded-full text-nowrap">
                            Not Connected
                        </span>
                    )}
                </div>

                <div className="p-6">
                    {status.connected ? (
                        <div className="space-y-6">
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Authenticated Email</p>
                                <p className="text-gray-900 font-medium">{status.email}</p>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                <div className="text-sm text-gray-500">
                                    Emails will now be sent from this address.
                                </div>
                                <button 
                                    onClick={handleDisconnect}
                                    className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Disconnect
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <div className="mb-6">
                                <p className="text-sm text-gray-600 mb-4">
                                    By connecting your Gmail account, our CRM can send emails directly through Google's professional SMTP. This improves deliverability and shows your business identity to clients.
                                </p>
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-50 text-yellow-700 text-xs rounded-lg border border-yellow-100">
                                    <span>Google Cloud OAuth verification is required for non-test accounts.</span>
                                </div>
                            </div>

                            <button 
                                onClick={handleConnect}
                                className="group inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
                            >
                                <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                Connect Direct Gmail
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                    <h3 className="text-sm font-semibold text-indigo-900 mb-2">Professional Identity</h3>
                    <p className="text-xs text-indigo-700">Client replies will go directly to your Google inbox, not the CRM's system email.</p>
                </div>
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100/50">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">High Deliverability</h3>
                    <p className="text-xs text-blue-700">Emails sent via Google API are much less likely to end up in the client's spam folder.</p>
                </div>
            </div>
            {showDeleteModal && (
                <ConfirmModal 
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    onConfirm={confirmDisconnect}
                    title="Disconnect Gmail"
                    message="Are you sure you want to disconnect your Gmail? Emails will fallback to system default."
                />
            )}
        </div>
    );
};

export default EmailSettings;
