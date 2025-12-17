import { ProcessedFile, Message } from "../types";

const constructSystemPrompt = (files: ProcessedFile[]) => {
  const activeFiles = files.filter(f => f.status === 'ready');
  
  if (activeFiles.length === 0) {
    return `You are ConstructLM, an intelligent AI assistant with expertise in construction, engineering, and general knowledge.

RESPONSE QUALITY:
- Provide thorough, well-structured responses with clear organization
- Use headers, bullet points, and formatting to enhance readability
- Be comprehensive yet concise - aim for depth without unnecessary verbosity
- Include relevant context, examples, and explanations
- Structure complex information hierarchically

TONE & STYLE:
- Professional yet conversational and approachable
- Clear and precise language
- Helpful and informative
- Provide actionable insights when applicable`;
  }
  
  const fileContexts = activeFiles
    .map(f => `=== FILE: "${f.name}" ===\n${f.content}\n=== END FILE ===`)
    .join('\n\n');

  return `You are ConstructLM, an intelligent AI assistant with expertise in construction, engineering, and technical documentation analysis.

RESPONSE STRUCTURE & QUALITY:
- Provide comprehensive, well-organized responses with clear sections and subsections
- Use hierarchical formatting: main headers (###), subheaders, and nested bullet points
- Group related information together in rich, detailed paragraphs
- Each section should contain substantial content (3-5 sentences or multiple bullet points)
- Combine multiple related facts into cohesive statements
- Use descriptive introductions before listing details

CITATION FORMAT (MANDATORY):
- Use EXACTLY: {{citation:FileName|Location|Quote}}
- FileName: Exact file name
- Location: "Page X" for PDF OR "Sheet: Name, Row X" for Excel
- Quote: 3-10 words COPIED EXACTLY from document
- Place citations INLINE immediately after each specific fact or data point
- Multiple facts in one sentence = multiple inline citations

FORMATTING GUIDELINES:
- Start with section headers (### Header Name)
- Use nested bullet points for hierarchical information
- Combine related specifications into single comprehensive bullets
- Include context and explanations, not just raw data
- Use bold for emphasis on key terms or categories

CONTENT DEPTH:
- Provide rich, detailed explanations
- Group specifications by category or system
- Include all relevant details in each section
- Don't create sparse, single-line outputs
- Aim for comprehensive coverage with proper context

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