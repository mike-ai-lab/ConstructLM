import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

// Store cookies per URL to maintain session persistence
const cookieJars = new Map();

// Health check endpoints
app.head('/api/proxy/groq', (req, res) => res.status(200).end());
app.head('/api/proxy/openai', (req, res) => res.status(200).end());
app.head('/api/proxy/web', (req, res) => res.status(200).end());
app.get('/', (req, res) => res.json({ status: 'Proxy server running' }));

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
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      res.end();
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
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      res.end();
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

    const html = await response.text();
    
    // Set CORS headers to allow iframe access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('[Web Proxy] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3002;
app.listen(PORT, () => console.log(`Proxy running on http://localhost:${PORT}`));
