import React, { useEffect, useState, useRef } from 'react';
import { Mic, MicOff, X, Activity } from 'lucide-react';
import { LiveManager } from '../services/liveManager';

interface LiveSessionProps {
    onClose: () => void;
}

const LiveSession: React.FC<LiveSessionProps> = ({ onClose }) => {
    const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const [volume, setVolume] = useState(0);
    const managerRef = useRef<LiveManager | null>(null);

    useEffect(() => {
        const manager = new LiveManager();
        managerRef.current = manager;

        manager.connect({
            onAudioOutput: (vol) => {
                // Smooth volume decay for visualizer
                setVolume(v => Math.max(vol * 5, v * 0.9)); 
            },
            onClose: () => {
                onClose();
            },
            onError: () => {
                setStatus('error');
            }
        }).then(() => {
            setStatus('connected');
        }).catch(() => {
            setStatus('error');
        });

        return () => {
            manager.disconnect();
        };
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-2xl p-8 shadow-2xl relative flex flex-col items-center gap-6">
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-800">
                        {status === 'connecting' && "Connecting to Gemini..."}
                        {status === 'connected' && "ConstructLM Live"}
                        {status === 'error' && "Connection Failed"}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        {status === 'connected' ? "Listening..." : "Please wait"}
                    </p>
                </div>

                {/* Visualizer */}
                <div className="relative w-32 h-32 flex items-center justify-center">
                    {/* Ripple effects */}
                    {status === 'connected' && (
                        <>
                            <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20 animate-ping" style={{ animationDuration: '2s' }} />
                            <div className="absolute inset-2 bg-blue-500 rounded-full opacity-20 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                        </>
                    )}
                    
                    <div 
                        className={`
                            relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-100
                            ${status === 'error' ? 'bg-red-100 text-red-500' : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30'}
                        `}
                        style={{ transform: status === 'connected' ? `scale(${1 + Math.min(volume, 0.5)})` : 'scale(1)' }}
                    >
                        {status === 'error' ? <MicOff size={32} /> : <Mic size={32} />}
                    </div>
                </div>

                {status === 'connected' && (
                    <div className="flex items-center gap-2 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
                        <Activity size={14} className="animate-pulse" />
                        Live Audio Session Active
                    </div>
                )}
                
                <div className="w-full text-center">
                    <button 
                        onClick={onClose}
                        className="text-sm text-gray-500 hover:text-red-500 underline decoration-gray-300 underline-offset-4 hover:decoration-red-200 transition-all"
                    >
                        End Session
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LiveSession;