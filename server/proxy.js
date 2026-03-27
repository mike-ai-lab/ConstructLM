import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import https from 'https';

const app = express();
app.use(cors());
app.use(express.json());

// Store cookies per URL to maintain session persistence
const cookieJars = new Map();

// Health check endpoints
app.head('/api/proxy/groq', (req, res) => res.status(200).end());
app.head('/api/proxy/openai', (req, res) => res.status(200).end());
app.head('/api/proxy/web', (req, res) => res.status(200).end());
app.head('/api/ollama-proxy', (req, res) => res.status(200).end());
app.get('/', (req, res) => res.json({ status: 'Proxy server running' }));

// Ollama Cloud Proxy Endpoint
app.post('/api/ollama-proxy', async (req, res) => {
  try {
    const { model, messages, stream, temperature, apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'Missing Ollama Cloud API key' });
    }

    if (!model || !messages) {
      return res.status(400).json({ error: 'Missing model or messages' });
    }

    console.log(`[OLLAMA-PROXY] Forwarding request to Ollama Cloud for model: ${model}`);

    const requestBody = JSON.stringify({
      model,
      messages: messages.map(m => ({
        role: m.role === 'system' ? 'system' : m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      })),
      stream: stream !== false,
      temperature: temperature || 0.7
    });

    const options = {
      hostname: 'ollama.com',
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
        'Authorization': `Bearer ${apiKey}`
      }
    };

    const proxyReq = https.request(options, (proxyRes) => {
      if (proxyRes.statusCode !== 200) {
        console.error(`[OLLAMA-PROXY] Error from Ollama Cloud:`, proxyRes.statusCode);
        
        let errorBody = '';
        proxyRes.on('data', (chunk) => {
          errorBody += chunk;
        });
        
        proxyRes.on('end', () => {
          console.error(`[OLLAMA-PROXY] Error details:`, errorBody);
          res.status(proxyRes.statusCode).json({
            error: `Ollama Cloud API error: ${proxyRes.statusMessage}`,
            statusCode: proxyRes.statusCode,
            details: errorBody
          });
        });
        return;
      }

      if (stream !== false) {
        res.setHeader('Content-Type', 'application/x-ndjson');
        res.setHeader('Transfer-Encoding', 'chunked');
        proxyRes.pipe(res);
      } else {
        let data = '';
        proxyRes.on('data', (chunk) => {
          data += chunk;
        });
        proxyRes.on('end', () => {
          try {
            res.json(JSON.parse(data));
          } catch (e) {
            res.json({ raw: data });
          }
        });
      }
    });

    proxyReq.on('error', (error) => {
      console.error(`[OLLAMA-PROXY] Proxy error:`, error.message);
      res.status(500).json({
        error: 'Proxy error',
        details: error.message
      });
    });

    proxyReq.write(requestBody);
    proxyReq.end();
  } catch (error) {
    console.error(`[OLLAMA-PROXY] Proxy error:`, error.message);
    res.status(500).json({
      error: 'Proxy error',
      details: error.message
    });
  }
});

app.post('/api/proxy/groq', async (req, res) => {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Groq Proxy] API Error:', response.status, errorData);
      return res.status(response.status).json(errorData);
    }
    
    if (req.body.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      response.body.pipe(res);
    } else {
      const data = await response.json();
      res.status(response.status).json(data);
    }
  } catch (error) {
    console.error('[Groq Proxy] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/proxy/openai', async (req, res) => {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    
    if (req.body.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      response.body.pipe(res);
    } else {
      const data = await response.json();
      res.status(response.status).json(data);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Web proxy endpoint with cookie persistence
app.get('/api/proxy/web', async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl) {
      return res.status(400).json({ error: 'URL parameter required' });
    }

    const urlObj = new URL(targetUrl);
    const domain = urlObj.hostname;
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
    
    // Get or create cookie jar for this domain
    if (!cookieJars.has(domain)) {
      cookieJars.set(domain, []);
    }
    const cookies = cookieJars.get(domain);
    
    // Build cookie header
    const cookieHeader = cookies.length > 0 ? cookies.join('; ') : '';
    
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };
    
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
      redirect: 'follow'
    });

    // Extract and store Set-Cookie headers
    const setCookieHeaders = response.headers.raw()['set-cookie'] || [];
    setCookieHeaders.forEach(cookie => {
      const cookieName = cookie.split('=')[0];
      const existingIndex = cookies.findIndex(c => c.startsWith(cookieName + '='));
      if (existingIndex >= 0) {
        cookies[existingIndex] = cookie.split(';')[0];
      } else {
        cookies.push(cookie.split(';')[0]);
      }
    });

    let html = await response.text();
    
    // Rewrite relative URLs to go through proxy
    // This ensures CSS, JS, images, etc. are also proxied
    const proxyUrl = (url) => `http://localhost:3002/api/proxy/web?url=${encodeURIComponent(url)}`;
    
    // Count replacements for debugging
    let replacementCount = 0;
    
    html = html
      // Rewrite href="/path" or href='/path'
      .replace(/href\s*=\s*["']\/([^"']*?)["']/gi, (match, path) => {
        replacementCount++;
        const fullUrl = baseUrl + '/' + path;
        console.log(`[Proxy] Rewriting href: /${path} -> ${fullUrl}`);
        return `href="${proxyUrl(fullUrl)}"`;
      })
      // Rewrite src="/path" or src='/path'
      .replace(/src\s*=\s*["']\/([^"']*?)["']/gi, (match, path) => {
        replacementCount++;
        const fullUrl = baseUrl + '/' + path;
        console.log(`[Proxy] Rewriting src: /${path} -> ${fullUrl}`);
        return `src="${proxyUrl(fullUrl)}"`;
      })
      // Rewrite data-src="/path" (lazy loading)
      .replace(/data-src\s*=\s*["']\/([^"']*?)["']/gi, (match, path) => {
        replacementCount++;
        const fullUrl = baseUrl + '/' + path;
        console.log(`[Proxy] Rewriting data-src: /${path} -> ${fullUrl}`);
        return `data-src="${proxyUrl(fullUrl)}"`;
      })
      // Rewrite srcset="/path" (responsive images)
      .replace(/srcset\s*=\s*["']\/([^"']*?)["']/gi, (match, path) => {
        replacementCount++;
        const fullUrl = baseUrl + '/' + path;
        console.log(`[Proxy] Rewriting srcset: /${path} -> ${fullUrl}`);
        return `srcset="${proxyUrl(fullUrl)}"`;
      })
      // Rewrite @import url("/path") in style tags
      .replace(/@import\s+url\s*\(\s*["']\/([^"']*?)["']\s*\)/gi, (match, path) => {
        replacementCount++;
        const fullUrl = baseUrl + '/' + path;
        console.log(`[Proxy] Rewriting @import: /${path} -> ${fullUrl}`);
        return `@import url("${proxyUrl(fullUrl)}")`;
      })
      // Rewrite background: url("/path") in style attributes
      .replace(/url\s*\(\s*["']?\/([^"')]*?)["']?\s*\)/gi, (match, path) => {
        replacementCount++;
        const fullUrl = baseUrl + '/' + path;
        console.log(`[Proxy] Rewriting url(): /${path} -> ${fullUrl}`);
        return `url("${proxyUrl(fullUrl)}")`;
      });
    
    console.log(`[Proxy] Total URL replacements: ${replacementCount} for ${targetUrl}`);
    
    // Set CORS headers to allow iframe access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Detect content type from response
    const contentType = response.headers.get('content-type') || 'text/html; charset=utf-8';
    res.setHeader('Content-Type', contentType);
    
    res.send(html);
  } catch (error) {
    console.error('[Web Proxy] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`✅ Proxy Server running on http://localhost:${PORT}`);
  console.log(`📍 Groq Proxy: POST http://localhost:${PORT}/api/proxy/groq`);
  console.log(`📍 OpenAI Proxy: POST http://localhost:${PORT}/api/proxy/openai`);
  console.log(`📍 Web Proxy: GET http://localhost:${PORT}/api/proxy/web`);
  console.log(`📍 Ollama Cloud Proxy: POST http://localhost:${PORT}/api/ollama-proxy`);
});
