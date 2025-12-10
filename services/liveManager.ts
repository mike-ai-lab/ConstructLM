
import { GoogleGenAI } from "@google/genai";
import { arrayBufferToBase64, base64ToUint8Array, decodeAudioData, LIVE_SAMPLE_RATE, INPUT_SAMPLE_RATE } from "./audioUtils";
import { getApiKeyForModel, MODEL_REGISTRY } from "./modelRegistry";

interface LiveConfig {
    onAudioOutput: (volume: number) => void;
    onError: (error: Error) => void;
    onClose: () => void;
}

export class LiveManager {
    private ai: GoogleGenAI;
    private sessionPromise: Promise<any> | null = null;
    private inputContext: AudioContext | null = null;
    private outputContext: AudioContext | null = null;
    private inputSource: MediaStreamAudioSourceNode | null = null;
    private processor: ScriptProcessorNode | null = null;
    private outputNode: GainNode | null = null;
    private nextStartTime = 0;
    private isConnected = false;
    private stream: MediaStream | null = null;

    constructor() {
        // Dynamically fetch the Google API key from the registry (Settings > LocalStorage)
        const googleModel = MODEL_REGISTRY.find(m => m.provider === 'google');
        const apiKey = googleModel ? getApiKeyForModel(googleModel) : undefined;
        
        if (!apiKey) {
            console.error("[LiveManager] API Key missing!");
            throw new Error("Gemini API Key is missing. Please add it in Settings.");
        }
        this.ai = new GoogleGenAI({ apiKey });
    }

    async connect(config: LiveConfig) {
        if (this.isConnected) {
            console.warn("[LiveManager] Already connected");
            return;
        }

        try {
            console.log("[LiveManager] Initializing AudioContexts...");
            this.inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
            this.outputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: LIVE_SAMPLE_RATE });
            
            this.outputNode = this.outputContext.createGain();
            this.outputNode.connect(this.outputContext.destination);

            console.log("[LiveManager] Requesting Microphone Access...");
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            console.log("[LiveManager] Connecting to Gemini Live API...");
            this.sessionPromise = this.ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        console.log("[LiveManager] Session OPEN");
                        this.isConnected = true;
                        this.startAudioInputStream();
                    },
                    onmessage: async (message: any) => {
                        // message is typed as any to avoid import issues
                        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (base64Audio && this.outputContext && this.outputNode) {
                            const pcmData = base64ToUint8Array(base64Audio);
                            const audioBuffer = await decodeAudioData(pcmData, this.outputContext, LIVE_SAMPLE_RATE);
                            
                            const channelData = audioBuffer.getChannelData(0);
                            let sum = 0;
                            for(let i=0; i<channelData.length; i+=50) sum += Math.abs(channelData[i]);
                            const volume = sum / (channelData.length / 50);
                            config.onAudioOutput(volume);

                            this.queueAudio(audioBuffer);
                        }

                        if (message.serverContent?.interrupted) {
                            console.log("[LiveManager] Interrupted by user");
                            this.nextStartTime = 0; 
                        }
                    },
                    onclose: () => {
                        console.log("[LiveManager] Session CLOSED");
                        this.cleanup();
                        config.onClose();
                    },
                    onerror: (e) => {
                        console.error("[LiveManager] Session ERROR:", e);
                        config.onError(new Error("Session error"));
                        this.cleanup();
                    }
                },
                config: {
                    // Use string 'AUDIO' to avoid Modality import
                    responseModalities: ['AUDIO' as any],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                    },
                    systemInstruction: "You are a helpful assistant. Keep your responses concise and conversational."
                }
            });

        } catch (error) {
            console.error("[LiveManager] Connection Fatal Error:", error);
            this.cleanup();
            throw error;
        }
    }

    private startAudioInputStream() {
        if (!this.inputContext || !this.stream || !this.sessionPromise) return;

        console.log("[LiveManager] Starting Audio Input Stream");
        this.inputSource = this.inputContext.createMediaStreamSource(this.stream);
        this.processor = this.inputContext.createScriptProcessor(4096, 1, 1);

        this.processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                const s = Math.max(-1, Math.min(1, inputData[i]));
                pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }

            const uint8 = new Uint8Array(pcmData.buffer);
            const base64 = arrayBufferToBase64(uint8.buffer);

            this.sessionPromise?.then(session => {
                session.sendRealtimeInput({
                    media: {
                        mimeType: "audio/pcm;rate=16000",
                        data: base64
                    }
                });
            });
        };

        this.inputSource.connect(this.processor);
        this.processor.connect(this.inputContext.destination);
    }

    private queueAudio(buffer: AudioBuffer) {
        if (!this.outputContext || !this.outputNode) return;

        const source = this.outputContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.outputNode);

        const currentTime = this.outputContext.currentTime;
        const start = Math.max(currentTime, this.nextStartTime);
        
        source.start(start);
        this.nextStartTime = start + buffer.duration;
    }

    disconnect() {
        console.log("[LiveManager] Disconnecting...");
        if (this.sessionPromise) {
            this.sessionPromise.then(session => {
                 try { session.close(); } catch(e) { console.warn("Error closing session", e); }
            });
        }
        this.cleanup();
    }

    private cleanup() {
        this.isConnected = false;
        
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }
        if (this.inputSource) {
            this.inputSource.disconnect();
            this.inputSource = null;
        }
        if (this.inputContext) {
            this.inputContext.close();
            this.inputContext = null;
        }
        if (this.outputContext) {
            this.outputContext.close();
            this.outputContext = null;
        }
        this.sessionPromise = null;
        this.nextStartTime = 0;
    }
}
