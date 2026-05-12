import React from 'react';
import { 
  Mic, 
  MicOff, 
  Video as VideoIcon, 
  VideoOff, 
  ScreenShare, 
  PhoneOff,
  RefreshCw
} from 'lucide-react';

const CallControls = ({ 
  isMuted, 
  isCameraOff, 
  isScreenSharing, 
  onToggleMic, 
  onToggleCamera, 
  onSwitchCamera,
  onToggleScreenShare, 
  onDisconnect 
}) => {
  return (
    <div className="flex items-center gap-2 md:gap-4 bg-zinc-800/90 backdrop-blur-xl px-4 md:px-6 py-2 md:py-3 rounded-2xl md:rounded-3xl shadow-2xl border border-white/10">
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
        <button 
          onClick={onToggleScreenShare}
          title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
          className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all ${isScreenSharing ? 'bg-emerald-500 text-white' : 'bg-white/5 text-white hover:bg-white/10'}`}
        >
          <ScreenShare className="w-4 h-4 md:w-5 md:h-5" />
        </button>
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
