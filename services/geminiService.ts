
import { GoogleGenAI, Modality, Content } from "@google/genai";
import { Message } from "../types";
import { base64ToUint8Array } from "./audioUtils";
import { getApiKeyForModel, MODEL_REGISTRY } from "./modelRegistry";

// Initialize simply checks if the default key is present for TTS purposes mostly
export const initializeGemini = () => {
    // We try to find the default google key
    const googleModel = MODEL_REGISTRY.find(m => m.provider === 'google');
    if (googleModel && getApiKeyForModel(googleModel)) {
        console.log("Gemini Service initialized");
    }
};

export const streamGemini = async (
  modelId: string,
  apiKey: string,
  history: Message[],
  newMessage: string,
  systemInstruction: string,
  onStream: (chunk: string) => void
) => {
  const ai = new GoogleGenAI({ apiKey });
  
  // Construct Content objects from history
  const contents: Content[] = history
    .filter(m => !m.isStreaming && m.id !== 'intro' && !m.content.includes("Sorry, I encountered an error")) 
    .map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
    }));

  // Append new message
  contents.push({
      role: 'user',
      parts: [{ text: newMessage }]
  });

  try {
    console.log(`[Gemini] Sending message to ${modelId}`);
    
    const responseStream = await ai.models.generateContentStream({
      model: modelId,
      contents: contents,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });
    
    let fullText = "";
    for await (const chunk of responseStream) {
        if(chunk.text) {
            fullText += chunk.text;
            onStream(chunk.text); // Send simpler chunk, caller accumulates or we accumulate? The caller usually accumulates display state.
        }
    }
    console.log("[Gemini] Response complete");
    return fullText;
  } catch (error) {
    console.error("[Gemini] API Error:", error);
    throw error;
  }
};

// TTS remains here as it is specific to Gemini
export const generateSpeech = async (text: string): Promise<Uint8Array | null> => {
    console.log(`[TTS] Generating speech...`);
    
    // For TTS we specifically need a Google Key. We look for the standard one.
    const googleModel = MODEL_REGISTRY.find(m => m.provider === 'google');
    const apiKey = googleModel ? getApiKeyForModel(googleModel) : undefined;
    
    if (!apiKey) throw new Error("Google API Key missing for TTS.");

    const ai = new GoogleGenAI({ apiKey });
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' }, 
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            return base64ToUint8Array(base64Audio);
        }
        return null;
    } catch (error) {
        console.error("[TTS] Error:", error);
        throw error;
    }
};
