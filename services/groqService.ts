import { ProcessedFile, Message } from "../types";

const constructSystemPrompt = (files: ProcessedFile[]) => {
  const activeFiles = files.filter(f => f.status === 'ready');
  
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

export const sendMessageToGroq = async (
  modelId: string,
  apiKey: string,
  history: Message[],
  newMessage: string,
  activeFiles: ProcessedFile[],
  onStream: (chunk: string) => void
) => {
  const systemInstruction = constructSystemPrompt(activeFiles);
  
  const messages = [
    { role: 'system', content: systemInstruction },
    ...history
      .filter(m => !m.isStreaming && m.id !== 'intro')
      .slice(-4)
      .map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.content })),
    { role: 'user', content: newMessage }
  ];

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      stream: true,
      max_tokens: 4096,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  let fullText = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = new TextDecoder().decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return fullText;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              onStream(content); // Send only the new chunk
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullText;
};