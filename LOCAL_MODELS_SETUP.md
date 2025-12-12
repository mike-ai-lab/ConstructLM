# Local Models Setup Guide for ConstructLM

## Overview

ConstructLM now supports **local AI models** via **Ollama** as a fallback when you reach quota limits on online APIs (Google Gemini, OpenAI, Groq). This allows you to continue working offline without interruption.

---

## Quick Start

### 1. Install Ollama

1. Download Ollama from: **https://ollama.ai**
2. Install and run the application
3. Ollama will start automatically and run on `http://localhost:11434`

### 2. Prepare Your Model Files

You have two model files:
- **`codellama-7b-instruct.Q4_K_M.gguf`** - The model weights (quantized)
- **`codellama.Modelfile`** - The model configuration

Place both files in a directory, e.g.:
```
F:\Automations\Models\
├── codellama-7b-instruct.Q4_K_M.gguf
└── codellama.Modelfile
```

### 3. Create the Model in Ollama

1. Open **Command Prompt** or **PowerShell**
2. Navigate to your models directory:
   ```bash
   cd F:\Automations\Models\
   ```
3. Create the model:
   ```bash
   ollama create codellama -f codellama.Modelfile
   ```
4. Wait for completion (may take a few minutes)

### 4. Verify Installation

Run this command to see all available models:
```bash
ollama list
```

You should see output like:
```
NAME                    ID              SIZE    MODIFIED
codellama:latest        abc123...       4.7GB   2 minutes ago
```

### 5. Test in ConstructLM

1. Open ConstructLM
2. Click the **Settings** icon (gear icon)
3. Look for **"Local Models"** section
4. Click **"Test Connection"**
5. If successful, you'll see: ✅ **"Ollama Connected"**

---

## Using Local Models

### Automatic Fallback

When you reach quota limits on online models:
1. The system detects the quota error
2. It automatically suggests switching to local models
3. You can accept and continue working

### Manual Selection

1. Open the **Model Selector** dropdown (top of chat)
2. Look for **"Code Llama 7B (Local)"**
3. Select it to use the local model
4. Start chatting - no API key needed!

---

## Model Details

### Code Llama 7B (Quantized)

- **Size**: ~4.7 GB (Q4_K_M quantization)
- **Context Window**: 4,096 tokens
- **Speed**: Slower than cloud models (depends on your CPU)
- **Offline**: ✅ Works completely offline
- **Cost**: ✅ Free (no API charges)
- **Best For**: Code analysis, construction specifications, technical documents

### Performance Tips

1. **Close other applications** to free up RAM
2. **First response is slower** (model loading) - subsequent responses are faster
3. **Smaller files work better** - local models have smaller context windows
4. **Be patient** - local inference takes time (30-60 seconds typical)

---

## Troubleshooting

### ❌ "Connection refused" or "Ollama not running"

**Solution:**
1. Make sure Ollama is installed
2. Start Ollama: Run the Ollama application or execute `ollama serve` in terminal
3. Wait 5 seconds for it to start
4. Try the connection test again

### ❌ "Model not found"

**Solution:**
1. Verify the model was created: `ollama list`
2. If not listed, re-run: `ollama create codellama -f codellama.Modelfile`
3. Make sure you're in the correct directory with the Modelfile

### ❌ "Out of memory" or very slow responses

**Solution:**
1. Close other applications to free RAM
2. Use smaller files (split large documents)
3. Reduce context window in settings if available
4. Consider upgrading RAM if consistently slow

### ❌ Model takes too long to respond

**Solution:**
1. This is normal for local models - they're slower than cloud APIs
2. First response takes longer (model loading)
3. Subsequent responses are faster
4. Consider using cloud models for time-sensitive work

---

## Advanced Configuration

### Using Different Models

You can add other models to Ollama:

1. **Llama 2 7B** (faster, smaller):
   ```bash
   ollama pull llama2:7b
   ```

2. **Mistral 7B** (better reasoning):
   ```bash
   ollama pull mistral:7b
   ```

3. **Neural Chat** (optimized for chat):
   ```bash
   ollama pull neural-chat:7b
   ```

Then add them to ConstructLM's local models registry in `services/localModelService.ts`.

### Changing Ollama Port

If port 11434 is in use, you can change it:

```bash
OLLAMA_HOST=127.0.0.1:11435 ollama serve
```

Then update `OLLAMA_BASE_URL` in `services/localModelService.ts`:
```typescript
const OLLAMA_BASE_URL = 'http://localhost:11435';
```

---

## System Requirements

- **RAM**: Minimum 8GB (16GB recommended)
- **Disk Space**: ~5GB for the model
- **CPU**: Modern multi-core processor
- **OS**: Windows, macOS, or Linux

---

## File Locations

### Your Model Files
```
F:\Automations\Models\
├── codellama-7b-instruct.Q4_K_M.gguf
└── codellama.Modelfile
```

### ConstructLM Local Model Service
```
c:\Users\Administrator\ConstructLM-1\services\
├── localModelService.ts (handles Ollama communication)
└── modelRegistry.ts (registers local models)
```

### Ollama Installation
- **Windows**: `C:\Users\[YourUsername]\AppData\Local\Programs\Ollama\`
- **macOS**: `/Applications/Ollama.app`
- **Linux**: `/usr/bin/ollama`

---

## Workflow Example

### Scenario: You hit Google Gemini quota

1. **Error appears**: "Quota exceeded for Gemini API"
2. **System suggests**: "Switch to local model?"
3. **You accept**: Click "Use Local Model"
4. **Model switches**: Automatically selects "Code Llama 7B (Local)"
5. **Continue working**: No interruption, no API charges

---

## FAQ

**Q: Can I use multiple local models?**
A: Yes! Add more models to `LOCAL_MODELS` array in `localModelService.ts`

**Q: Will local models work offline?**
A: Yes, completely offline once Ollama is running

**Q: Can I switch between cloud and local models?**
A: Yes, use the model selector dropdown anytime

**Q: Do local models support images?**
A: Not yet - local models are text-only for now

**Q: How do I uninstall a model?**
A: Run `ollama rm codellama` to remove it

**Q: Can I use GPU acceleration?**
A: Yes! Ollama supports NVIDIA CUDA and AMD ROCm. Install the appropriate drivers.

---

## Support

For issues with:
- **Ollama**: Visit https://github.com/ollama/ollama/issues
- **ConstructLM**: Check the local model service logs in browser console (F12)
- **Model files**: Verify the Modelfile syntax and GGUF file integrity

---

## Next Steps

1. ✅ Install Ollama
2. ✅ Place model files in `F:\Automations\Models\`
3. ✅ Run `ollama create codellama -f codellama.Modelfile`
4. ✅ Test connection in ConstructLM Settings
5. ✅ Start using local models as fallback!

Happy analyzing! 🚀
