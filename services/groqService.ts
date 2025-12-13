import { ProcessedFile, Message } from "../types";

const constructSystemPrompt = (files: ProcessedFile[]) => {
  const activeFiles = files.filter(f => f.status === 'ready');
  
  const fileContexts = activeFiles
    .map(f => {
      const content = f.content.length > 1500 ? f.content.substring(0, 1500) + '...[truncated]' : f.content;
      return `=== ${f.name} ===\n${content}`;
    })
    .join('\n\n');

  return `You are ConstructLM, a construction documentation AI assistant.

Answer based on provided files. Use citations: {{citation:FileName.ext|Location|Quote}}

Examples:
- "Beam depth is 600mm {{citation:Structural.pdf|Page 5|Beam B1: 600mm}}"
- "Steel cost $1200/ton {{citation:BOQ.xlsx|Sheet: Pricing, Row 45|Steel | 1200}}"

For Excel: Always specify "Sheet: [Name], Row [Number]".

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
      .filter(m => !m.isStreaming && m.id !== 'intro' && m.content?.trim())
      .slice(-3)
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
      max_tokens: 1024,
      temperature: 0.1,
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
              onStream(content);
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