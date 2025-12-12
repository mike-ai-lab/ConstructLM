# Ollama Setup Guide - Fix for Model Creation Error

## Problem

```
C:\Users\Administrator> ollama create codellama -f codellama.Modelfile
gathering model components
Error: no Modelfile or safetensors files found
```

## Root Cause

You're running the command from `C:\Users\Administrator>` but the model files are in `F:\Automations\Models\`. Ollama can't find the files because it's looking in the wrong directory.

---

## Solution

### Step 1: Navigate to the Correct Directory

Open Command Prompt and run:

```bash
cd /d F:\Automations\Models\
```

**Explanation:**
- `cd` = change directory
- `/d` = allows changing drives (C: to F:)
- `F:\Automations\Models\` = your model directory

### Step 2: Verify Files Are There

```bash
dir
```

You should see:
```
 Volume in drive F is [YourDrive]
 Directory of F:\Automations\Models

12/15/2024  10:30 AM    <DIR>          .
12/15/2024  10:30 AM    <DIR>          ..
12/15/2024  10:25 AM         4,915,200 codellama-7b-instruct.Q4_K_M.gguf
12/15/2024  10:26 AM             1,024 codellama.Modelfile
```

### Step 3: Create the Model

```bash
ollama create codellama -f codellama.Modelfile
```

Expected output:
```
gathering model components
parsing modelfile
creating model layer
creating config layer
writing manifest
success
```

### Step 4: Verify Installation

```bash
ollama list
```

You should see:
```
NAME                    ID              SIZE    MODIFIED
codellama:latest        abc123...       4.7GB   2 minutes ago
```

---

## Complete Command Sequence

Copy and paste this entire sequence:

```bash
cd /d F:\Automations\Models\
dir
ollama create codellama -f codellama.Modelfile
ollama list
```

---

## Troubleshooting

### Error: "The system cannot find the path specified"

**Problem:** Drive F: doesn't exist or path is wrong

**Solution:**
1. Check if F: drive exists: `F:`
2. List contents: `dir F:\`
3. Verify path: `dir F:\Automations\`
4. Verify models: `dir F:\Automations\Models\`

### Error: "Modelfile not found"

**Problem:** File is in wrong location or has wrong name

**Solution:**
1. Check exact filename: `dir *.Modelfile`
2. Check GGUF file: `dir *.gguf`
3. Verify case sensitivity (Windows is case-insensitive, but check anyway)

### Error: "GGUF file not found"

**Problem:** The Modelfile references a file that doesn't exist

**Solution:**
1. Open Modelfile: `type codellama.Modelfile`
2. Check the filename it references
3. Verify that file exists: `dir codellama-7b-instruct.Q4_K_M.gguf`
4. Update Modelfile if filename is different

### Ollama Not Running

**Problem:** "Cannot connect to Ollama"

**Solution:**
1. Start Ollama: Open the Ollama application
2. Or run: `ollama serve`
3. Wait 5 seconds for it to start
4. Try command again

---

## Modelfile Content Reference

Your `codellama.Modelfile` should look like:

```modelfile
FROM ./codellama-7b-instruct.Q4_K_M.gguf

PARAMETER temperature 0.2
PARAMETER top_p 0.9
PARAMETER top_k 40

TEMPLATE """[INST] {{ .Prompt }} [/INST]"""

SYSTEM """You are a helpful AI assistant specialized in construction and code analysis."""
```

**Key Points:**
- `FROM ./codellama-7b-instruct.Q4_K_M.gguf` - Must match your GGUF filename exactly
- `./` - Means "current directory" (where Modelfile is)
- Must be in same directory as GGUF file

---

## Step-by-Step Visual Guide

```
Your Computer
│
├─ C: Drive
│  └─ Users
│     └─ Administrator
│        └─ ConstructLM-1  ← You are here
│
└─ F: Drive  ← You need to go here
   └─ Automations
      └─ Models  ← Your model files are here
         ├─ codellama.Modelfile
         └─ codellama-7b-instruct.Q4_K_M.gguf
```

**Command to navigate:**
```bash
cd /d F:\Automations\Models\
```

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `cd /d F:\Automations\Models\` | Navigate to model directory |
| `dir` | List files in current directory |
| `type codellama.Modelfile` | View Modelfile contents |
| `ollama create codellama -f codellama.Modelfile` | Create the model |
| `ollama list` | List all Ollama models |
| `ollama serve` | Start Ollama service |

---

## After Successful Creation

Once you see "success", test in ConstructLM:

1. Open ConstructLM
2. Click Settings (gear icon)
3. Scroll to "Local Models (Ollama)"
4. Click "Test Connection"
5. Should show: ✅ **Ollama Connected**
6. Should list: **codellama:latest**

---

## Common Issues Summary

| Issue | Solution |
|-------|----------|
| "no Modelfile or safetensors files found" | Navigate to correct directory with `cd /d F:\Automations\Models\` |
| "The system cannot find the path specified" | Verify F: drive exists and path is correct |
| "Modelfile not found" | Check filename spelling and location |
| "GGUF file not found" | Verify GGUF filename matches Modelfile reference |
| "Cannot connect to Ollama" | Start Ollama application or run `ollama serve` |

---

## Next Steps

1. ✅ Navigate to F:\Automations\Models\
2. ✅ Run: `ollama create codellama -f codellama.Modelfile`
3. ✅ Wait for "success" message
4. ✅ Verify: `ollama list`
5. ✅ Test in ConstructLM Settings

You're almost there! Just navigate to the right directory and run the command again.
