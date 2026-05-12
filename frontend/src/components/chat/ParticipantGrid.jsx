import React, { useState, useEffect } from 'react';
import {
    VideoTrack,
    useTracks,
    useParticipants,
    useParticipantInfo,
    useTrackMutedIndicator,
    FocusLayout
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { X, Pin, User, Mic, MicOff, Maximize, Minimize, VideoOff } from 'lucide-react';

const CameraOffPlaceholder = ({ name, identity, size = "md" }) => (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/90 backdrop-blur-md gap-4 z-0">
        <div className={`rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center shadow-2xl ${
            size === "lg" ? 'w-32 h-32' : 'w-16 h-16 md:w-20 md:h-20'
        }`}>
            <User className={`${size === "lg" ? 'w-16 h-16' : 'w-8 h-8 md:w-10 md:h-10'} text-white/20`} />
        </div>
        <div className="flex flex-col items-center px-4 text-center">
            <div className="flex items-center gap-2 mb-1">
                <VideoOff className="w-3 h-3 text-rose-500" />
                <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Camera Off</span>
            </div>
            <span className={`text-white font-bold truncate max-w-[150px] ${size === "lg" ? 'text-lg' : 'text-xs'}`}>
                {name || identity}
            </span>
        </div>
    </div>
);

const ParticipantCard = ({ track, isFocused = false, onFocus, className = "", isPip = false, fit = "cover" }) => {
    const participant = track.participant;
    const { identity, name, isSpeaking } = useParticipantInfo({ participant });
    const { isMuted } = useTrackMutedIndicator(track);
    
    return (
        <div 
            onClick={(e) => {
                e.stopPropagation();
                if (onFocus) onFocus();
            }}
            className={`relative rounded-2xl md:rounded-3xl overflow-hidden group transition-all duration-500 border ${
                isSpeaking ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'border-white/10'
            } bg-zinc-900/50 ${onFocus ? 'cursor-pointer hover:border-white/30' : ''} ${className}`}
        >
            <div className="pointer-events-none w-full h-full relative">
                <VideoTrack 
                    trackRef={track} 
                    className={`${fit === 'cover' ? 'object-cover' : 'object-contain'} w-full h-full ${isMuted ? 'opacity-0' : 'opacity-100'} ${participant.isLocal && track.source === Track.Source.Camera ? '-scale-x-100' : ''}`}
                />
                {isMuted && track.source === Track.Source.Camera && (
                    <CameraOffPlaceholder name={name} identity={identity} />
                )}
            </div>
            
            {/* Status Bar - Smaller for PIP */}
            <div className={`absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none translate-y-1 group-hover:translate-y-0 transition-transform duration-300 ${isPip ? 'scale-75 origin-bottom-left' : ''}`}>
                <div className="bg-black/60 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 shadow-xl">
                    <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${isSpeaking ? 'bg-emerald-500 animate-pulse' : 'bg-white/20'}`} />
                    <span className="text-white text-[10px] md:text-xs font-semibold tracking-wide">
                        {name || identity} {participant.identity === 'local' ? '(You)' : ''}
                    </span>
                    {isMuted && (
                        <div className="w-px h-3 bg-white/20 mx-0.5" />
                    )}
                    {isMuted && (
                        <MicOff className="w-3 h-3 text-rose-500" />
                    )}
                </div>
            </div>

            {/* Hover Indicator for Sidebar */}
            {onFocus && (
                <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/10 flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100">
                     <Pin className="w-6 h-6 text-white drop-shadow-lg" />
                </div>
            )}
        </div>
    );
};

const ParticipantGrid = ({ callType }) => {
    const [focusTrack, setFocusTrack] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const mainAreaRef = React.useRef(null);
    const participants = useParticipants();

    const tracks = useTracks(
        [
            { source: Track.Source.Camera, withPlaceholder: true },
            { source: Track.Source.ScreenShare, withPlaceholder: false },
        ],
        { onlyConnected: true },
    );

    const screenShareTrack = tracks.find((t) => t.source === Track.Source.ScreenShare);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    useEffect(() => {
        if (screenShareTrack && !focusTrack) {
            setFocusTrack(screenShareTrack);
        } else if (!screenShareTrack && focusTrack?.source === Track.Source.ScreenShare) {
            setFocusTrack(null);
        }
    }, [screenShareTrack, focusTrack]);

    // VOICE LAYOUT
    if (callType === 'voice') {
        return (
            <div className="w-full h-full flex items-center justify-center bg-zinc-950 p-6 md:p-12 pb-40">
                <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 max-w-6xl">
                    {participants.map((p) => (
                        <VoiceParticipantKey key={p.identity} participant={p} />
                    ))}
                </div>
            </div>
        );
    }

    const activeFocusTrack = focusTrack || screenShareTrack;

    // 1v1 PIP LAYOUT (2 participants: you and one other)
    if (!activeFocusTrack && tracks.length === 2) {
        const localTrack = tracks.find(t => t.participant.identity === 'local' || t.participant.isLocal);
        const remoteTrack = tracks.find(t => t !== localTrack);

        if (localTrack && remoteTrack) {
            return (
                <div className="w-full h-full relative bg-black overflow-hidden">
                    {/* REMOTE PARTICIPANT (Full Screen) */}
                    <div className="absolute inset-0">
                        <ParticipantCard 
                            track={remoteTrack} 
                            className="w-full h-full rounded-none border-none"
                            fit="contain"
                        />
                    </div>

                    {/* LOCAL PARTICIPANT (Floating PIP) */}
                    <div className="absolute bottom-6 right-6 w-32 h-48 md:w-48 md:h-64 z-20 shadow-2xl transition-all duration-500 hover:scale-105">
                        <ParticipantCard 
                            track={localTrack} 
                            className="w-full h-full shadow-2xl ring-1 ring-white/10"
                            isPip={true}
                        />
                    </div>
                </div>
            );
        }
    }

    // Default Grid (1 or 3+ participants)
    if (!activeFocusTrack) {
        return (
            <div className="w-full h-full bg-black p-4 md:p-6">
                <div className={`grid gap-4 md:gap-6 h-full w-full ${
                    tracks.length === 1 ? 'grid-cols-1' : 
                    tracks.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 
                    'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                }`}>
                    {tracks.map((track) => (
                        <ParticipantCard 
                            key={`${track.participant.identity}-${track.source}`} 
                            track={track} 
                            className="h-full min-h-[200px]"
                        />
                    ))}
                </div>
            </div>
        );
    }

    // FOCUS LAYOUT (Screen Share or Manual Pin)
    return (
        <FocusedParticipantContent 
            activeFocusTrack={activeFocusTrack} 
            mainAreaRef={mainAreaRef} 
            isFullscreen={isFullscreen} 
            focusTrack={focusTrack}
            setFocusTrack={setFocusTrack}
            tracks={tracks}
        />
    );
};

const FocusedParticipantContent = ({ 
    activeFocusTrack, 
    mainAreaRef, 
    isFullscreen, 
    focusTrack, 
    setFocusTrack, 
    tracks 
}) => {
    const { isMuted: focusMuted } = useTrackMutedIndicator(activeFocusTrack);

    return (
        <div className="w-full h-full flex flex-col md:flex-row bg-black overflow-hidden relative">
            {/* MAIN CONTENT AREA */}
            <div 
                ref={mainAreaRef} 
                className={`relative bg-black flex items-center justify-center overflow-hidden transition-all duration-500 ${
                    isFullscreen ? 'fixed inset-0 z-[10001] m-0 rounded-none' : 'flex-[4] m-2 md:m-4 rounded-3xl border border-white/5 shadow-2xl'
                }`}
            >
                <FocusLayout trackRef={activeFocusTrack}>
                    <div className="w-full h-full relative">
                        <VideoTrack
                            trackRef={activeFocusTrack}
                            style={{ objectFit: 'contain' }}
                            className={`w-full h-full ${focusMuted && activeFocusTrack.source === Track.Source.Camera ? 'opacity-0' : 'opacity-100'} ${activeFocusTrack.participant.isLocal && activeFocusTrack.source === Track.Source.Camera ? '-scale-x-100' : ''}`}
                        />
                        {focusMuted && activeFocusTrack.source === Track.Source.Camera && (
                            <CameraOffPlaceholder 
                                name={activeFocusTrack.participant.name} 
                                identity={activeFocusTrack.participant.identity}
                                size="lg"
                            />
                        )}
                    </div>
                </FocusLayout>

                {/* Overlay Label for Focus */}
                <div className="absolute top-4 left-4 md:top-6 md:left-6 flex items-center gap-2 md:gap-3 bg-zinc-950/40 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl border border-white/5 z-10 shadow-lg">
                    <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${activeFocusTrack.source === Track.Source.ScreenShare ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`} />
                    <div className="flex flex-col">
                        <span className="text-white text-[10px] md:text-sm font-bold tracking-wide">
                            {activeFocusTrack.source === Track.Source.ScreenShare ? 'Presenting' : (activeFocusTrack.participant.name || activeFocusTrack.participant.identity)}
                        </span>
                        {activeFocusTrack.source === Track.Source.ScreenShare && !isFullscreen && (
                            <span className="text-white/40 text-[7px] md:text-[9px] uppercase font-black tracking-widest mt-0.5">High Quality Stream</span>
                        )}
                    </div>
                </div>

                <div className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center gap-2 z-10">
                    {activeFocusTrack.source === Track.Source.ScreenShare && activeFocusTrack.participant.identity === 'local' && (
                        <button
                            onClick={() => activeFocusTrack.participant.setScreenShareEnabled(false)}
                            className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl transition-all duration-300 shadow-xl flex items-center gap-2 text-[10px] md:text-xs font-bold"
                        >
                            <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            Stop
                        </button>
                    )}
                    
                    <button
                        onClick={() => {
                            if (!document.fullscreenElement) {
                                if (mainAreaRef.current) {
                                    if (mainAreaRef.current.requestFullscreen) {
                                        mainAreaRef.current.requestFullscreen();
                                    } else if (mainAreaRef.current.webkitRequestFullscreen) {
                                        mainAreaRef.current.webkitRequestFullscreen();
                                    }
                                }
                            } else {
                                document.exitFullscreen();
                            }
                        }}
                        className="bg-zinc-950/40 hover:bg-zinc-950/60 text-white p-2 md:p-2.5 rounded-xl md:rounded-2xl transition-all duration-300 border border-white/5 shadow-lg group"
                        title={isFullscreen ? "Exit Fullscreen" : "Maximize Stream"}
                    >
                        {isFullscreen ? (
                            <Minimize className="w-4 h-4 md:w-5 md:h-5 group-hover:scale-110 transition-transform" />
                        ) : (
                            <Maximize className="w-4 h-4 md:w-5 md:h-5 group-hover:scale-110 transition-transform" />
                        )}
                    </button>

                    {focusTrack && (
                        <button
                            onClick={() => setFocusTrack(null)}
                            className="bg-zinc-950/40 hover:bg-rose-500/80 text-white p-2 md:p-2.5 rounded-xl md:rounded-2xl transition-all duration-300 border border-white/5 shadow-lg group"
                            title="Unpin"
                        >
                            <Pin className="w-4 h-4 md:w-5 md:h-5 group-hover:rotate-45 transition-transform" />
                        </button>
                    )}
                </div>
            </div>

            {/* SIDEBAR - Hidden in Fullscreen or very compact on mobile */}
            {!isFullscreen && (
                <div className="flex-1 md:w-72 max-h-[25%] md:max-h-full flex flex-row md:flex-col gap-3 md:gap-4 overflow-x-auto md:overflow-y-auto p-2 md:p-4 md:pl-0 custom-scrollbar bg-black/40">
                    {tracks.filter(t => t !== activeFocusTrack).map((track) => (
                        <div key={`${track.participant.identity}-${track.source}`} className="w-40 md:w-full aspect-video flex-shrink-0">
                             <ParticipantCard 
                                track={track} 
                                onFocus={() => setFocusTrack(track)}
                                className="h-full"
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const MuteIndicator = ({ track, isSpeaking, fallbackMute }) => {
    const { isMuted } = useTrackMutedIndicator(track);
    const finalMuted = track ? isMuted : fallbackMute;
    
    return (
        <div className={`absolute bottom-1 right-1 p-2 rounded-full border-4 border-zinc-950 z-20 transition-colors duration-300 shadow-lg ${finalMuted ? 'bg-rose-500' : isSpeaking ? 'bg-emerald-500' : 'bg-zinc-800'}`}>
            {finalMuted ? <MicOff className="w-3.5 h-3.5 text-white" /> : <Mic className="w-3.5 h-3.5 text-white" />}
        </div>
    );
};

const VoiceParticipantKey = ({ participant }) => {
    const { identity, name, isSpeaking, isMicrophoneEnabled } = useParticipantInfo({ participant });
    
    // Find the audio track for this participant to get a reliable mute state
    const tracks = useTracks([{ source: Track.Source.Microphone }], { onlyConnected: true });
    const participantTrack = tracks.find(t => t.participant.identity === participant.identity);

    return (
        <div className="flex flex-col items-center gap-4 group">
            <div className={`relative transition-all duration-700 ${isSpeaking ? 'scale-110' : 'scale-100'}`}>
                {/* Multiple Pulse Rings */}
                {isSpeaking && (
                    <>
                        <div className="absolute inset-[-10px] rounded-full bg-emerald-500/10 animate-[ping_2s_infinite]" />
                        <div className="absolute inset-[-20px] rounded-full bg-emerald-500/5 animate-[ping_3s_infinite]" />
                    </>
                )}

                <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center bg-zinc-900 border-2 transition-all duration-500 z-10 relative shadow-2xl ${isSpeaking ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]' : 'border-white/10 group-hover:border-white/20'}`}>
                    <User className={`w-10 h-10 md:w-14 md:h-14 transition-colors duration-500 ${isSpeaking ? 'text-emerald-400' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
                </div>

                {participantTrack ? (
                    <MuteIndicator track={participantTrack} isSpeaking={isSpeaking} />
                ) : (
                    <div className={`absolute bottom-1 right-1 p-2 rounded-full border-4 border-zinc-950 z-20 transition-colors duration-300 shadow-lg ${!isMicrophoneEnabled ? 'bg-rose-500' : 'bg-zinc-800'}`}>
                        {!isMicrophoneEnabled ? <MicOff className="w-3.5 h-3.5 text-white" /> : <Mic className="w-3.5 h-3.5 text-white" />}
                    </div>
                )}
            </div>
            
            <div className="flex flex-col items-center">
                <p className={`text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase transition-colors duration-300 ${isSpeaking ? 'text-emerald-400' : 'text-white/60 group-hover:text-white'}`}>
                    {name || identity}
                </p>
                {isSpeaking && (
                    <span className="text-[8px] text-emerald-500/80 font-black uppercase tracking-tighter mt-1 animate-pulse">Speaking</span>
                )}
            </div>
        </div>
    );
};

export default ParticipantGrid;
