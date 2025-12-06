import { GoogleGenAI, Chat } from "@google/genai";
import { ProcessedFile } from "../types";

let chatSession: Chat | null = null;
let currentFileContextHash = "";

export const initializeGemini = () => {
    // Basic check to ensure we have a key (though in this strict env prompt we rely on process.env)
    if (!process.env.API_KEY) console.warn("API Key is missing for Gemini");
};

const constructSystemPrompt = (files: ProcessedFile[]) => {
  const fileContexts = files
    .filter(f => f.status === 'ready')
    .map(f => `--- START FILE: "${f.name}" ---\n${f.content}\n--- END FILE: "${f.name}" ---`)
    .join('\n\n');

  return `
You are ConstructLM, an advanced construction AI assistant.
You have access to the following project documentation loaded in the context.

INSTRUCTIONS:
1. Answer the user's questions strictly based on the provided file contexts.
2. If the answer is not in the files, state that you cannot find the information in the loaded documents.
3. CITATION RULE: When you assert a fact derived from a specific file, you MUST provide a citation in a specific format.
   Format: {{citation:FileName.ext|Relevant short quote or summary of the section}}
   Example: The concrete grade is M30 {{citation:Specs_Vol1.pdf|Concrete grade for foundations shall be M30 as per Section 4.2}}.

CONTEXT:
${fileContexts}
`;
};

export const sendMessageToGemini = async (
  message: string,
  files: ProcessedFile[],
  onStream: (chunk: string) => void
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Re-initialize chat if file context changes (naïve approach for this demo)
  // In a production app, we might use caching or update system instruction dynamically if supported
  const newContextHash = files.map(f => f.id).join(',');
  
  if (!chatSession || currentFileContextHash !== newContextHash) {
    const systemInstruction = constructSystemPrompt(files);
    
    // Using gemini-2.5-flash for large context window and speed
    chatSession = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction,
        temperature: 0.3, // Lower temperature for more factual responses
      },
    });
    currentFileContextHash = newContextHash;
  }

  try {
    const responseStream = await chatSession.sendMessageStream({ message });
    
    let fullText = "";
    for await (const chunk of responseStream) {
        if(chunk.text) {
            fullText += chunk.text;
            onStream(fullText);
        }
    }
    return fullText;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};