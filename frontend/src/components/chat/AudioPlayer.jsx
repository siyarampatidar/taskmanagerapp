import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

const AudioPlayer = ({ src, isMe }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const setAudioData = () => setDuration(audio.duration);
        const setAudioTime = () => setCurrentTime(audio.currentTime);

        audio.addEventListener('loadeddata', setAudioData);
        audio.addEventListener('timeupdate', setAudioTime);
        audio.addEventListener('ended', () => setIsPlaying(false));

        return () => {
            audio.removeEventListener('loadeddata', setAudioData);
            audio.removeEventListener('timeupdate', setAudioTime);
        };
    }, []);

    const togglePlay = () => {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (time) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const handleProgressChange = (e) => {
        const time = Number(e.target.value);
        audioRef.current.currentTime = time;
        setCurrentTime(time);
    };

    return (
        <div className={`flex items-center gap-3 p-3 rounded-2xl min-w-[200px] ${isMe ? 'bg-indigo-700/40 text-white' : 'bg-white border border-gray-100 shadow-sm'}`}>
            <audio ref={audioRef} src={src} />
            
            <button 
                onClick={togglePlay}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isMe ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'}`}
            >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
            </button>

            <div className="flex-1 space-y-1">
                <input 
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleProgressChange}
                    className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${isMe ? 'accent-white bg-indigo-500/50' : 'accent-indigo-600 bg-gray-200'}`}
                />
                <div className="flex justify-between items-center px-1">
                    <span className={`text-[10px] font-bold ${isMe ? 'text-indigo-100' : 'text-gray-400'}`}>
                        {formatTime(currentTime)}
                    </span>
                    <span className={`text-[10px] font-bold ${isMe ? 'text-indigo-100' : 'text-gray-400'}`}>
                        {formatTime(duration)}
                    </span>
                </div>
            </div>

            <Volume2 className={`w-4 h-4 opacity-50 ${isMe ? 'text-white' : 'text-gray-400'}`} />
        </div>
    );
};

export default AudioPlayer;
