import { ProcessedFile } from '../types';
import { getModel, getApiKeyForModel } from './modelRegistry';

interface MindMapNode {
  name: string;
  color?: string;
  children?: MindMapNode[];
}

const SYSTEM_PROMPT = `You are a data structuring assistant. Extract hierarchical information from the provided document and convert it into a mind map structure.

RULES:
1. Return ONLY valid JSON, no markdown, no explanations
2. Use this exact structure: {"name": "Root", "color": "#2c3e50", "children": [...]}
3. Maximum 4 levels deep
4. Use colors: #3498db (blue), #e74c3c (red), #f39c12 (orange), #9b59b6 (purple), #27ae60 (green)
5. Keep names concise (max 60 chars)
6. For BOQ/construction docs: organize by categories → types → items → specs
7. For general docs: organize by main topics → subtopics → details

EXAMPLE OUTPUT:
{
  "name": "Document Title",
  "color": "#2c3e50",
  "children": [
    {
      "name": "Category 1",
      "color": "#3498db",
      "children": [
        {"name": "Item A"},
        {"name": "Item B"}
      ]
    }
  ]
}`;

export const generateMindMapData = async (
  file: ProcessedFile,
  modelId: string
): Promise<MindMapNode> => {
  const model = getModel(modelId);
  const apiKey = getApiKeyForModel(model);

  if (!apiKey) {
    throw new Error(`API Key for ${model.name} is missing. Please add it in Settings.`);
  }

  // Truncate content if too large (keep first 15000 chars for efficiency)
  const content = file.content.length > 15000 
    ? file.content.substring(0, 15000) + '\n\n[Content truncated for efficiency]'
    : file.content;

  const userPrompt = `File: ${file.name}\nType: ${file.type}\n\nContent:\n${content}\n\nGenerate mind map JSON:`;

  try {
    if (model.provider === 'google') {
      return await generateWithGemini(apiKey, model.id, userPrompt);
    } else if (model.provider === 'openai' || model.provider === 'groq') {
      return await generateWithOpenAI(apiKey, model.id, userPrompt, model.provider);
    } else {
      throw new Error(`Provider ${model.provider} not supported for mind maps`);
    }
  } catch (error: any) {
    console.error('[MindMap] Generation error:', error);
    const msg = error.message || '';
    
    if (msg.includes('quota') || msg.includes('Quota')) {
      throw new Error('API quota exceeded. Try: 1) Wait a minute, 2) Use Groq model (free), or 3) Check billing');
    }
    if (msg.includes('not found') || msg.includes('404')) {
      throw new Error('Model not available. Try: Gemini 1.5 Flash or any Groq model');
    }
    if (msg.includes('401') || msg.includes('key')) {
      throw new Error('Invalid API key. Check Settings');
    }
    
    throw new Error(`Failed: ${msg.substring(0, 100)}`);
  }
};

const generateWithGemini = async (apiKey: string, modelId: string, userPrompt: string): Promise<MindMapNode> => {
  const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent?key=${apiKey}`;
  const response = await fetch(apiUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
          { role: 'user', parts: [{ text: userPrompt }] }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API Error ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  return parseJsonResponse(text);
};

const generateWithOpenAI = async (
  apiKey: string,
  modelId: string,
  userPrompt: string,
  provider: 'openai' | 'groq'
): Promise<MindMapNode> => {
  const baseUrl = provider === 'groq' 
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 4096
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API Error ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '{}';
  return parseJsonResponse(text);
};

const parseJsonResponse = (text: string): MindMapNode => {
  // Remove markdown code blocks if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed.name) {
      throw new Error('Invalid structure: missing name field');
    }
    return parsed;
  } catch (error) {
    console.error('[MindMap] Parse error:', error, '\nText:', cleaned);
    // Return fallback structure
    return {
      name: 'Parse Error',
      color: '#e74c3c',
      children: [
        { name: 'Failed to parse AI response' },
        { name: 'Try a different model or file' }
      ]
    };
  }
};
