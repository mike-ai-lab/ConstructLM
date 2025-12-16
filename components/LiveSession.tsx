import React, { useEffect, useState, useRef } from 'react';
import { Mic, MicOff, X, Activity, PhoneOff, Volume2 } from 'lucide-react';
import { LiveManager } from '../services/liveManager';

interface LiveSessionProps {
    onClose: () => void;
}

const LiveSession: React.FC<LiveSessionProps> = ({ onClose }) => {
    const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const [volume, setVolume] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [inputVolume, setInputVolume] = useState(0);
    const managerRef = useRef<LiveManager | null>(null);
    const isInitializedRef = useRef(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);

    useEffect(() => {
        console.log("[LiveSession DEBUG] useEffect triggered, isInitialized=", isInitializedRef.current);
        if (isInitializedRef.current) {
            console.log("[LiveSession DEBUG] Already initialized, skipping");
            return;
        }
        isInitializedRef.current = true;
        console.log("[LiveSession DEBUG] Creating new LiveManager");
        const manager = new LiveManager();
        managerRef.current = manager;

        console.log("[LiveSession DEBUG] Calling manager.connect()");
        manager.connect({
            onAudioOutput: (vol) => {
                setVolume(v => Math.max(vol * 8, v * 0.85)); 
            },
            onClose: () => {
                onClose();
            },
            onError: () => {
                setStatus('error');
            }
        }).then(() => {
            console.log("[LiveSession DEBUG] Connection successful");
            setStatus('connected');
        }).catch((err) => {
            console.error("[LiveSession DEBUG] Connection failed:", err);
            setStatus('error');
        });

        return () => {
            console.log("[LiveSession DEBUG] useEffect cleanup - NOT calling disconnect to prevent StrictMode issues");
            // Don't disconnect here - it causes issues with StrictMode double-mounting
            // The manager will be cleaned up when component actually unmounts
        };
    }, []);

    const toggleMute = () => {
        const newState = !isMuted;
        setIsMuted(newState);
        if (managerRef.current && (managerRef.current as any).toggleMute) {
            (managerRef.current as any).toggleMute(newState);
        }
    };

    // Waveform drawing
    useEffect(() => {
        if (!canvasRef.current || status !== 'connected') return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);
            
            const manager = managerRef.current;
            if (!manager || !manager.analyser) return;
            
            if (!dataArrayRef.current || dataArrayRef.current.length !== manager.analyser.frequencyBinCount) {
                dataArrayRef.current = new Uint8Array(manager.analyser.frequencyBinCount);
            }
            
            manager.analyser.getByteFrequencyData(dataArrayRef.current as any);
            
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);

            const width = rect.width;
            const height = rect.height;
            
            ctx.clearRect(0, 0, width, height);
            
            const bufferLength = manager.analyser.frequencyBinCount;
            const numBars = Math.floor(bufferLength * 0.5);
            const totalBarPlusSpacingWidth = width / numBars;
            const barWidth = Math.max(1, Math.floor(totalBarPlusSpacingWidth * 0.7));
            const barSpacing = Math.max(0, Math.floor(totalBarPlusSpacingWidth * 0.3));
            
            ctx.fillStyle = '#3b82f6';
            
            let x = 0;
            for (let i = 0; i < numBars; i++) {
                if (x >= width) break;
                const dataIndex = Math.floor(i * (bufferLength / numBars));
                const barHeightNormalized = dataArrayRef.current[dataIndex] / 255.0;
                let barHeight = barHeightNormalized * height;
                if (barHeight < 1 && barHeight > 0) barHeight = 1;
                const y = (height - barHeight) / 2;
                
                ctx.fillRect(x, y, barWidth, barHeight);
                x += barWidth + barSpacing;
            }
        };
        
        draw();
        
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [status]);

    // Cleanup on actual unmount
    useEffect(() => {
        return () => {
            console.log("[LiveSession DEBUG] Component unmounting - cleaning up manager");
            if (managerRef.current) {
                managerRef.current.disconnect();
                managerRef.current = null;
            }
            // Reset to allow fresh connection next time
            isInitializedRef.current = false;
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-sm bg-black/40 border border-white/10 rounded-3xl p-8 flex flex-col items-center gap-12 text-white relative shadow-2xl overflow-hidden">
                
                {/* Close Button */}
                <button 
                    onClick={onClose} 
                    className="absolute top-6 right-6 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                >
                    <X size={24} />
                </button>

                {/* Status Indicator */}
                <div className="flex flex-col items-center gap-2 mt-4">
                    {status === 'connecting' && (
                        <span className="flex items-center gap-2 text-sm font-medium text-blue-300 animate-pulse">
                            <Activity size={14} /> Connecting...
                        </span>
                    )}
                    {status === 'connected' && (
                        <span className="flex items-center gap-2 text-sm font-medium text-emerald-300">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]"></span>
                            Live Connected
                        </span>
                    )}
                    {status === 'error' && (
                        <span className="text-sm font-medium text-red-400">Connection Failed</span>
                    )}
                </div>

                {/* Microphone Test */}
                {status === 'connected' && (
                    <div className="w-full">
                        <div className="text-xs text-white/60 mb-2">Microphone Level:</div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-blue-500 transition-all duration-75"
                                style={{ width: `${Math.min(inputVolume * 100, 100)}%` }}
                            />
                        </div>
                        <canvas 
                            ref={canvasRef}
                            className="w-full h-16 rounded-lg mt-4"
                            style={{ imageRendering: 'crisp-edges', opacity: isMuted ? 0.3 : 1 }}
                        />
                    </div>
                )}

                {/* Main Visualizer */}
                <div className="relative flex items-center justify-center h-48 w-48">
                    {/* Pulsing Rings */}
                    {status === 'connected' && !isMuted && (
                        <>
                            <div className="absolute inset-0 rounded-full border border-blue-500/30 animate-[ping_2s_linear_infinite]" />
                            <div className="absolute inset-4 rounded-full border border-indigo-500/30 animate-[ping_2s_linear_infinite_0.5s]" />
                        </>
                    )}

                    {/* Dynamic Orb */}
                    <div 
                        className={`
                            relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-150 shadow-[0_0_40px_rgba(59,130,246,0.3)]
                            ${status === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 
                              isMuted ? 'bg-gray-700/50 text-gray-400 border border-gray-600' : 
                              'bg-gradient-to-tr from-blue-600 to-cyan-500 text-white border border-blue-400/50'}
                        `}
                        style={{ 
                            transform: status === 'connected' && !isMuted ? `scale(${1 + Math.min(volume, 0.4)})` : 'scale(1)' 
                        }}
                    >
                        {isMuted ? <MicOff size={32} /> : <Volume2 size={32} />}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-6 w-full justify-center">
                    <button 
                        onClick={toggleMute}
                        className={`
                            p-4 rounded-full transition-all duration-200 backdrop-blur-sm
                            ${isMuted 
                                ? 'bg-white text-black hover:bg-gray-200' 
                                : 'bg-white/10 text-white hover:bg-white/20 hover:scale-105'
                            }
                        `}
                        disabled={status !== 'connected'}
                    >
                        {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                    </button>

                    <button 
                        onClick={onClose}
                        className="p-4 rounded-full bg-red-500/90 text-white hover:bg-red-600 hover:scale-105 transition-all shadow-lg shadow-red-500/20"
                    >
                        <PhoneOff size={24} />
                    </button>
                </div>
                
                {status === 'connected' && (
                    <p className="text-white/40 text-xs mt-[-20px]">
                        Tap microphone to mute
                    </p>
                )}
            </div>
        </div>
    );
};

export default LiveSession;
