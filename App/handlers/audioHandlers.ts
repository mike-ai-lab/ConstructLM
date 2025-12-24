import { getApiKey } from '../../services/geminiService';
import { showToast } from '../../utils/uiHelpers';

export const createAudioHandlers = (
  isRecording: boolean,
  setIsRecording: (recording: boolean) => void,
  mediaRecorder: MediaRecorder | null,
  setMediaRecorder: (recorder: MediaRecorder | null) => void,
  setInput: (input: string | ((prev: string) => string)) => void,
  setIsTranscribing: (transcribing: boolean) => void
) => {
  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      const apiKey = getApiKey();
      if (!apiKey) {
        setIsTranscribing(false);
        return;
      }
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: 'Transcribe this audio accurately.' },
                { inlineData: { mimeType: 'audio/webm', data: base64Audio } }
              ]
            }]
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      const transcription = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (transcription) {
        setInput(prev => prev + (prev ? ' ' : '') + transcription);
      }
    } catch (error) {
      console.error('Transcription error:', error);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorder) {
        mediaRecorder.stop();
        setIsRecording(false);
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        
        recorder.onstop = async () => {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          stream.getTracks().forEach(track => track.stop());
          await transcribeAudio(audioBlob);
        };
        
        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start recording:', error);
      }
    }
  };

  return {
    handleToggleRecording,
  };
};
