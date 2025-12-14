import { ProcessedFile, Message } from "../types";

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

  return `You are ConstructLM, a construction documentation assistant.

CITATION RULES:
1. ALWAYS cite immediately after each fact: Total items: 258 {{citation:file.xlsx|Sheet: Summary, Row 4|258}}
2. Use format: {{citation:filename|location|key_data}}
3. Excel format: {{citation:file.xlsx|Sheet: Name, Row X|exact_cell_value}}
4. PDF format: {{citation:file.pdf|Page X|exact_text_snippet}}
5. Place citations RIGHT AFTER the data, not at sentence end
6. Use concise quotes (2-5 words max)
7. Cite frequently but avoid duplicates

RESPONSE STYLE:
- Be precise and factual
- Use bullet points and structure
- Keep under 150 lines
- No repetitive content

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
      .filter(m => !m.isStreaming && m.id !== 'intro' && m.content?.trim())
      .slice(-5)
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
      max_tokens: 2048,
      temperature: activeFiles.length > 0 ? 0.1 : 0.7,
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