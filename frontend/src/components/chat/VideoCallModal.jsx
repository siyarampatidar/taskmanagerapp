import React, { useState, useMemo, useEffect } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useMediaDeviceSelect,
} from '@livekit/components-react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2, Minimize2, Maximize } from 'lucide-react';
import { Track } from 'livekit-client';
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
          height: isMinimized ? '170px' : '100dvh',
          bottom: isMinimized ? '20px' : '0',
          right: isMinimized ? '20px' : '0',
          borderRadius: isMinimized ? '24px' : '0',
          top: isMinimized ? 'auto' : '0',
          left: isMinimized ? 'auto' : '0',
        }}
        style={{
          position: 'fixed',
          zIndex: 9999,
          margin: 0,
          padding: 0,
          maxWidth: '100vw',
          maxHeight: '100dvh',
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
          {!isMinimized && (
            <div className="h-16 md:h-20 flex-shrink-0 px-6 md:px-10 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-30 pointer-events-none">
              <div className="flex items-center gap-3 pointer-events-auto">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                <div className="flex flex-col">
                  <span className="text-white text-[10px] md:text-xs font-black uppercase tracking-[0.2em] opacity-90 leading-none">
                    {call.type} session
                  </span>
                  <span className="text-white/40 text-[8px] md:text-[9px] font-bold uppercase tracking-widest mt-1">
                    Secure & Encrypted
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 pointer-events-auto bg-black/20 backdrop-blur-md p-1.5 rounded-2xl border border-white/5">
                <button
                  onClick={toggleBrowserFullscreen}
                  className="p-2 hover:bg-white/10 rounded-xl text-white/70 hover:text-white transition-all group"
                  title="Fullscreen"
                >
                  <Maximize className="w-4 h-4 md:w-5 md:h-5 group-hover:scale-110 transition-transform" />
                </button>
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-2 hover:bg-white/10 rounded-xl text-white/70 hover:text-white transition-all group"
                  title="Minimize"
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4 md:w-5 md:h-5" /> : <Minimize2 className="w-4 h-4 md:w-5 md:h-5 group-hover:scale-110 transition-transform" />}
                </button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <button
                  onClick={onLeave}
                  className="p-2 bg-rose-500/10 hover:bg-rose-500 rounded-xl text-rose-500 hover:text-white transition-all group"
                  title="End Call"
                >
                  <X className="w-4 h-4 md:w-5 md:h-5 group-hover:rotate-90 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 min-h-0 relative bg-black overflow-hidden">
            {!isMinimized ? (
              <div className="absolute inset-0">
                <ParticipantGrid callType={call.type} />
              </div>
            ) : (
              <div 
                onClick={() => setIsMinimized(false)}
                className="w-full h-full flex flex-col items-center justify-center gap-3 bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl m-0 cursor-pointer hover:bg-zinc-800/90 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-3 h-3 text-white/70" />
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                <div className="flex flex-col items-center gap-1">
                  <p className="text-white text-[8px] font-black uppercase tracking-widest opacity-60">Call Active</p>
                  <span className="text-white/40 text-[6px] font-bold uppercase tracking-tighter">Click to expand</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Area */}
          {!isMinimized && (
            <div className="h-40 md:h-48 flex-shrink-0 flex items-end justify-center bg-gradient-to-t from-black/95 via-black/50 to-transparent fixed bottom-0 left-0 right-0 z-[10000] pointer-events-none pb-14 md:pb-16">
              <div className="pointer-events-auto">
                <RoomContent onLeave={onLeave} callType={call.type} />
              </div>
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
  const [facingMode, setFacingMode] = useState('user');

  // Check if screen share is supported by the browser
  const isScreenShareSupported = useMemo(() => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
  }, []);

  const handleSwitchCamera = async () => {
    try {
      // 1. Get all available video devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput' && d.deviceId);
      
      if (videoDevices.length <= 1) {
        // If only one device reported, try toggling facingMode as a fallback
        const nextMode = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(nextMode);
        await localParticipant.setCameraEnabled(false);
        await localParticipant.setCameraEnabled(true, {
          videoConstraints: { facingMode: nextMode }
        });
        return;
      }

      // 2. Identify the current active device
      const currentTrack = localParticipant.getTrack(Track.Source.Camera);
      const currentDeviceId = currentTrack?.videoTrack?.mediaStreamTrack.getSettings().deviceId;
      
      // 3. Find the next device in the list
      let currentIndex = videoDevices.findIndex(d => d.deviceId === currentDeviceId);
      // If current device not found in list (common on some browsers), default to 0
      if (currentIndex === -1) currentIndex = 0;
      
      const nextIndex = (currentIndex + 1) % videoDevices.length;
      const nextDevice = videoDevices[nextIndex];

      if (nextDevice) {
        // 4. Switch to the next device
        await localParticipant.setCameraEnabled(false);
        // Small delay to ensure the hardware is released
        await new Promise(resolve => setTimeout(resolve, 100));
        await localParticipant.setCameraEnabled(true, {
          deviceId: nextDevice.deviceId
        });
        
        // 5. Update facingMode state for future toggles
        const label = nextDevice.label.toLowerCase();
        if (label.includes('back') || label.includes('environment') || label.includes('rear')) {
          setFacingMode('environment');
        } else {
          setFacingMode('user');
        }
      }
    } catch (error) {
      console.error("Camera switch error:", error);
      // Final fallback to LiveKit built-in method
      if (localParticipant.switchCamera) {
        try {
          await localParticipant.switchCamera();
        } catch (e) {
          console.error("LiveKit switchCamera failed:", e);
        }
      }
    }
  };

  const handleToggleScreenShare = async () => {
    try {
      if (!isScreenShareEnabled) {
        await localParticipant.setScreenShareEnabled(true);
      } else {
        await localParticipant.setScreenShareEnabled(false);
      }
    } catch (error) {
      console.error("Screen share error:", error);
    }
  };

  return (
    <CallControls
      isMuted={!isMicrophoneEnabled}
      isCameraOff={!isCameraEnabled}
      isScreenSharing={isScreenShareEnabled}
      isScreenShareSupported={isScreenShareSupported}
      onToggleMic={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
      onToggleCamera={callType === 'video' ? () => localParticipant.setCameraEnabled(!isCameraEnabled) : null}
      onSwitchCamera={callType === 'video' ? handleSwitchCamera : null}
      onToggleScreenShare={callType === 'video' ? handleToggleScreenShare : null}
      onDisconnect={onLeave}
    />
  );
};

export default VideoCallModal;
