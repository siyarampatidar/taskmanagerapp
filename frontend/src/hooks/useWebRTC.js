import { useContext } from 'react';
import { LiveKitContext } from '../context/LiveKitContext';

export const useWebRTC = () => {
    const context = useContext(LiveKitContext);
    if (!context) {
        throw new Error('useWebRTC must be used within a LiveKitProvider');
    }
    return context;
};
