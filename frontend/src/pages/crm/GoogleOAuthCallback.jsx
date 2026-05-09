import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const GoogleOAuthCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get('code');
            if (!code) {
                toast.error('No authorization code found');
                navigate('/dashboard/crm?tab=settings');
                return;
            }

            try {
                const token = localStorage.getItem('teamflow_token');
                await axios.post(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/crm/auth/google/callback`, 
                    { code },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                toast.success('Gmail connected successfully!');
                navigate('/dashboard/crm?tab=settings');
            } catch (error) {
                console.error('OAuth Callback Error:', error);
                toast.error(error.response?.data?.message || 'Authentication failed');
                navigate('/dashboard/crm?tab=settings');
            } finally {
                setLoading(false);
            }
        };

        handleCallback();
    }, [searchParams, navigate]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <div className="p-8 bg-white rounded-xl shadow-lg text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold text-gray-800">Connecting Your Gmail...</h2>
                <p className="text-gray-500 mt-2">Please wait while we finalize the setup.</p>
            </div>
        </div>
    );
};

export default GoogleOAuthCallback;
