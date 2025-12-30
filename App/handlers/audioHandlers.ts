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
      const apiKey = getApiKey();
      if (!apiKey) {
        setIsTranscribing(false);
        return;
      }
      
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      // Use Google Speech-to-Text API (correct endpoint)
      const apiUrl = `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            encoding: 'WEBM_OPUS',
            sampleRateHertz: 48000,
            languageCode: 'en-US',
            enableAutomaticPunctuation: true
          },
          audio: {
            content: base64Audio
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Transcription API error:', errorData);
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      const transcription = result.results?.[0]?.alternatives?.[0]?.transcript || '';
      
      if (transcription) {
        setInput(prev => prev + (prev ? ' ' : '') + transcription.trim());
      }
    } catch (error) {
      console.error('Transcription error:', error);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        setIsRecording(false);
      }
    } else {
      // Start recording
      try {
        const apiKey = getApiKey();
        
        if (!apiKey) {
          return;
        }
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        
        const recorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm'
        });
        
        const chunks: Blob[] = [];
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };
        
        recorder.onstop = async () => {
          stream.getTracks().forEach(track => track.stop());
          
          if (chunks.length > 0) {
            const audioBlob = new Blob(chunks, { type: 'audio/webm' });
            await transcribeAudio(audioBlob);
          }
          
          setMediaRecorder(null);
        };
        
        recorder.onerror = (e) => {
          console.error('MediaRecorder error:', e);
          stream.getTracks().forEach(track => track.stop());
          setIsRecording(false);
          setMediaRecorder(null);
        };
        
        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start recording:', error);
        setIsRecording(false);
      }
    }
  };

  return {
    handleToggleRecording,
  };
};
