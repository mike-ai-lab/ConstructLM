import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import {
  arrayBufferToBase64,
  base64ToUint8Array,
  decodeAudioData,
  LIVE_SAMPLE_RATE,
  INPUT_SAMPLE_RATE,
} from "./audioUtils";

export function getApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
}

export function initializeGemini(): void {
  // Initialization logic if needed
}

export async function sendMessageToGemini(
  modelId: string,
  apiKey: string,
  message: string,
  files: any[],
  activeFiles: any[],
  onStream: (chunk: string) => void,
  systemPrompt?: string,
  history?: any[]
): Promise<void> {
  if (!apiKey) throw new Error("API Key missing");

  const fileContext = activeFiles.length > 0
    ? '\n\nFILE CONTEXT:\n' + activeFiles.map(f => `=== FILE: "${f.name}" ===\n${f.content}\n=== END FILE ===`).join('\n\n')
    : '';

  const contents = [];
  
  if (history && history.length > 0) {
    const recentHistory = history.filter(m => !m.isStreaming && m.id !== 'intro').slice(-10);
    
    for (let i = 0; i < recentHistory.length; i++) {
      const msg = recentHistory[i];
      const isFirstUserMsg = i === 0 && msg.role === 'user';
      
      if (msg.role === 'user') {
        const userContent = isFirstUserMsg && fileContext ? msg.content + fileContext : msg.content;
        contents.push({ role: 'user', parts: [{ text: userContent }] });
      } else if (msg.role === 'model') {
        contents.push({ role: 'model', parts: [{ text: msg.content }] });
      }
    }
  }
  
  const isFirstMessage = !history || history.length === 0;
  const currentMessage = (isFirstMessage && fileContext) ? message + fileContext : message;
  contents.push({ role: "user", parts: [{ text: currentMessage }] });
  
  const requestBody: any = { 
    contents,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192
    }
  };
  
  if (systemPrompt) {
    requestBody.systemInstruction = { parts: [{ text: systemPrompt }] };
  }
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${apiKey}&alt=sse`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    }
  );

  if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
  if (!response.body) throw new Error("No response body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const json = JSON.parse(line.slice(6));
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) onStream(text);
        } catch (e) {}
      }
    }
  }
}

export async function generateSpeech(text: string): Promise<Uint8Array | null> {
  try {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } }
            }
          }
        })
      }
    );
    
    const result = await response.json();
    const audioData = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) return null;
    
    const binaryString = atob(audioData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (error) {
    console.error("Speech generation error:", error);
    return null;
  }
}

interface LiveConfig {
  onAudioOutput: (volume: number) => void;
  onAudioInput?: (volume: number) => void;
  onError: (error: Error) => void;
  onClose: () => void;
}

export class LiveManager {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private inputContext: AudioContext | null = null;
  private outputContext: AudioContext | null = null;
  private isConnecting = false;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private outputNode: GainNode | null = null;
  private nextStartTime = 0;
  private isConnected = false;
  private stream: MediaStream | null = null;
  private activeSources = new Set<AudioBufferSourceNode>();
  private isMuted = false;
  private config: LiveConfig | null = null;

  constructor() {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.error("[LiveManager] API Key missing!");
      throw new Error("API Key missing");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async connect(config: LiveConfig) {
    console.log(
      "[LiveManager DEBUG] connect() called, isConnected=",
      this.isConnected,
      "isConnecting=",
      this.isConnecting
    );
    if (this.isConnected || this.isConnecting) {
      console.warn("[LiveManager] Already connected/connecting - RETURNING");
      return;
    }
    this.config = config;
    this.isConnecting = true;

    try {
      console.log("[LiveManager] Initializing AudioContexts...");
      this.inputContext =
        new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: INPUT_SAMPLE_RATE,
        });

      // FIX 1: Ensure Input Context is Resumed
      if (this.inputContext.state === "suspended") {
        console.log("[LiveManager DEBUG] Resuming input context...");
        await this.inputContext.resume();
      }
      console.log(
        "[LiveManager DEBUG] Input context created, state:",
        this.inputContext.state
      );

      this.outputContext =
        new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: LIVE_SAMPLE_RATE,
        });
      console.log(
        "[LiveManager DEBUG] Output context created, state:",
        this.outputContext.state
      );

      this.outputNode = this.outputContext.createGain();
      this.outputNode.connect(this.outputContext.destination);
      console.log("[LiveManager DEBUG] Output node connected");

      console.log("[LiveManager] Requesting Microphone Access...");
      console.log("[LiveManager DEBUG] Calling getUserMedia...");
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      console.log(
        "[LiveManager DEBUG] Microphone granted, tracks:",
        this.stream.getTracks().length
      );

      console.log("[LiveManager] Connecting to Gemini Live API...");
      this.sessionPromise = this.ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        callbacks: {
          onopen: async () => {
            console.log("[LiveManager] Session OPEN");
            console.log(
              "[LiveManager DEBUG] Setting isConnected=true, isConnecting=false"
            );
            this.isConnecting = false;
            this.isConnected = true;
            console.log(
              "[LiveManager DEBUG] Calling startAudioInputStream(), stream=",
              !!this.stream,
              "inputContext=",
              !!this.inputContext,
              "sessionPromise=",
              !!this.sessionPromise
            );
            await this.startAudioInputStream();
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.setupComplete) {
              console.log(
                "[LiveManager] Setup complete - sending initial greeting request"
              );
              this.sessionPromise?.then((session) => {
                session.sendRealtimeInput({
                  text: "Say hello and introduce yourself briefly.",
                });
              });
              return;
            }

            if (message.serverContent?.interrupted) {
              console.log("[LiveManager] Interrupted by user");
              this.stopAllAudio();
              if (this.outputContext) this.nextStartTime = this.outputContext.currentTime;
              return;
            }

            const base64Audio =
              message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && this.outputContext && this.outputNode) {
              console.log(
                "[LiveManager DEBUG] Received audio response, length:",
                base64Audio.length
              );
              try {
                const pcmData = base64ToUint8Array(base64Audio);
                const audioBuffer = await decodeAudioData(
                  pcmData,
                  this.outputContext,
                  LIVE_SAMPLE_RATE
                );

                const channelData = audioBuffer.getChannelData(0);
                let sum = 0;
                for (let i = 0; i < channelData.length; i += 50) {
                  sum += Math.abs(channelData[i]);
                }
                const volume = sum / (channelData.length / 50);
                config.onAudioOutput(volume);

                this.queueAudio(audioBuffer);
              } catch (e) {
                console.warn("Error decoding audio chunk", e);
              }
            } else if (message.serverContent?.modelTurn) {
              console.log(
                "[LiveManager DEBUG] Model turn but no audio:",
                message.serverContent.modelTurn
              );
            }
          },
          onclose: () => {
            console.log("[LiveManager] Session CLOSED");
            console.log("[LiveManager DEBUG] onclose callback triggered");
            this.cleanup();
            console.log("[LiveManager DEBUG] Calling config.onClose()");
            config.onClose();
          },
          onerror: (e) => {
            console.error("[LiveManager] Session ERROR:", e);
            config.onError(new Error("Session error"));
            this.cleanup();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction:
            "You are a helpful assistant. Keep your responses concise and conversational.",
        },
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
    console.log(
      "[LiveManager DEBUG] startAudioInputStream called, inputContext=",
      !!this.inputContext,
      "stream=",
      !!this.stream,
      "sessionPromise=",
      !!this.sessionPromise
    );
    if (!this.inputContext || !this.stream || !this.sessionPromise) {
      console.error("[LiveManager ERROR] Cannot start audio input - missing:", {
        inputContext: !!this.inputContext,
        stream: !!this.stream,
        sessionPromise: !!this.sessionPromise,
      });
      return;
    }

    // CRITICAL FIX: Ensure inputContext is resumed (especially important in Electron)
    if (this.inputContext.state === "suspended") {
      console.log("[LiveManager DEBUG] Resuming suspended inputContext before starting stream");
      await this.inputContext.resume();
    }

    console.log("[LiveManager] Starting Audio Input Stream");
    this.inputSource = this.inputContext.createMediaStreamSource(this.stream);
    // createScriptProcessor may not be in lib.dom.d.ts in strict modes; cast to any to avoid TS errors
    this.processor = (this.inputContext as any).createScriptProcessor(512, 1, 1);

    let audioChunkCount = 0;
    this.processor.onaudioprocess = (e: AudioProcessingEvent) => {
      try {
        if (!this.sessionPromise || !this.inputContext) return;
        const inputData = e.inputBuffer.getChannelData(0);

        // Calculate volume to detect speech
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) sum += Math.abs(inputData[i]);
        const avgVolume = sum / inputData.length;

        // Report input volume for visualization
        if (this.config?.onAudioInput) {
          this.config.onAudioInput(avgVolume * 50);
        }

        audioChunkCount++;
        if (audioChunkCount % 200 === 0) {
          console.log(
            "[LiveManager DEBUG] Audio chunk",
            audioChunkCount,
            "volume:",
            avgVolume.toFixed(4)
          );
        }

        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        const uint8 = new Uint8Array(pcmData.buffer);
        const base64 = arrayBufferToBase64(uint8.buffer);

        if (!this.isMuted) {
          this.sessionPromise
            ?.then((session) => {
              if (session && this.isConnected) {
                session.sendRealtimeInput({
                  media: {
                    mimeType: "audio/pcm;rate=16000",
                    data: base64,
                  },
                });
              }
            })
            .catch((err) => {
              console.error("[LiveManager ERROR] Send audio error:", err);
            });
        }
      } catch (err) {
        console.error("[LiveManager ERROR] Audio processing error:", err);
      }
    };

    this.inputSource.connect(this.processor);

    // FIX 2: Connect to destination
    // Connect to dummy gain node (silenced) then to destination to keep graph alive
    const dummyGain = this.inputContext.createGain();
    dummyGain.gain.value = 0; // Mute processing output locally
    this.processor.connect(dummyGain);
    dummyGain.connect(this.inputContext.destination);

    console.log(
      "[LiveManager DEBUG] Audio input stream connected successfully (routed to destination)"
    );
  }

  private queueAudio(buffer: AudioBuffer) {
    if (!this.outputContext || !this.outputNode) return;

    const source = this.outputContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.outputNode);

    const currentTime = this.outputContext.currentTime;

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
    this.activeSources.forEach((src) => {
      try {
        src.stop();
      } catch (e) {}
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
      this.sessionPromise.then((session) => {
        try {
          console.log("[LiveManager DEBUG] Closing session");
          session.close();
        } catch (e) {
          console.warn("Error closing session", e);
        }
      });
    }
    this.cleanup();
  }

  private cleanup() {
    console.log(
      "[LiveManager DEBUG] cleanup() called, isConnected=",
      this.isConnected,
      "isConnecting=",
      this.isConnecting
    );
    if (this.isConnecting) {
      console.log("[LiveManager DEBUG] Still connecting, skipping cleanup");
      return;
    }

    if (this.stream) {
      console.log("[LiveManager DEBUG] Stopping stream tracks");
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.processor) {
      console.log("[LiveManager DEBUG] Disconnecting processor");
      try {
        this.processor.disconnect();
      } catch (e) {}
      this.processor = null;
    }
    if (this.inputSource) {
      console.log("[LiveManager DEBUG] Disconnecting input source");
      try {
        this.inputSource.disconnect();
      } catch (e) {}
      this.inputSource = null;
    }
    // CRITICAL FIX: Don't close contexts if we're still connecting or connected
    // This prevents the inputContext from being null when startAudioInputStream is called
    if (this.inputContext && this.inputContext.state !== "closed" && !this.isConnected) {
      console.log("[LiveManager DEBUG] Closing input context");
      try {
        this.inputContext.close();
      } catch (e) {}
      this.inputContext = null;
    }
    if (this.outputContext && this.outputContext.state !== "closed" && !this.isConnected) {
      console.log("[LiveManager DEBUG] Closing output context");
      try {
        this.outputContext.close();
      } catch (e) {}
      this.outputContext = null;
    }
    this.sessionPromise = null;
    this.nextStartTime = 0;
    this.isConnected = false;
    console.log("[LiveManager DEBUG] cleanup() complete");
  }
}
