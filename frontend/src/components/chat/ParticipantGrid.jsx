import React, { useState, useEffect } from 'react';
import {
    ParticipantTile,
    useTracks,
    useParticipants,
    useParticipantInfo,
    useTrackMutedIndicator,
    FocusLayout,
    GridLayout
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { X, Pin, User, Mic, MicOff, Maximize, Minimize } from 'lucide-react';

const ParticipantCard = ({ track, isFocused = false, onFocus, className = "", isPip = false }) => {
    const participant = track.participant;
    const { identity, name, isSpeaking } = useParticipantInfo({ participant });
    const { isMuted } = useTrackMutedIndicator(track);
    
    return (
        <div 
            onClick={onFocus}
            className={`relative rounded-2xl md:rounded-3xl overflow-hidden group transition-all duration-500 border ${
                isSpeaking ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'border-white/10'
            } bg-zinc-900/50 ${onFocus ? 'cursor-pointer hover:border-white/30' : ''} ${className}`}
        >
            <ParticipantTile trackRef={track} className="object-cover w-full h-full" />
            
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
        if (screenShareTrack && !focusTrack) {
            setFocusTrack(screenShareTrack);
        } else if (!screenShareTrack && focusTrack?.source === Track.Source.ScreenShare) {
            setFocusTrack(null);
        }
    }, [screenShareTrack, focusTrack]);

    // VOICE LAYOUT
    if (callType === 'voice') {
        return (
            <div className="w-full h-full flex items-center justify-center bg-zinc-950 p-6 md:p-12">
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
        <div className="w-full h-full flex flex-col md:flex-row bg-black overflow-hidden">
            <div className="flex-1 relative flex flex-col md:flex-row h-full overflow-hidden">
                {/* MAIN CONTENT AREA */}
                <div className="flex-[4] relative bg-zinc-900 flex items-center justify-center overflow-hidden m-2 md:m-4 rounded-3xl border border-white/5 shadow-2xl">
                    <FocusLayout trackRef={activeFocusTrack}>
                        <ParticipantTile
                            style={{ objectFit: activeFocusTrack.source === Track.Source.ScreenShare ? 'contain' : 'cover' }}
                            className="w-full h-full"
                        />
                    </FocusLayout>

                    {/* Overlay Label for Focus */}
                    <div className="absolute top-6 left-6 flex items-center gap-3 bg-black/60 backdrop-blur-2xl px-4 py-2 rounded-2xl border border-white/10 z-10 shadow-2xl">
                        <div className={`w-2 h-2 rounded-full ${activeFocusTrack.source === Track.Source.ScreenShare ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`} />
                        <div className="flex flex-col">
                            <span className="text-white text-[11px] md:text-sm font-bold tracking-wide">
                                {activeFocusTrack.source === Track.Source.ScreenShare ? 'Presenting Screen' : (activeFocusTrack.participant.name || activeFocusTrack.participant.identity)}
                            </span>
                            {activeFocusTrack.source === Track.Source.ScreenShare && (
                                <span className="text-white/40 text-[8px] md:text-[9px] uppercase font-black tracking-widest mt-0.5">High Quality Stream</span>
                            )}
                        </div>
                    </div>

                    <div className="absolute top-6 right-6 flex items-center gap-2 z-10">
                        {activeFocusTrack.source === Track.Source.ScreenShare && activeFocusTrack.participant.identity === 'local' && (
                            <button
                                onClick={() => activeFocusTrack.participant.setScreenShareEnabled(false)}
                                className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-2xl transition-all duration-300 shadow-xl flex items-center gap-2 text-xs font-bold"
                            >
                                <X className="w-4 h-4" />
                                Stop Sharing
                            </button>
                        )}
                        
                        <button
                            onClick={() => {
                                const el = document.querySelector('.lk-focus-layout video');
                                if (el) el.requestFullscreen();
                            }}
                            className="bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-2xl transition-all duration-300 border border-white/10 shadow-xl group"
                            title="Maximize Stream"
                        >
                            <Maximize className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </button>

                        {focusTrack && (
                            <button
                                onClick={() => setFocusTrack(null)}
                                className="bg-white/10 hover:bg-rose-500 text-white p-2.5 rounded-2xl transition-all duration-300 border border-white/10 shadow-xl group"
                                title="Unpin"
                            >
                                <Pin className="w-5 h-5 group-hover:rotate-45 transition-transform" />
                            </button>
                        )}
                    </div>
                </div>

                {/* SIDEBAR */}
                <div className="flex-1 md:w-72 max-h-[30%] md:max-h-full flex flex-row md:flex-col gap-3 md:gap-4 overflow-x-auto md:overflow-y-auto p-2 md:p-4 md:pl-0 custom-scrollbar">
                    {tracks.filter(t => t !== activeFocusTrack).map((track) => (
                        <div key={`${track.participant.identity}-${track.source}`} className="w-48 md:w-full aspect-video flex-shrink-0">
                             <ParticipantCard 
                                track={track} 
                                onFocus={() => setFocusTrack(track)}
                                className="h-full"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const VoiceParticipantKey = ({ participant }) => {
    const { identity, name, isSpeaking, isMicrophoneEnabled } = useParticipantInfo({ participant });

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

                <div className={`absolute bottom-1 right-1 p-2 rounded-full border-4 border-zinc-950 z-20 transition-colors duration-300 shadow-lg ${!isMicrophoneEnabled ? 'bg-rose-500' : isSpeaking ? 'bg-emerald-500' : 'bg-zinc-800'}`}>
                    {!isMicrophoneEnabled ? <MicOff className="w-3.5 h-3.5 text-white" /> : <Mic className="w-3.5 h-3.5 text-white" />}
                </div>
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
