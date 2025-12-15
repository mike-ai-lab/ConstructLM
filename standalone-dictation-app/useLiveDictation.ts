import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAIBlob } from '@google/genai';
import { getApiKey } from '../services/geminiService';

interface UseLiveDictationProps {
  onTranscriptionUpdate: (text: string, isFinal: boolean) => void;
  onError: (error: string) => void;
}

const createPcmBlob = (data: Float32Array): GenAIBlob => {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return {
    data: btoa(binary),
    mimeType: 'audio/pcm;rate=16000',
  };
};

export const useLiveDictation = ({ onTranscriptionUpdate, onError }: UseLiveDictationProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const currentTranscriptionRef = useRef('');

  const stop = useCallback(async () => {
    setIsRecording(false);
    setAudioLevel(0);

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    if (inputAudioContextRef.current) {
      await inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }

    if (sessionPromiseRef.current) {
      sessionPromiseRef.current = null;
    }
    
    if (currentTranscriptionRef.current) {
      onTranscriptionUpdate(currentTranscriptionRef.current, true);
      currentTranscriptionRef.current = '';
    }
  }, [onTranscriptionUpdate]);

  const start = useCallback(async () => {
    try {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error('API Key is missing');

      setIsRecording(true);
      currentTranscriptionRef.current = '';

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputAudioContext = new AudioContextClass({ sampleRate: 16000 });
      inputAudioContextRef.current = inputAudioContext;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey });

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              
              let sum = 0;
              for(let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);
              setAudioLevel(rms);

              const pcmBlob = createPcmBlob(inputData);
              
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              currentTranscriptionRef.current += text;
              onTranscriptionUpdate(currentTranscriptionRef.current, false);
            }

            if (message.serverContent?.turnComplete) {
              onTranscriptionUpdate(currentTranscriptionRef.current, true);
              currentTranscriptionRef.current = '';
            }
          },
          onerror: (error) => {
            console.error('Gemini Live Error:', error);
            onError('Connection error occurred.');
            stop();
          },
          onclose: () => {
            stop();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          systemInstruction: "You are an expert transcriber. Your task is to transcribe speech to text accurately. Strict rules:\n1. Apply proper punctuation (periods, commas, question marks) and capitalization.\n2. DO NOT include filler words (um, uh, ah), stuttering, or tags like <noise>.\n3. Output clean, readable prose.",
        },
      });

    } catch (err: any) {
      console.error('Failed to start recording:', err);
      onError(err.message || 'Failed to access microphone or connect to API.');
      stop();
    }
  }, [onTranscriptionUpdate, onError, stop]);

  return {
    isRecording,
    audioLevel,
    start,
    stop,
  };
};
