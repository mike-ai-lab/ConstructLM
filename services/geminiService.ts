import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import {
  arrayBufferToBase64,
  base64ToUint8Array,
  decodeAudioData,
  LIVE_SAMPLE_RATE,
  INPUT_SAMPLE_RATE,
} from "./audioUtils";

export function getApiKey(): string | undefined {
  // Use same storage format as modelRegistry
  const keyWithPrefix = localStorage.getItem('constructlm_config_GEMINI_API_KEY');
  if (keyWithPrefix) return keyWithPrefix;
  
  // Fallback to old formats
  const key = localStorage.getItem('GEMINI_API_KEY');
  return key || undefined;
}

export function initializeGemini(): void {
  // Initialization logic if needed
}

export async function sendMessageToGemini(
  modelId: string,
  apiKey: string,
  message: string,
  activeFiles: any[],
  onStream: (chunk: string, thinking?: string) => void,
  systemPrompt?: string,
  history?: any[]
): Promise<{ inputTokens?: number; outputTokens?: number; totalTokens?: number }> {
  if (!apiKey) throw new Error("API Key missing");



  // Separate text and image files
  const imageFiles = activeFiles.filter(f => f.type === 'image');
  const textFiles = activeFiles.filter(f => f.type !== 'image');

  // Upload images directly to Gemini File API for efficient token usage (~10 tokens vs 7K)
  const uploadedFiles: any[] = [];
  for (const imgFile of imageFiles) {
    if (imgFile.fileHandle) {
      try {
        
        // Upload original File object directly - no base64 conversion needed!
        const formData = new FormData();
        formData.append('file', imgFile.fileHandle, imgFile.name);
        
        const uploadResponse = await fetch(
          `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
          {
            method: 'POST',
            body: formData
          }
        );
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          const tokenEstimate = Math.ceil(imgFile.size / 750); // Gemini's ~750 bytes per token for images
          uploadedFiles.push({
            fileUri: uploadResult.file.uri,
            mimeType: uploadResult.file.mimeType
          });
        } else {
          const errorText = await uploadResponse.text();
          console.warn('🔵 [GEMINI] ⚠️ File upload failed:', errorText);
          throw new Error(`Upload failed: ${errorText}`);
        }
      } catch (error) {
        console.error('🔵 [GEMINI] ❌ File upload error:', error);
        throw new Error(`Failed to upload image "${imgFile.name}": ${error instanceof Error ? error.message : 'Unknown error'}. Try using a smaller image or switch to a different model.`);
      }
    }
  }

  const contents = [];
  
  if (history && history.length > 0) {
    const recentHistory = history.filter(m => !m.isStreaming && m.id !== 'intro').slice(-10);
    
    for (const msg of recentHistory) {
      if (msg.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: msg.content }] });
      } else if (msg.role === 'model') {
        contents.push({ role: 'model', parts: [{ text: msg.content }] });
      }
    }
  }
  
  // Build parts for current message - include text and uploaded file references
  const currentParts: any[] = [{ text: message }];
  
  // Add uploaded files (uses file URI - only ~10 tokens instead of 7K!)
  for (const file of uploadedFiles) {
    currentParts.push({
      fileData: {
        mimeType: file.mimeType,
        fileUri: file.fileUri
      }
    });
  }
  
  contents.push({ role: "user", parts: currentParts });
  
  const requestBody: any = { 
    contents,
    generationConfig: {
      temperature: systemPrompt?.includes('STRICT RULES') || systemPrompt?.includes('CRITICAL SOURCE RESTRICTION') ? 0.3 : 0.7,
      topK: 40,
      topP: systemPrompt?.includes('STRICT RULES') || systemPrompt?.includes('CRITICAL SOURCE RESTRICTION') ? 0.8 : 0.95,
      maxOutputTokens: 8192
    }
  };
  
  if (systemPrompt) {
    requestBody.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  console.log('🔵 [GEMINI] Request body size:', JSON.stringify(requestBody).length, 'bytes');
  console.log('🔵 [GEMINI] Total content messages:', contents.length);
  console.log('🔵 [GEMINI] Current message parts:', currentParts.length);
  console.log('🔵 [GEMINI] Sending request to API...');
  
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${apiKey}&alt=sse`;
  const response = await fetch(apiUrl,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    }
  );

  console.log('🔵 [GEMINI] Response status:', response.status, response.statusText);
  
  if (!response.ok) {
    console.error('🔴 [GEMINI] API ERROR:', response.status);
    const errorBody = await response.text().catch(() => 'Unable to read error');
    console.error('🔴 [GEMINI] Error details:', errorBody.substring(0, 200));
    throw new Error(`API Error: ${response.statusText}`);
  }
  if (!response.body) throw new Error("No response body");

  console.log('🟢 [GEMINI] Streaming response started...');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let thinkingContent = "";
  let chunkCount = 0;
  let totalChars = 0;
  let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

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
          const parts = json.candidates?.[0]?.content?.parts || [];
          
          for (const part of parts) {
            if (part.thought) {
              thinkingContent += part.text || "";
            } else if (part.text) {
              chunkCount++;
              totalChars += part.text.length;
              onStream(part.text, thinkingContent || undefined);
            }
          }
          
          // Capture usage metadata from Gemini response
          if (json.usageMetadata) {
            usage.inputTokens = json.usageMetadata.promptTokenCount || 0;
            usage.outputTokens = json.usageMetadata.candidatesTokenCount || 0;
            usage.totalTokens = json.usageMetadata.totalTokenCount || 0;
          }
        } catch (e) {}
      }
    }
  }
  
  console.log('🟢 [GEMINI] Streaming complete');
  console.log('🟢 [GEMINI] Chunks received:', chunkCount);
  console.log('🟢 [GEMINI] Total characters:', totalChars);
  console.log('🟢 [GEMINI] Token usage:', usage);
  console.log('🔵 [GEMINI] === REQUEST END ===');
  
  return usage;
}

export async function generateSpeech(text: string): Promise<Uint8Array | null> {
  try {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key missing");
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
    const response = await fetch(apiUrl,
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

    if (this.inputContext.state === "suspended") {
      console.log("[LiveManager DEBUG] Resuming suspended inputContext before starting stream");
      await this.inputContext.resume();
    }

    console.log("[LiveManager] Starting Audio Input Stream");
    this.inputSource = this.inputContext.createMediaStreamSource(this.stream);
    this.processor = (this.inputContext as any).createScriptProcessor(512, 1, 1);

    let audioChunkCount = 0;
    this.processor.onaudioprocess = (e: AudioProcessingEvent) => {
      try {
        if (!this.sessionPromise || !this.inputContext) return;
        const inputData = e.inputBuffer.getChannelData(0);

        let sum = 0;
        for (let i = 0; i < inputData.length; i++) sum += Math.abs(inputData[i]);
        const avgVolume = sum / inputData.length;

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

    const dummyGain = this.inputContext.createGain();
    dummyGain.gain.value = 0;
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
