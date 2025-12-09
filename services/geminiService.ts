import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { ProcessedFile } from "../types";

let chatSession: Chat | null = null;
let currentFileContextHash = "";

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
  const fileContexts = files
    .filter(f => f.status === 'ready')
    .map(f => `=== FILE START: "${f.name}" (${f.type.toUpperCase()}) ===\n${f.content}\n=== FILE END: "${f.name}" ===`)
    .join('\n\n');

  return `
You are ConstructLM, an advanced AI assistant for construction documentation.
You have access to the following local project files (PDFs, Excel BOQs, Specifications).

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
5. If the information is not in the files, state: "I couldn't find that information in the loaded documents."

CONTEXT:
${fileContexts}
`;
};

export const sendMessageToGemini = async (
  message: string,
  files: ProcessedFile[],
  onStream: (chunk: string) => void
) => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key is missing. Please check your environment configuration.");

  const ai = new GoogleGenAI({ apiKey });
  
  // Re-initialize chat if file context changes (naïve approach for this demo)
  const newContextHash = files.map(f => f.id + f.name).join(',');
  
  if (!chatSession || currentFileContextHash !== newContextHash) {
    const systemInstruction = constructSystemPrompt(files);
    
    // Using gemini-2.5-flash for large context window (1M tokens) which is ideal for large documents
    chatSession = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction,
        temperature: 0.2, // Low temperature for high factual accuracy
      },
    });
    currentFileContextHash = newContextHash;
  }

  try {
    const responseStream = await chatSession.sendMessageStream({ message });
    
    let fullText = "";
    for await (const chunk of responseStream) {
        // Safe cast or access
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