import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { ProcessedFile } from "../types";

let chatSession: Chat | null = null;
let currentContextHash = "";

// Robust way to get API key in browser or node environments without crashing
const getApiKey = (): string => {
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
   - "The concrete grade is M35 {{citation:Specs_v2.pdf|Page 12, Section 4.1|Grade of concrete shall be M35 for all substructures}}"
   - "The cost of steel is $1200/ton {{citation:BOQ_Final.xlsx|Sheet: Pricing, Row 45|Structural Steel | 1200 | USD}}"

3. CRITICAL RULES FOR CITATIONS:
   - Part 1: Filename (must match exactly).
   - Part 2: Location (Page number, Sheet name, or Section).
   - Part 3: EVIDENCE. This is the most important part. Copy the exact text or data row from the file that supports your statement. Do not just say "Page 5", tell me what text on Page 5 supports the claim.

4. If a user asks about a specific file (e.g., "What's in the BOQ?"), summarize that specific file's content.
5. If the information is not in the provided files, state: "I couldn't find that information in the active documents."

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
  // We include IDs of activeFiles in the hash
  const newContextHash = activeFiles.map(f => f.id).sort().join(',');
  
  if (!chatSession || currentContextHash !== newContextHash) {
    // We rebuild the system prompt based on the *Specific* active files to save tokens
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
    const responseStream = await chatSession.sendMessageStream({ message });
    
    let fullText = "";
    for await (const chunk of responseStream) {
        const c = chunk as GenerateContentResponse;
        if(c.text) {
            fullText += c.text;
            onStream(fullText);
        }
    }
    return fullText;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};