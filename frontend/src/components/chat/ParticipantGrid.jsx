import React, { useState, useEffect } from 'react';
import { 
  ParticipantTile, 
  useTracks,
  TrackLoop,
  FocusLayout,
  GridLayout,
  useParticipants,
  useParticipantInfo
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { X, Pin, User, Mic } from 'lucide-react';

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

  // VOICE LAYOUT - Centered and clean
  if (callType === 'voice') {
    return (
        <div className="w-full h-full flex items-center justify-center bg-zinc-950 p-4">
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 max-w-5xl">
                {participants.map((p) => (
                    <VoiceParticipantKey key={p.identity} participant={p} />
                ))}
            </div>
        </div>
    );
  }

  const activeFocusTrack = focusTrack || screenShareTrack;

  // Optimized layout for exactly 2 participants (Fixed for side-by-side windows)
  if (!activeFocusTrack && tracks.length === 2) {
    return (
        <div className="w-full h-full flex flex-col sm:flex-row gap-2 bg-black p-2">
            {tracks.map((track) => (
                <div key={`${track.participant.identity}-${track.source}`} className="flex-1 relative rounded-xl overflow-hidden border border-white/5 bg-zinc-900">
                    <ParticipantTile trackRef={track} className="object-cover w-full h-full" />
                    <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 z-10">
                        <p className="text-white text-[9px] font-black uppercase tracking-widest truncate max-w-[120px]">
                            {track.participant.name} {track.participant.identity === 'local' ? '(You)' : ''}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col sm:flex-row bg-black overflow-hidden">
      {activeFocusTrack ? (
        <div className="flex-1 flex flex-col sm:flex-row h-full items-stretch overflow-hidden">
          {/* FOCUSED AREA */}
          <div className="flex-[3.5] lg:flex-[4.5] relative overflow-hidden bg-zinc-900 flex items-center justify-center">
            <FocusLayout trackRef={activeFocusTrack}>
               <ParticipantTile 
                 style={{ objectFit: activeFocusTrack.source === Track.Source.ScreenShare ? 'contain' : 'cover' }}
                 className="w-full h-full" 
               />
            </FocusLayout>
            
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 z-10">
              <div className={`w-1.5 h-1.5 rounded-full ${activeFocusTrack.source === Track.Source.ScreenShare ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span className="text-white text-[9px] font-black uppercase tracking-widest">
                {activeFocusTrack.source === Track.Source.ScreenShare ? 'Presenting' : activeFocusTrack.participant.name}
              </span>
            </div>

            {focusTrack && (
                <button 
                    onClick={() => setFocusTrack(null)}
                    className="absolute top-4 right-4 bg-black/40 hover:bg-rose-500/20 p-2 rounded-xl text-white transition-all border border-white/10 z-10"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
          </div>

          {/* SIDEBAR */}
          <div className="flex-1 min-w-[160px] max-w-[240px] flex flex-row sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto p-2 custom-scrollbar bg-zinc-900/50 border-l border-white/5">
            {tracks.filter(t => t !== activeFocusTrack).map((track) => (
                <div 
                    key={`${track.participant.identity}-${track.source}`}
                    onClick={() => setFocusTrack(track)}
                    className="w-36 sm:w-full aspect-video flex-shrink-0 rounded-xl overflow-hidden cursor-pointer border border-white/5 hover:border-indigo-500/50 transition-all group relative bg-zinc-800"
                >
                    <ParticipantTile trackRef={track} className="object-cover w-full h-full" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all">
                        <Pin className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-all" />
                    </div>
                </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 w-full h-full p-2 overflow-hidden">
            <GridLayout tracks={tracks}>
                <ParticipantTile 
                    className="object-cover w-full h-full rounded-2xl border border-white/5 bg-zinc-900"
                    onClick={(e) => {}} 
                />
            </GridLayout>
        </div>
      )}
    </div>
  );
};

const VoiceParticipantKey = ({ participant }) => {
    const { identity, name, isSpeaking } = useParticipantInfo({ participant });
    
    return (
        <div className="flex flex-col items-center gap-2">
            <div className={`relative transition-all duration-500 ${isSpeaking ? 'scale-105' : 'scale-100'}`}>
                {isSpeaking && <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />}
                
                <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center bg-zinc-800 border-2 transition-all duration-500 z-10 relative ${isSpeaking ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'border-white/10'}`}>
                    <User className={`w-8 h-8 md:w-10 md:h-10 ${isSpeaking ? 'text-emerald-400' : 'text-zinc-600'}`} />
                </div>

                <div className={`absolute -bottom-0 right-0 p-1 rounded-full border-2 border-zinc-950 z-20 ${isSpeaking ? 'bg-emerald-500' : 'bg-zinc-800'}`}>
                    <Mic className="w-3 h-3 text-white" />
                </div>
            </div>
            <p className={`text-[9px] font-black tracking-widest uppercase truncate max-w-[80px] ${isSpeaking ? 'text-emerald-400' : 'text-white/60'}`}>
                {name || identity}
            </p>
        </div>
    );
};

export default ParticipantGrid;
