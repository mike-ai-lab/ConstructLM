
import { GoogleGenAI } from "@google/genai";
import { Message, ProcessedFile } from "../types";
import { base64ToUint8Array } from "./audioUtils";
import { getApiKeyForModel, MODEL_REGISTRY } from "./modelRegistry";

// VERSION: 1.2 (Fix ContentUnion)
console.log("[GeminiService] Initializing v1.2");

// Track the active chat session and the files it has already "seen"
// We use 'any' for the session type here to avoid importing a type that isn't exported as a value
let chatSession: any | null = null;
let currentModelId: string | null = null;
let ingestedFileIds: Set<string> = new Set();

export const initializeGemini = () => {
    const googleModel = MODEL_REGISTRY.find(m => m.provider === 'google');
    if (googleModel && getApiKeyForModel(googleModel)) {
        console.log("Gemini Service initialized");
    }
};

const getClient = (apiKey: string) => new GoogleGenAI({ apiKey });

// Reset session (e.g. when changing models or clearing chat)
export const resetGeminiSession = () => {
    chatSession = null;
    ingestedFileIds.clear();
    currentModelId = null;
    console.log("[Gemini] Session reset");
};

export const streamGemini = async (
  modelId: string,
  apiKey: string,
  history: Message[],
  newMessage: string,
  systemInstruction: string,
  activeFiles: ProcessedFile[], // Files to check for incremental loading
  onStream: (chunk: string) => void
) => {
  const ai = getClient(apiKey);
  
  // 1. Initialize Session if needed
  if (!chatSession || currentModelId !== modelId) {
      console.log(`[Gemini] Starting new session with ${modelId}`);
      chatSession = ai.chats.create({
          model: modelId,
          config: {
              systemInstruction,
              temperature: 0.2, // Low temp for factual accuracy
          }
      });
      currentModelId = modelId;
      ingestedFileIds.clear();
  }

  // 2. Incremental Context Loading (The "Cache" Logic)
  // Identify which files in the active list haven't been sent to this session yet.
  const newFiles = activeFiles.filter(f => !ingestedFileIds.has(f.id));
  
  if (newFiles.length > 0) {
      console.log(`[Gemini] Ingesting ${newFiles.length} new files into context...`);
      
      // We construct a specific "System Update" message to inject data into the session history
      const fileContextMessage = newFiles.map(f => 
          `=== INGESTED FILE: "${f.name}" (${f.type.toUpperCase()}) ===\n${f.content}\n=== END FILE ===`
      ).join('\n\n');

      const contextInjectionPrompt = `
      [SYSTEM UPDATE: New files have been added to your context workspace. 
      Store this information in your context window for future queries. 
      Do not respond to this message, just acknowledge receipt.]
      
      ${fileContextMessage}
      `;

      // Send the files silently first. The model absorbs this into its history.
      await chatSession.sendMessage({ message: contextInjectionPrompt });
      
      // Mark as ingested so we don't send them again
      newFiles.forEach(f => ingestedFileIds.add(f.id));
  }

  // 3. Send the actual User Query
  try {
    console.log(`[Gemini] Sending query...`);
    
    // We do NOT send the history array here. 
    // The `chatSession` object maintains the history internally (Stateful).
    const responseStream = await chatSession.sendMessageStream({ message: newMessage });
    
    let fullText = "";
    for await (const chunk of responseStream) {
        if(chunk.text) {
            fullText += chunk.text;
            onStream(chunk.text); 
        }
    }
    console.log("[Gemini] Response complete");
    return fullText;
  } catch (error) {
    console.error("[Gemini] API Error:", error);
    // If context becomes invalid or too large, auto-reset the session for the next turn
    if ((error as any).message?.includes("token") || (error as any).status === 400) {
        console.warn("[Gemini] Context error detected. Resetting session.");
        resetGeminiSession();
    }
    throw error;
  }
};

export const generateSpeech = async (text: string): Promise<Uint8Array | null> => {
    console.log(`[TTS] Generating speech...`);
    const googleModel = MODEL_REGISTRY.find(m => m.provider === 'google');
    const apiKey = googleModel ? getApiKeyForModel(googleModel) : undefined;
    
    if (!apiKey) throw new Error("Google API Key missing for TTS.");

    const ai = getClient(apiKey);
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                // Use string literal 'AUDIO' to avoid importing Modality enum which might cause load issues
                responseModalities: ['AUDIO' as any], 
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
