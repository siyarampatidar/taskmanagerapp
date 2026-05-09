import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, X } from 'lucide-react';

const VoiceRecorder = ({ onSend, onCancel }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);
    const mediaRecorderRef = useRef(null);
    const timerRef = useRef(null);
    const chunksRef = useRef([]);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Could not access microphone');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSend = () => {
        if (audioBlob) {
            onSend(audioBlob);
            setAudioBlob(null);
            setRecordingTime(0);
        }
    };

    const handleTrash = () => {
        setAudioBlob(null);
        setRecordingTime(0);
        onCancel?.();
    };

    return (
        <div className="flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100 animate-in slide-in-from-bottom-2">
            {!audioBlob ? (
                <>
                    <div className="flex items-center gap-2 flex-1">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[11px] font-black text-indigo-600 uppercase tracking-widest tabular-nums">
                            Recording: {formatTime(recordingTime)}
                        </span>
                    </div>
                    <button 
                        type="button"
                        onClick={stopRecording}
                        className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-lg shadow-red-100 transition-all"
                    >
                        <Square className="w-5 h-5 fill-current" />
                    </button>
                    <button 
                        type="button"
                        onClick={onCancel}
                        className="p-2 text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </>
            ) : (
                <>
                    <div className="flex items-center gap-2 flex-1">
                        <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest">
                            Voice Message ({formatTime(recordingTime)})
                        </span>
                    </div>
                    <button 
                        type="button"
                        onClick={handleTrash}
                        className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-gray-200"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                    <button 
                        type="button"
                        onClick={handleSend}
                        className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                    >
                        <Send className="w-5 h-5 fill-current ml-0.5" />
                    </button>
                </>
            )}

            {!isRecording && !audioBlob && (
                <button 
                    type="button"
                    onClick={startRecording}
                    className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center"
                >
                    <Mic className="w-5 h-5" />
                </button>
            )}
        </div>
    );
};

export default VoiceRecorder;
