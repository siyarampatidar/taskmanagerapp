import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Video as VideoIcon, 
  VideoOff, 
  ScreenShare, 
  PhoneOff,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CallControls = ({ 
  isMuted, 
  isCameraOff, 
  isScreenSharing, 
  isScreenShareSupported = true,
  onToggleMic, 
  onToggleCamera, 
  onSwitchCamera,
  onToggleScreenShare, 
  onDisconnect 
}) => {
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (showError) {
      const timer = setTimeout(() => setShowError(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showError]);

  const handleScreenShareClick = () => {
    if (!isScreenShareSupported && !isScreenSharing) {
      setShowError(true);
    } else {
      onToggleScreenShare();
    }
  };

  return (
    <div className="flex items-center gap-2 md:gap-4 bg-zinc-800/90 backdrop-blur-xl px-4 md:px-6 py-2 md:py-3 rounded-2xl md:rounded-3xl shadow-2xl border border-white/10 relative">
      <button 
        onClick={onToggleMic}
        title={isMuted ? "Unmute" : "Mute"}
        className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all ${isMuted ? 'bg-rose-500 text-white' : 'bg-white/5 text-white hover:bg-white/10'}`}
      >
        {isMuted ? <MicOff className="w-4 h-4 md:w-5 md:h-5" /> : <Mic className="w-4 h-4 md:w-5 md:h-5" />}
      </button>

      {onToggleCamera && (
        <button 
          onClick={onToggleCamera}
          title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
          className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all ${isCameraOff ? 'bg-rose-500 text-white' : 'bg-white/5 text-white hover:bg-white/10'}`}
        >
          {isCameraOff ? <VideoOff className="w-4 h-4 md:w-5 md:h-5" /> : <VideoIcon className="w-4 h-4 md:w-5 md:h-5" />}
        </button>
      )}

      {!isCameraOff && onSwitchCamera && (
        <button 
          onClick={onSwitchCamera}
          title="Switch Camera"
          className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all bg-white/5 text-white hover:bg-white/10"
        >
          <RefreshCw className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      )}

      {onToggleScreenShare && (
        <div className="relative">
          <AnimatePresence>
            {showError && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-rose-500 text-white text-[10px] md:text-xs font-bold rounded-xl shadow-2xl border border-white/20 flex items-center gap-2 whitespace-nowrap z-50"
              >
                <AlertCircle className="w-3 h-3 md:w-4 md:h-4" />
                Not supported on this device
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-rose-500" />
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={handleScreenShareClick}
            title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
            className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all ${isScreenSharing ? 'bg-emerald-500 text-white' : 'bg-white/5 text-white hover:bg-white/10'} ${!isScreenShareSupported && !isScreenSharing ? 'opacity-50' : ''}`}
          >
            <ScreenShare className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      )}

      <div className="w-px h-6 bg-white/10 mx-1" />

      <button 
        onClick={onDisconnect}
        title="End Call"
        className="w-10 h-10 md:w-14 md:h-14 bg-rose-600 hover:bg-rose-700 text-white rounded-xl md:rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-rose-900/40"
      >
        <PhoneOff className="w-5 h-5 md:w-6 md:h-6" />
      </button>
    </div>
  );
};

export default CallControls;
