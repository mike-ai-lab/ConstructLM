import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Clock, Volume2, VolumeX, Repeat } from 'lucide-react';
import { Reminder } from '../types';

interface ReminderOverlayProps {
  reminder: Reminder;
  onDismiss: () => void;
  onSnooze: (minutes: number) => void;
}

const ReminderOverlay: React.FC<ReminderOverlayProps> = ({ reminder, onDismiss, onSnooze }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [selectedSound, setSelectedSound] = useState<'bell' | 'chime' | 'alarm'>('bell');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const sounds = {
    bell: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
    chime: 'https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3',
    alarm: 'https://assets.mixkit.co/active_storage/sfx/2871/2871-preview.mp3'
  };

  useEffect(() => {
    if (!isMuted) {
      audioRef.current = new Audio(sounds[selectedSound]);
      audioRef.current.loop = true;
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(() => {});
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [selectedSound, isMuted]);

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
    setIsMuted(!isMuted);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-[#f07a76]/95 via-[#25b5cd]/95 to-[#16b47e]/95 backdrop-blur-xl flex items-center justify-center animate-in fade-in duration-500">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
      
      <div className="relative bg-white dark:bg-[#1a1a1a] rounded-3xl shadow-2xl p-12 max-w-2xl w-full mx-4 animate-in zoom-in duration-500">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] rounded-full transition-colors"
        >
          <X size={24} className="text-gray-600 dark:text-gray-400" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-[#f07a76] rounded-full animate-ping opacity-75" />
            <div className="relative bg-gradient-to-br from-[#f07a76] to-[#25b5cd] p-8 rounded-full shadow-xl">
              <Bell size={64} className="text-white animate-bounce" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-[#1a1a1a] dark:text-white mb-4">
            {reminder.title}
          </h1>

          {(reminder as any).notes && (
            <p className="text-lg text-[#666666] dark:text-[#a0a0a0] mb-6 max-w-md">
              {(reminder as any).notes}
            </p>
          )}

          <div className="flex items-center gap-4 mb-8 text-sm text-[#666666] dark:text-[#a0a0a0]">
            <div className="flex items-center gap-2">
              <Clock size={16} />
              <span>{new Date(reminder.reminderTime).toLocaleString()}</span>
            </div>
            {(reminder as any).repeat && (
              <div className="flex items-center gap-2">
                <Repeat size={16} />
                <span className="capitalize">{(reminder as any).repeat}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={toggleMute}
              className="p-3 bg-gray-100 dark:bg-[#2a2a2a] rounded-full hover:bg-gray-200 dark:hover:bg-[#333333] transition-colors"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>

            <select
              value={selectedSound}
              onChange={(e) => setSelectedSound(e.target.value as any)}
              className="px-4 py-2 bg-gray-100 dark:bg-[#2a2a2a] rounded-lg border-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="bell">Bell</option>
              <option value="chime">Chime</option>
              <option value="alarm">Alarm</option>
            </select>
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={() => onSnooze(5)}
              className="flex-1 px-6 py-4 bg-[#25b5cd] text-white rounded-xl hover:bg-[#1a9aaa] transition-colors font-semibold text-lg"
            >
              Snooze 5m
            </button>
            <button
              onClick={() => onSnooze(15)}
              className="flex-1 px-6 py-4 bg-[#25b5cd] text-white rounded-xl hover:bg-[#1a9aaa] transition-colors font-semibold text-lg"
            >
              Snooze 15m
            </button>
            <button
              onClick={onDismiss}
              className="flex-1 px-6 py-4 bg-[#16b47e] text-white rounded-xl hover:bg-[#0f9a6a] transition-colors font-semibold text-lg"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReminderOverlay;
