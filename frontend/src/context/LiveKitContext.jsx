import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { 
    incomingCall, 
    callAccepted, 
    initiateCall as startCalling, 
    resetCall,
    setScreenSharing,
    callEnded
} from '../redux/slices/callSlice';
import { apiConnector } from '../Services/apiConnector';
import { livekitEndpoints } from '../Services/apis';


export const LiveKitContext = createContext();

const RING_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3';
const CALLING_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/135/135-preview.mp3';


export const LiveKitProvider = ({ children }) => {
    const dispatch = useDispatch();
    const call = useSelector((state) => state.call);
    const { user } = useSelector((state) => state.auth);
    
    const [token, setToken] = useState(null);
    const [liveKitUrl, setLiveKitUrl] = useState(null);
    
    const ringtoneRef = useRef(null);
    const callingToneRef = useRef(null);

    useEffect(() => {
        try {
            ringtoneRef.current = new Audio(RING_SOUND_URL);
            callingToneRef.current = new Audio(CALLING_SOUND_URL);
            ringtoneRef.current.loop = true;
            callingToneRef.current.loop = true;
            ringtoneRef.current.load();
            callingToneRef.current.load();
        } catch (error) {
            console.error('Audio initialization error:', error);
        }

        // --- Persistent Call Recovery ---
        const recoveredCall = localStorage.getItem('active_call');
        if (recoveredCall && user) {
            const parsedCall = JSON.parse(recoveredCall);
            const now = Date.now();
            
            // If the call is less than 10 minutes old, try to recover
            if (now - parsedCall.timestamp < 10 * 60 * 1000) {
                if (parsedCall.activeCall) {
                    // Re-fetch token and join
                    getLiveKitToken(parsedCall.roomName).then(newToken => {
                        if (newToken) {
                            dispatch(callAccepted({ 
                                roomName: parsedCall.roomName,
                                type: parsedCall.type,
                                callerId: parsedCall.callerId,
                                callerName: parsedCall.callerName
                            }));
                        }
                    });
                }
            } else {
                localStorage.removeItem('active_call');
            }
        }

        return () => {
            stopSounds();
        };
    }, [user]); // Re-run when user is loaded

    // Persist call state whenever it changes
    useEffect(() => {
        if (call.activeCall || call.isCalling) {
            localStorage.setItem('active_call', JSON.stringify({
                ...call,
                timestamp: Date.now()
            }));
        } else {
            localStorage.removeItem('active_call');
        }
    }, [call]);



    const stopSounds = () => {
        if (ringtoneRef.current) {
            ringtoneRef.current.pause();
            ringtoneRef.current.currentTime = 0;
        }
        if (callingToneRef.current) {
            callingToneRef.current.pause();
            callingToneRef.current.currentTime = 0;
        }
    };

    useEffect(() => {
        const playSound = async () => {
            try {
                if (call.receivingCall && !call.activeCall) {
                    await ringtoneRef.current?.play();
                } else if (call.isCalling && !call.activeCall) {
                    await callingToneRef.current?.play();
                } else {
                    stopSounds();
                }
            } catch (error) {
                console.warn('Audio play blocked or failed:', error);
            }
        };
        playSound();
    }, [call.receivingCall, call.isCalling, call.activeCall]);


    const emitSocket = (event, data) => {
        dispatch({ type: 'socket/emit', payload: { event, data } });
    };

    const getLiveKitToken = async (roomName) => {
        try {
            const res = await apiConnector('POST', livekitEndpoints.GET_TOKEN_API, {
                roomName,
                participantName: user?.name || 'Guest User'
            });


            if (res.data.success) {
                setToken(res.data.token);
                setLiveKitUrl(res.data.url);
                return res.data.token;
            }
        } catch (error) {
            console.error('Token fetch error:', error);
            toast.error('Failed to get call token');
        }
        return null;
    };

    const initiateCall = async (targetId, targetName, callType = 'video', isChannel = false) => {
        if (!user) return;
        
        const roomName = isChannel ? `channel-${targetId}` : `call-${[user.id || user._id, targetId].sort().join('-')}`;
        
        dispatch(startCalling({ 
            userId: targetId, 
            userName: targetName, 
            type: callType, 
            roomName,
            isChannel,
            channelId: isChannel ? targetId : null
        }));

        emitSocket('inviteToCall', {
            userToCall: targetId,
            roomName,
            type: callType,
            fromName: user.name,
            fromId: user.id || user._id,
            isChannel,
            channelId: isChannel ? targetId : null
        });

        const token = await getLiveKitToken(roomName);
        if (token) {
            // Token fetched, wait for acceptance or join if channel call
            if (isChannel) {
                dispatch(callAccepted({ roomName }));
            }
        }
    };

    const answerCall = async () => {
        stopSounds();
        if (call.roomName) {
            emitSocket('acceptCall', { 
                to: call.callerId, 
                roomName: call.roomName 
            });
            const token = await getLiveKitToken(call.roomName);
            if (token) {
                dispatch(callAccepted());
            }
        }
    };

    const rejectCall = () => {
        stopSounds();
        emitSocket('rejectCall', { to: call.callerId });
        dispatch(resetCall());
    };

    const leaveCall = () => {
        stopSounds();
        const target = call.isChannelCall ? call.channelId : call.callerId;
        if (target) {
            emitSocket('endCall', { to: target });
        }
        setToken(null);
        setLiveKitUrl(null);
        dispatch(resetCall());
    };

    // Socket listeners for call status (These should be handled in a global socket listener, but we can hook into them here if needed)
    // Actually, socket events should update Redux, and context reacts to Redux.
    
    return (
        <LiveKitContext.Provider value={{ 
            call, 
            token, 
            liveKitUrl, 
            initiateCall, 
            answerCall, 
            rejectCall, 
            leaveCall 
        }}>
            {children}
        </LiveKitContext.Provider>
    );
};

export const useLiveKit = () => {
    const context = useContext(LiveKitContext);
    if (!context) throw new Error('useLiveKit must be used within a LiveKitProvider');
    return context;
};
