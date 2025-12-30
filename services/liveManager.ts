import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { getApiKey } from "./geminiService";
import { arrayBufferToBase64, base64ToUint8Array, decodeAudioData, LIVE_SAMPLE_RATE, INPUT_SAMPLE_RATE } from "./audioUtils";

interface LiveConfig {
    onAudioOutput: (volume: number) => void;
    onAudioInput?: (volume: number) => void;
    onError: (error: Error) => void;
    onClose: () => void;
}

export class LiveManager {
    private ai: GoogleGenAI;
    private sessionPromise: Promise<any> | null = null;
    private audioContext: AudioContext | null = null;
    private isConnecting = false;
    private inputSource: MediaStreamAudioSourceNode | null = null;
    private processor: ScriptProcessorNode | null = null;
    private mediaRecorder: MediaRecorder | null = null;
    private outputNode: GainNode | null = null;
    private nextStartTime = 0;
    private isConnected = false;
    private stream: MediaStream | null = null;
    private activeSources = new Set<AudioBufferSourceNode>();
    private isMuted = false;
    private config: LiveConfig | null = null;
    public analyser: AnalyserNode | null = null;
    private isSetupComplete = false;

    constructor() {
        const apiKey = getApiKey();
        if (!apiKey) {
            console.error("[LiveManager] API Key missing!");
            throw new Error("API Key missing");
        }
        this.ai = new GoogleGenAI({ apiKey });
    }

    async connect(config: LiveConfig) {
        console.log("[LiveManager DEBUG] connect() called, isConnected=", this.isConnected, "isConnecting=", this.isConnecting);
        if (this.isConnected || this.isConnecting) {
            console.warn("[LiveManager] Already connected/connecting - RETURNING");
            return;
        }
        this.config = config;
        this.isConnecting = true;

        try{
            console.log("[LiveManager] Initializing AudioContext...");
            // CRITICAL: Use system default sample rate (48kHz) - don't force 16kHz
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            console.log("[LiveManager] AudioContext created at", this.audioContext.sampleRate, "Hz");
            
            this.outputNode = this.audioContext.createGain();
            this.outputNode.connect(this.audioContext.destination);

            console.log("[LiveManager] Requesting Microphone Access...");
            console.log("[LiveManager DEBUG] Calling getUserMedia...");
            // Request both audio input AND output (like browser "Sound" permission)
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 48000
                } 
            });
            console.log("[LiveManager DEBUG] Microphone granted, tracks:", this.stream.getTracks().length);
            
            console.log("[LiveManager] Connecting to Gemini Live API...");
            console.log("[LiveManager DEBUG] Using model: gemini-2.0-flash-live-001");
            this.sessionPromise = this.ai.live.connect({
                model: 'models/gemini-2.0-flash-live-001',
                config: {
                    responseModalities: [Modality.AUDIO],
                    audioConfig: {
                        audioEncoding: 'LINEAR16',
                        sampleRateHertz: 24000
                    }
                },
                callbacks: {
                    onopen: async () => {
                        console.log("[LiveManager] Session OPEN");
                        this.isConnecting = false;
                        this.isConnected = true;
                        console.log("[LiveManager DEBUG] Waiting for setupComplete...");
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        console.log("[LiveManager DEBUG] Message:", JSON.stringify(message).substring(0, 200));
                        
                        if (message.setupComplete) {
                            console.log("[LiveManager] Setup complete");
                            this.isSetupComplete = true;
                            await this.startAudioInputStream();
                            return;
                        }
                        
                        if (message.serverContent?.interrupted) {
                            this.stopAllAudio();
                            if (this.audioContext) this.nextStartTime = this.audioContext.currentTime;
                            return;
                        }

                        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (base64Audio && this.audioContext && this.outputNode) {
                            try {
                                const pcmData = base64ToUint8Array(base64Audio);
                                const audioBuffer = await decodeAudioData(pcmData, this.audioContext, 24000);
                                
                                const channelData = audioBuffer.getChannelData(0);
                                let sum = 0;
                                for(let i=0; i<channelData.length; i+=50) sum += Math.abs(channelData[i]);
                                const volume = sum / (channelData.length / 50);
                                config.onAudioOutput(volume);

                                this.queueAudio(audioBuffer);
                            } catch (e) {
                                console.warn("Error decoding audio", e);
                            }
                        }
                    },
                    onclose: () => {
                        console.log("[LiveManager] Session CLOSED");
                        console.error("[LiveManager] CLOSE EVENT - No error provided by SDK");
                        console.error("[LiveManager] This usually means: Invalid model name, wrong config structure, or API key issue");
                        this.cleanup();
                        config.onClose();
                    },
                    onerror: (e) => {
                        console.error("[LiveManager] ERROR:", e);
                        console.error("[LiveManager] Error details:", JSON.stringify(e, null, 2));
                        config.onError(new Error("Session error"));
                        this.cleanup();
                    }
                }
            });

        } catch (error) {
            console.error("[LiveManager] Connection Fatal Error:", error);
            console.error("[LiveManager DEBUG] Error stack:", (error as Error).stack);
            console.log("[LiveManager DEBUG] Calling cleanup after error");
            this.isConnecting = false;
            this.cleanup();
            throw error;
        }
    }

    private async startAudioInputStream() {
        if (!this.audioContext || !this.stream || !this.sessionPromise) return;

        console.log("[LiveManager] Starting Audio Input Stream");
        
        this.inputSource = this.audioContext.createMediaStreamSource(this.stream);
        
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.5;
        
        // Use smaller buffer to reduce processing load
        this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);
        
        const contextSampleRate = this.audioContext.sampleRate;
        const targetSampleRate = 16000;
        
        let chunkCount = 0;
        let skipCounter = 0;
        
        this.processor.onaudioprocess = (e) => {
            try {
                if (!this.isConnected || this.isMuted || !this.isSetupComplete) return;
                
                // Throttle: Process every other chunk to reduce load
                skipCounter++;
                if (skipCounter % 2 !== 0) return;
                
                const inputData = e.inputBuffer.getChannelData(0);
                
                // Resample from system rate (48kHz) to 16kHz
                const ratio = contextSampleRate / targetSampleRate;
                const newLength = Math.floor(inputData.length / ratio);
                const resampled = new Float32Array(newLength);
                
                for (let i = 0; i < newLength; i++) {
                    resampled[i] = inputData[Math.floor(i * ratio)];
                }
                
                // Convert to PCM16
                const pcmData = new Int16Array(resampled.length);
                for (let i = 0; i < resampled.length; i++) {
                    const s = Math.max(-1, Math.min(1, resampled[i]));
                    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                
                const uint8 = new Uint8Array(pcmData.buffer);
                const base64 = arrayBufferToBase64(uint8.buffer);
                
                chunkCount++;
                if (chunkCount === 1 || chunkCount % 50 === 0) {
                    console.log(`[LiveManager DEBUG] Sent ${chunkCount} audio chunks`);
                }
                
                this.sessionPromise?.then(session => {
                    if (session && this.isConnected) {
                        session.sendRealtimeInput({
                            media: {
                                mimeType: "audio/pcm;rate=16000",
                                data: base64
                            }
                        });
                    }
                }).catch(err => {
                    console.error("[LiveManager ERROR] Failed to send audio:", err);
                });
            } catch (err) {
                console.error("[LiveManager ERROR] Audio processing error:", err);
            }
        };
        
        // CRITICAL: Connection order matters
        this.inputSource.connect(this.analyser);
        this.analyser.connect(this.processor);
        
        // CRITICAL FIX: Connect processor to destination (required for Electron)
        const dummyGain = this.audioContext.createGain();
        dummyGain.gain.value = 0; // Mute local playback
        this.processor.connect(dummyGain);
        dummyGain.connect(this.audioContext.destination);
        
        console.log("[LiveManager] Audio input connected at", contextSampleRate, "Hz, resampling to 16kHz");
    }

    private queueAudio(buffer: AudioBuffer) {
        if (!this.audioContext || !this.outputNode) return;

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.outputNode);

        const currentTime = this.audioContext.currentTime;
        
        if (this.nextStartTime < currentTime) {
            this.nextStartTime = currentTime + 0.05;
        }

        source.start(this.nextStartTime);
        this.nextStartTime += buffer.duration;

        this.activeSources.add(source);
        source.onended = () => {
            this.activeSources.delete(source);
        };
    }

    private stopAllAudio() {
        this.activeSources.forEach(src => {
            try { src.stop(); } catch(e) {}
        });
        this.activeSources.clear();
    }

    toggleMute(muted: boolean) {
        this.isMuted = muted;
    }

    disconnect() {
        console.log("[LiveManager] Disconnecting...");
        console.log("[LiveManager DEBUG] disconnect() called, isConnected=", this.isConnected);
        this.stopAllAudio();
        if (this.sessionPromise) {
            this.sessionPromise.then(session => {
                 try { 
                     console.log("[LiveManager DEBUG] Closing session");
                     session.close(); 
                 } catch(e) { console.warn("Error closing session", e); }
            });
        }
        this.cleanup();
    }

    private cleanup() {
        console.log("[LiveManager DEBUG] cleanup() called, isConnected=", this.isConnected, "isConnecting=", this.isConnecting);
        
        // CRITICAL: Stop processing immediately
        this.isConnected = false;
        this.isConnecting = false;
        this.isSetupComplete = false;
        
        // Stop processor first to prevent more audio chunks
        if (this.processor) {
            console.log("[LiveManager DEBUG] Stopping processor");
            this.processor.onaudioprocess = null;
            try { this.processor.disconnect(); } catch(e) {}
            this.processor = null;
        }
        
        if (this.analyser) {
            console.log("[LiveManager DEBUG] Disconnecting analyser");
            try { this.analyser.disconnect(); } catch(e) {}
            this.analyser = null;
        }
        
        if (this.inputSource) {
            console.log("[LiveManager DEBUG] Disconnecting input source");
            try { this.inputSource.disconnect(); } catch(e) {}
            this.inputSource = null;
        }
        
        if (this.stream) {
            console.log("[LiveManager DEBUG] Stopping stream tracks");
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }
        
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            console.log("[LiveManager DEBUG] Stopping MediaRecorder");
            try { this.mediaRecorder.stop(); } catch(e) {}
            this.mediaRecorder = null;
        }
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            console.log("[LiveManager DEBUG] Closing audio context");
            try { this.audioContext.close(); } catch(e) {}
            this.audioContext = null;
        }
        
        this.sessionPromise = null;
        this.nextStartTime = 0;
        console.log("[LiveManager DEBUG] cleanup() complete");
    }
}
