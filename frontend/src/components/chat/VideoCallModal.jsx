import React, { useState, useMemo, useEffect } from 'react';
import { 
  LiveKitRoom, 
  RoomAudioRenderer,
  useLocalParticipant,
} from '@livekit/components-react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2, Minimize2, Maximize } from 'lucide-react';
import CallControls from './CallControls';
import ParticipantGrid from './ParticipantGrid';

const VideoCallModal = ({ call, token, url, onLeave }) => {
  const [isMinimized, setIsMinimized] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isMinimized) {
        document.body.style.overflow = 'hidden';
        document.body.style.height = '100vh';
    } else {
        document.body.style.overflow = 'auto';
        document.body.style.height = 'auto';
    }
    return () => {
        document.body.style.overflow = 'auto';
        document.body.style.height = 'auto';
    };
  }, [isMinimized]);

  const options = useMemo(() => ({
    adaptiveStream: true,
    dynacast: true,
    publishDefaults: {
        simulcast: true,
    }
  }), []);

  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  if (!token || !url) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: 1,
          width: isMinimized ? '300px' : '100vw',
          height: isMinimized ? '170px' : '100vh',
          bottom: isMinimized ? '20px' : '0',
          right: isMinimized ? '20px' : '0',
          borderRadius: isMinimized ? '20px' : '0',
          top: isMinimized ? 'auto' : '0',
          left: isMinimized ? 'auto' : '0',
        }}
        style={{ 
            position: 'fixed', 
            zIndex: 9999,
            margin: 0,
            padding: 0,
            maxWidth: '100vw',
            maxHeight: '100vh',
            boxSizing: 'border-box'
        }}
        className="bg-black flex flex-col overflow-hidden shadow-2xl"
      >
        <LiveKitRoom
          token={token}
          serverUrl={url}
          connect={true}
          video={call.type === 'video'}
          audio={true}
          options={options}
          onDisconnected={onLeave}
          className="h-full w-full flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="h-14 flex-shrink-0 px-4 flex items-center justify-between bg-zinc-900 border-b border-white/5 z-20">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-white text-[10px] font-black uppercase tracking-widest opacity-80">
                {call.type} call
              </span>
            </div>
            <div className="flex items-center gap-1">
              {!isMinimized && (
                  <button 
                    onClick={toggleBrowserFullscreen}
                    className="p-2 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-all"
                  >
                    <Maximize className="w-4 h-4" />
                  </button>
              )}
              <button 
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-all"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button 
                onClick={onLeave}
                className="p-2 hover:bg-rose-500/20 rounded-lg text-rose-400 hover:text-rose-500 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-h-0 relative bg-black overflow-hidden">
            {!isMinimized ? (
                <div className="absolute inset-0">
                    <ParticipantGrid callType={call.type} />
                </div>
            ) : (

                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-white text-[7px] font-black uppercase tracking-widest">Ongoing</p>
                </div>
            )}
          </div>

          {/* Footer Area - Strictly Fixed at bottom of viewport */}
          {!isMinimized && (
            <div className="h-24 flex-shrink-0 flex items-center justify-center bg-zinc-900 border-t border-white/5 z-20">
              <RoomContent onLeave={onLeave} callType={call.type} />
            </div>
          )}

          <RoomAudioRenderer />
        </LiveKitRoom>
      </motion.div>
    </AnimatePresence>
  );
};

const RoomContent = ({ onLeave, callType }) => {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();

  return (
    <CallControls 
      isMuted={!isMicrophoneEnabled}
      isCameraOff={!isCameraEnabled}
      isScreenSharing={isScreenShareEnabled}
      onToggleMic={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
      onToggleCamera={callType === 'video' ? () => localParticipant.setCameraEnabled(!isCameraEnabled) : null}
      onToggleScreenShare={() => localParticipant.setScreenShareEnabled(!isScreenShareEnabled)}
      onDisconnect={onLeave}
    />
  );
};

export default VideoCallModal;
