// Add this to your Electron main process or use a CORS proxy

const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://cors-anywhere.herokuapp.com/'
];

let proxyIndex = 0;

export function getNextProxy(): string {
  const proxy = CORS_PROXIES[proxyIndex];
  proxyIndex = (proxyIndex + 1) % CORS_PROXIES.length;
  return proxy;
}

// Use this in geminiService.ts
export async function sendMessageToGeminiViaProxy(
  modelId: string,
  apiKey: string,
  message: string,
  onStream: (chunk: string) => void
): Promise<void> {
  const proxy = getNextProxy();
  const url = `${proxy}${encodeURIComponent(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${apiKey}&alt=sse`)}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: message }] }]
    })
  });

  if (!response.ok) throw new Error(`Proxy Error: ${response.statusText}`);
  
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const json = JSON.parse(line.slice(6));
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) onStream(text);
        } catch (e) {}
      }
    }
  }
}
