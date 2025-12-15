import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useLiveDictation } from '../hooks/useLiveDictation';
import { Mic, Square, Copy, Save, Trash2, Volume2, Loader2 } from 'lucide-react';
import { generateSpeech } from '../services/geminiService';
import { decodeAudioData } from '../services/audioUtils';
import { chatRegistry } from '../services/chatRegistry';

interface DictationTabProps {
  activeTab: 'chat' | 'dictation';
  setActiveTab: (tab: 'chat' | 'dictation') => void;
}

export default function DictationTab({ activeTab, setActiveTab }: DictationTabProps) {
  const [historyText, setHistoryText] = useState(() => localStorage.getItem('dictation_draft') || '');
  const [currentText, setCurrentText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fullText = historyText + currentText;

  useEffect(() => {
    localStorage.setItem('dictation_draft', fullText);
  }, [fullText]);

  const handleTranscriptionUpdate = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      setHistoryText(prev => {
        const needsSpace = prev.length > 0 && !prev.endsWith(' ') && !prev.endsWith('\n');
        return prev + (needsSpace ? ' ' : '') + text;
      });
      setCurrentText('');
    } else {
      setCurrentText(text);
    }
  }, []);

  const handleDictationError = useCallback((err: string) => {
    setError(err);
    setTimeout(() => setError(null), 5000);
  }, []);

  const { isRecording, audioLevel, start, stop } = useLiveDictation({
    onTranscriptionUpdate: handleTranscriptionUpdate,
    onError: handleDictationError,
  });

  const toggleRecording = () => {
    if (isRecording) stop();
    else start();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fullText);
    setError('Copied to clipboard!');
    setTimeout(() => setError(null), 2000);
  };

  const handleSave = () => {
    if (!fullText.trim()) return;
    
    const newChat = chatRegistry.createNewChat(
      fullText.split(' ').slice(0, 4).join(' ') || 'Dictation',
      'gemini-2.5-flash'
    );
    
    chatRegistry.saveChat({
      ...newChat,
      messages: [{
        id: Date.now().toString(),
        role: 'user',
        content: fullText,
        timestamp: Date.now()
      }]
    });
    
    setHistoryText('');
    setCurrentText('');
    setError('Saved to chat history!');
    setTimeout(() => setError(null), 2000);
  };

  const handleClear = () => {
    if (window.confirm('Clear all text?')) {
      setHistoryText('');
      setCurrentText('');
    }
  };

  const handleSpeak = async () => {
    if (!fullText.trim() || isSpeaking) return;
    setIsSpeaking(true);
    try {
      const audioData = await generateSpeech(fullText.substring(0, 1000));
      if (audioData) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;
        const audioBuffer = await decodeAudioData(audioData, ctx, 24000);
        
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => setIsSpeaking(false);
        source.start();
      } else {
        setIsSpeaking(false);
      }
    } catch (e) {
      console.error(e);
      setError('Failed to generate speech.');
      setIsSpeaking(false);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setHistoryText(e.target.value);
    setCurrentText('');
  };

  return (
    <div className="flex flex-col h-screen w-full bg-white dark:bg-[#1a1a1a] relative">
      {/* Header */}
      <div className="h-[65px] flex-none border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] flex items-center justify-between px-6 bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
            <Mic className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#1a1a1a] dark:text-white">Live Dictation</h2>
            <p className="text-xs text-[#666666] dark:text-[#a0a0a0]">Real-time AI transcription</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] p-1 rounded-lg border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'chat'
                  ? 'bg-white dark:bg-[#1a1a1a] text-[#1a1a1a] dark:text-white shadow-sm'
                  : 'text-[#666666] dark:text-[#a0a0a0] hover:text-[#1a1a1a] dark:hover:text-white'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab('dictation')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'dictation'
                  ? 'bg-white dark:bg-[#1a1a1a] text-[#1a1a1a] dark:text-white shadow-sm'
                  : 'text-[#666666] dark:text-[#a0a0a0] hover:text-[#1a1a1a] dark:hover:text-white'
              }`}
            >
              Dictation
            </button>
          </div>

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
            isRecording 
              ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800' 
              : 'bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] text-[#666666] dark:text-[#a0a0a0] border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]'
          }`}>
            {isRecording ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span>Listening...</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-[#666666] dark:bg-[#a0a0a0] rounded-full"></div>
                <span>Ready</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Text Area */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="max-w-3xl mx-auto h-full">
            <textarea
              ref={textareaRef}
              value={fullText}
              onChange={handleTextChange}
              placeholder="Tap the microphone to start dictating..."
              className="w-full h-full resize-none bg-transparent border-none outline-none text-[#1a1a1a] dark:text-white text-base leading-relaxed"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            />
          </div>
        </div>

        {/* Audio Visualizer */}
        <div className={`h-12 border-t border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] flex items-center justify-center transition-opacity ${
          isRecording ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="flex items-center gap-1 h-8">
            {Array.from({ length: 40 }).map((_, i) => {
              const height = Math.max(4, Math.min(32, audioLevel * 1000 * (1 - Math.abs(i - 20) / 20)));
              return (
                <div
                  key={i}
                  className="w-1 bg-rose-500 dark:bg-rose-400 rounded-full transition-all duration-75"
                  style={{ height: `${height}px` }}
                />
              );
            })}
          </div>
        </div>

        {/* Floating Record Button */}
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20">
          <button
            onClick={toggleRecording}
            className={`group relative flex items-center justify-center w-16 h-16 rounded-full shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 ${
              isRecording 
                ? 'bg-white dark:bg-[#2a2a2a] border-4 border-rose-500 text-rose-500' 
                : 'bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] hover:bg-[#222222] dark:hover:bg-[#f5f5f5]'
            }`}
          >
            {isRecording ? <Square size={24} /> : <Mic size={24} />}
            {isRecording && (
              <span className="absolute -inset-1 rounded-full border border-rose-500 opacity-50 animate-ping"></span>
            )}
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-center gap-3 p-4 border-t border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a]">
        <button
          onClick={handleCopy}
          disabled={!fullText.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#222222] text-[#1a1a1a] dark:text-white rounded-lg hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]"
          title="Copy Text"
        >
          <Copy size={16} />
          <span className="text-sm font-medium">Copy</span>
        </button>

        <button
          onClick={handleSpeak}
          disabled={isSpeaking || !fullText.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#222222] text-[#1a1a1a] dark:text-white rounded-lg hover:bg-[rgba(0,0,0,0.06)] dark:hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]"
          title="Read Aloud"
        >
          {isSpeaking ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
          <span className="text-sm font-medium">Speak</span>
        </button>

        <button
          onClick={handleSave}
          disabled={!fullText.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-[#4485d1] text-white rounded-lg hover:bg-[#3a75c1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Save to Chat History"
        >
          <Save size={16} />
          <span className="text-sm font-medium">Save</span>
        </button>

        <button
          onClick={handleClear}
          disabled={!fullText.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#222222] text-[#ef4444] rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]"
          title="Clear All"
        >
          <Trash2 size={16} />
          <span className="text-sm font-medium">Clear</span>
        </button>
      </div>

      {/* Error Toast */}
      {error && (
        <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 px-4 py-3 rounded-lg shadow-lg border flex items-center gap-2 z-50 ${
          error.includes('Copied') || error.includes('Saved')
            ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
        }`}>
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}
    </div>
  );
}
