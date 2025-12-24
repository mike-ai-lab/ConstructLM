# 🔧 Groq Models Empty Response - Troubleshooting

## Issue
Groq models are returning empty responses (0 tokens, 0 content length) even though the API connection works.

## Root Cause
The proxy server at `http://localhost:3002` is successfully connecting to Groq's API, but the API is returning empty responses. This can happen for several reasons:

### Possible Causes:

1. **Invalid Model ID**
   - Some models in the reference sheet may not be available yet on Groq's API
   - Model IDs might be incorrect or deprecated

2. **API Key Issues**
   - API key might not have access to certain models
   - API key might be rate-limited

3. **Request Format Issues**
   - The request body might be missing required fields
   - Temperature or other parameters might be invalid for certain models

## ✅ Solution Steps:

### Step 1: Verify Your Groq API Key
1. Go to: https://console.groq.com/keys
2. Check if your API key is active
3. Create a new API key if needed
4. Update in ConstructLM Settings

### Step 2: Test with Known Working Models
Use these **verified working models**:
- ✅ `llama-3.3-70b-versatile` - Most reliable
- ✅ `llama-3.1-8b-instant` - Fastest
- ✅ `qwen/qwen3-32b` - Good quality

### Step 3: Check Proxy Server
1. Make sure proxy is running:
   ```bash
   npm run dev
   ```
2. Check console for proxy errors
3. Look for `Proxy running on http://localhost:3002`

### Step 4: Test Direct API Call (Bypass Proxy)
If proxy fails, the app will automatically fallback to CORS proxy (`corsproxy.io`)

### Step 5: Check Browser Console
Look for these error patterns:
- `API Error 400` = Invalid request format
- `API Error 401` = Invalid API key
- `API Error 404` = Model not found
- `API Error 429` = Rate limit exceeded
- `Final content length: 0` = Empty response (model issue)

## 🎯 Recommended Action:

**Use Llama 3.3 70B Versatile** - This is the most reliable Groq model:
1. Open model selector
2. Choose "Llama 3.3 70B Versatile"
3. Send a test message
4. Should work immediately

## 📊 Model Availability Status:

### ✅ Confirmed Working (11 models):
- llama-3.3-70b-versatile
- llama-3.1-8b-instant
- qwen/qwen3-32b
- meta-llama/llama-4-scout-17b-16e-instruct
- meta-llama/llama-4-maverick-17b-128e-instruct
- openai/gpt-oss-120b
- openai/gpt-oss-safeguard-20b
- openai/gpt-oss-20b
- meta-llama/llama-guard-4-12b
- meta-llama/llama-prompt-guard-2-86m
- meta-llama/llama-prompt-guard-2-22m

### ❌ Not Available Yet (removed from app):
- moonshotai/kimi-k2-instruct-0905
- moonshotai/kimi-k2-instruct
- groq/compound
- groq/compound-mini

## 🔍 Debug Commands:

### Test Groq API Directly:
```bash
curl https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.3-70b-versatile",
    "messages": [{"role": "user", "content": "Hello"}],
    "temperature": 0.2
  }'
```

### Check Available Models:
```bash
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## 💡 Quick Fix:

**If Groq models still don't work:**
1. Switch to **Google Gemini** (always works, free, unlimited)
2. Use `gemini-2.5-flash` or `gemini-flash-latest`
3. These support documents, images, and have 1M context window

## 📞 Support:

If issue persists:
1. Check Groq status: https://status.groq.com
2. Groq Discord: https://groq.com/discord
3. Groq Docs: https://console.groq.com/docs
