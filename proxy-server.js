import express from 'express';
import cors from 'cors';
import https from 'https';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

/**
 * Ollama Cloud Proxy Endpoint
 * POST /api/ollama-proxy
 * Forwards requests to Ollama Cloud API, bypassing CORS
 */
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
      messages,
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
        
        // Collect error response body
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

      // Handle streaming response
      if (stream !== false) {
        res.setHeader('Content-Type', 'application/x-ndjson');
        res.setHeader('Transfer-Encoding', 'chunked');
        proxyRes.pipe(res);
      } else {
        // Non-streaming response
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

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ollama-proxy' });
});

app.listen(PORT, () => {
  console.log(`✅ Ollama Cloud Proxy running on http://localhost:${PORT}`);
  console.log(`📍 Endpoint: POST http://localhost:${PORT}/api/ollama-proxy`);
});
