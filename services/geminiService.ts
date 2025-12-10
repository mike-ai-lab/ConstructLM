import { GoogleGenAI, Modality, Content } from "@google/genai";
import { ProcessedFile, Message } from "../types";
import { base64ToUint8Array } from "./audioUtils";

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
  
  // Truncate large files to save tokens
  const fileContexts = activeFiles
    .map(f => {
      const content = f.content.length > 8000 ? f.content.substring(0, 8000) + '...[truncated]' : f.content;
      return `=== ${f.name} ===\n${content}`;
    })
    .join('\n\n');

  return `You are ConstructLM, an advanced AI assistant for construction documentation.

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

FILES:
${fileContexts}`;
};

let currentAbortController: AbortController | null = null;

export const sendMessageToGemini = async (
  history: Message[],
  newMessage: string,
  activeFiles: ProcessedFile[],
  onStream: (chunk: string) => void
) => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key is missing. Please check your environment configuration.");

  // Cancel any previous ongoing request
  if (currentAbortController) {
    currentAbortController.abort();
  }
  currentAbortController = new AbortController();
  const abortSignal = currentAbortController.signal;

  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = constructSystemPrompt(activeFiles);

  // Construct Content objects from history - filter efficiently
  const intro = 'intro';
  const errorPrefix = "Sorry, I encountered an error";
  const contents: Content[] = history
    .filter(m => !m.isStreaming && m.id !== intro && !m.content.startsWith(errorPrefix)) 
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
    console.log(`[Gemini] Sending message with ${contents.length} turns. System Prompt Length: ${systemInstruction.length}`);
    
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.0-flash-exp',
      contents: contents.slice(-4), // Only last 4 messages
      config: {
        systemInstruction,
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
    });
    
    // Use array for efficient string building
    const chunks: string[] = [];
    for await (const chunk of responseStream) {
        if (abortSignal.aborted) {
            console.log("[Gemini] Request cancelled by user");
            throw new Error("Request cancelled");
        }
        if(chunk.text) {
            chunks.push(chunk.text);
            onStream(chunks.join(''));
        }
    }
    console.log("[Gemini] Response complete");
    return chunks.join('');
  } catch (error) {
    if (error instanceof Error && error.message === "Request cancelled") {
      console.log("[Gemini] Request was cancelled");
      return "";
    }
    console.error("[Gemini] API Error:", error);
    throw error;
  } finally {
    if (currentAbortController?.signal === abortSignal) {
      currentAbortController = null;
    }
  }
};

export const cancelCurrentRequest = () => {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
    console.log("[Gemini] Request cancelled");
  }
};

export const generateSpeech = async (text: string): Promise<Uint8Array | null> => {
    // Validate input
    if (!text || !text.trim()) {
        console.warn("[TTS] Empty text provided, skipping speech generation");
        return null;
    }

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