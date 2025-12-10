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
  // 1. Filter only ready files
  const activeFiles = files.filter(f => f.status === 'ready');
  
  // 2. Build Context
  const fileContexts = activeFiles
    .map(f => `=== FILE START: "${f.name}" (${f.type.toUpperCase()}) ===\n${f.content}\n=== FILE END: "${f.name}" ===`)
    .join('\n\n');

  // 3. Efficiency Warning in System Prompt (for the Model)
  const contextNote = activeFiles.length > 0 
    ? `You have access to ${activeFiles.length} specific file(s) for this query.`
    : "You have access to all project files.";

  return `
You are ConstructLM, an advanced AI assistant for construction documentation.
${contextNote}

INSTRUCTIONS:
1. Answer strictly based on the provided FILE CONTEXTS.
2. CITATIONS ARE MANDATORY. When you use information from a file, you MUST cite it using the strict 3-part format below.
   
   Format: {{citation:FileName.ext|Location Info|Verbatim Quote or Evidence}}
   
   Examples:
   - "The beam depth is 600mm {{citation:Structural_Drawings.pdf|Page 5|Beam Schedule B1 lists depth as 600}}"
   - "The function uses a recursive loop {{citation:utils.ts|Line 45|const recursiveLoop = (n) => ...}}"
   - "The cost of steel is $1200/ton {{citation:BOQ_Final.xlsx|Sheet: Pricing, Row 45|Structural Steel | 1200 | USD}}"

3. CRITICAL RULES FOR CITATIONS:
   - Part 1: Filename (must match exactly).
   - Part 2: Location. 
     - For PDF: Use "Page X". 
     - For Excel: Use "Sheet: [Name], Row [Number]".
     - For Text/Code/Markdown: Use "Line X" (estimate the line number based on the file content provided).
   - Part 3: EVIDENCE. Copy the exact text or data row from the file.

4. If a user asks about a specific file (e.g., "What's in the BOQ?"), summarize that specific file's content.
5. If the information is not in the provided files, state: "I couldn't find that information in the active documents."
6. Use Markdown for formatting your response (bold, lists, headers).

CONTEXT:
${fileContexts}
`;
};

export const sendMessageToGemini = async (
  message: string,
  files: ProcessedFile[], // These are ALL files
  activeFiles: ProcessedFile[], // These are the files specifically mentioned (or ALL if none mentioned)
  onStream: (chunk: string) => void
) => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key is missing. Please check your environment configuration.");

  const ai = new GoogleGenAI({ apiKey });
  
  // Create a hash to check if we need to rebuild the session (Context changed?)
  const newContextHash = activeFiles.map(f => f.id).sort().join(',');
  
  if (!chatSession || currentContextHash !== newContextHash) {
    console.log(`[Gemini] Rebuilding session (Context changed or new session). Active files: ${activeFiles.length}`);
    const systemInstruction = constructSystemPrompt(activeFiles);
    
    chatSession = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction,
        temperature: 0.2, // Low temperature for high factual accuracy
      },
    });
    currentContextHash = newContextHash;
  }

  try {
    console.log(`[Gemini] Sending message: "${message.substring(0, 50)}..."`);
    const responseStream = await chatSession.sendMessageStream({ message });
    
    let fullText = "";
    for await (const chunk of responseStream) {
        const c = chunk as GenerateContentResponse;
        if(c.text) {
            fullText += c.text;
            onStream(fullText);
        }
    }
    console.log("[Gemini] Response complete");
    return fullText;
  } catch (error) {
    console.error("[Gemini] API Error:", error);
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