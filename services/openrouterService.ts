/**
 * OpenRouter API Service
 * Provides access to 15+ verified free models through a single API key
 */

export async function* streamOpenRouter(
  modelId: string,
  apiKey: string,
  messages: Array<{ role: string; content: string | any }>,
  onStream: (chunk: string, thinking?: string) => void
): AsyncGenerator<void, { inputTokens?: number; outputTokens?: number; totalTokens?: number }, unknown> {
  
  const requestBody = {
    model: modelId,
    messages: messages,
    stream: true,
    temperature: 0.7,
    top_p: 0.95,
    max_tokens: 8192
  };

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'ConstructLM',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || response.statusText;
      
      if (response.status === 401) {
        throw new Error('Invalid OpenRouter API key. Please check your key in Settings.');
      }
      
      if (response.status === 429) {
        throw new Error('OpenRouter rate limit reached. Please try again later or switch to another model.');
      }
      
      throw new Error(`OpenRouter API error ${response.status}: ${errorMsg}`);
    }

    if (!response.body) {
      throw new Error('No response body from OpenRouter');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let thinkingBuffer = '';
    let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const dataStr = trimmed.slice(6);
          if (dataStr === '[DONE]') continue;
          
          try {
            const json = JSON.parse(dataStr);
            const content = json.choices?.[0]?.delta?.content;
            const thinking = json.choices?.[0]?.delta?.reasoning_content;
            
            if (thinking) {
              thinkingBuffer += thinking;
              onStream('', thinkingBuffer);
            } else if (content) {
              onStream(content, thinkingBuffer || undefined);
            }
            
            // Capture usage stats if available
            if (json.usage) {
              usage.inputTokens = json.usage.prompt_tokens || 0;
              usage.outputTokens = json.usage.completion_tokens || 0;
              usage.totalTokens = json.usage.total_tokens || 0;
            }
          } catch (e) {
            // Ignore parse errors for malformed chunks
            console.warn('[OpenRouter] Failed to parse chunk:', e);
          }
        }
      }
    }

    return usage;
    
  } catch (error: any) {
    console.error('[OpenRouter] Error:', error);
    
    if (error.message?.includes('Failed to fetch')) {
      throw new Error('Cannot reach OpenRouter API. Check your internet connection.');
    }
    
    throw error;
  }
}
