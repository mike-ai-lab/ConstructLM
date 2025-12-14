import { GoogleGenAI, Chat, GenerateContentResponse, Modality } from "@google/genai";
import { ProcessedFile } from "../types";
import { base64ToUint8Array } from "./audioUtils";

let chatSession: Chat | null = null;
let currentContextHash = "";

// Robust way to get API key in browser or node environments without crashing
export const getApiKey = (): string => {
  try {
    // Check if 'process' exists before accessing it to avoid ReferenceError in strict browsers
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {
    console.warn("Error accessing environment variables:", e);
  }
  return "";
};

export const initializeGemini = () => {
    const key = getApiKey();
    if (!key) console.warn("API Key is missing for Gemini");
    else console.log("Gemini initialized with API Key present");
};

const constructSystemPrompt = (files: ProcessedFile[]) => {
  const activeFiles = files.filter(f => f.status === 'ready');
  
  if (activeFiles.length === 0) {
    return `You are ConstructLM, an intelligent AI assistant.

You are helpful, knowledgeable, and provide clear, comprehensive responses.
You can assist with construction, engineering, general questions, and any other topics.

RESPONSE STYLE:
- Be clear, helpful, and engaging
- Provide thorough, well-structured responses
- Use bullet points and formatting when appropriate
- Be conversational yet professional`;
  }
  
  const fileContexts = activeFiles
    .map(f => `=== FILE: "${f.name}" ===\n${f.content}\n=== END FILE ===`)
    .join('\n\n');

  return `You are ConstructLM, a professional construction documentation assistant.

RESPONSE STYLE:
- Write in a **professional, executive summary tone**
- Use **proper Markdown formatting**: headers (###), tables, bullet points, bold text
- Create **organized sections** with clear hierarchy
- Be **concise and direct** - avoid repetitive phrasing
- Use **tables** for dimensional data and specifications
- Group related information logically

CITATION RULES:
1. **Strategic citations only** - Cite key facts, categories, and important specifications
2. **DO NOT cite every single number** - Only cite representative examples or critical data
3. Format: {{citation:filename|location|brief_quote}}
4. Excel: {{citation:file.xlsx|Sheet: Name, Row X|key_value}}
5. PDF: {{citation:file.pdf|Page X|text_snippet}}
6. Keep quotes brief (2-5 words)
7. Place citations at the END of sentences or bullet points, not mid-sentence

EXAMPLE GOOD OUTPUT:
### Door Types
The schedule identifies several door categories:
* **Glazed Doors (Exterior)** {{citation:file.pdf|Page 1|Glazed doors with frames}}
  * Include overhead fixed panels and NAJDI design shutters {{citation:file.pdf|Page 1|NAJDI design}}
  * Acoustic ratings: 32 dB to 35 dB {{citation:file.pdf|Page 2|32 dB acoustic}}

EXAMPLE BAD OUTPUT (DO NOT DO THIS):
EXT-C1: Double leaf, 2400mm {{citation:...}} (W) x 3400mm {{citation:...}} (H), 35 dB {{citation:...}}

FILES:
${fileContexts}`;
};

export const sendMessageToGemini = async (
  message: string,
  files: ProcessedFile[],
  activeFiles: ProcessedFile[],
  onStream: (chunk: string) => void
) => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });
  const newContextHash = activeFiles.map(f => f.id).sort().join(',');
  
  if (!chatSession || currentContextHash !== newContextHash) {
    const systemInstruction = constructSystemPrompt(activeFiles);
    chatSession = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction,
        temperature: activeFiles.length > 0 ? 0.1 : 0.7,
        maxOutputTokens: 8192
      },
    });
    currentContextHash = newContextHash;
  }

  try {
    const responseStream = await chatSession.sendMessageStream({ message });
    let fullText = "";
    
    for await (const chunk of responseStream) {
      const c = chunk as GenerateContentResponse;
      if(c.text) {
        fullText += c.text;
        onStream(c.text);
      }
    }
    return fullText;
  } catch (error) {
    console.error("[Gemini] Error:", error);
    throw error;
  }
};

export const generateSpeech = async (text: string): Promise<Uint8Array | null> => {
    console.log(`[TTS] Generating speech for: "${text.substring(0, 30)}..."`);
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("API Key is missing.");

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
            console.log("[TTS] Audio generated successfully");
            return base64ToUint8Array(base64Audio);
        }
        console.warn("[TTS] No audio data in response");
        return null;
    } catch (error) {
        console.error("[TTS] Error:", error);
        throw error;
    }
};