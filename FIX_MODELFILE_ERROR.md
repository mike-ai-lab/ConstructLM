# Fix: "invalid model name" Error

## Problem

```
F:\Automations\Models>ollama create codellama -f codellama.Modelfile
gathering model components
Error: invalid model name
```

## Root Cause

Your `codellama.Modelfile` has incorrect content:

```
FROM C:/Users/mshke/Documents/Automations/Models/codellama
7b-instruct.Q4_K_M.gguf
```

**Issues:**
1. ❌ Wrong path (points to different user's directory)
2. ❌ Filename split across two lines
3. ❌ Uses absolute path instead of relative path
4. ❌ Uses forward slashes in wrong context

## Solution

### Step 1: Delete the Old Modelfile

```bash
cd /d F:\Automations\Models\
del codellama.Modelfile
```

### Step 2: Create New Modelfile

Open Notepad and create a new file with this exact content:

```
FROM ./codellama-7b-instruct.Q4_K_M.gguf

PARAMETER temperature 0.2
PARAMETER top_p 0.9
PARAMETER top_k 40

TEMPLATE """[INST] {{ .Prompt }} [/INST]"""

SYSTEM """You are a helpful AI assistant specialized in construction analysis and code review."""
```

**Important:**
- Line 1: `FROM ./codellama-7b-instruct.Q4_K_M.gguf` (all on ONE line)
- Use `./` (dot slash) for relative path
- No absolute paths
- No line breaks in the filename

### Step 3: Save the File

1. Open Notepad
2. Paste the content above
3. Click **File → Save As**
4. Navigate to: `F:\Automations\Models\`
5. Filename: `codellama.Modelfile` (no .txt extension!)
6. File type: **All Files (*.*)**
7. Click **Save**

### Step 4: Verify the File

```bash
cd /d F:\Automations\Models\
type codellama.Modelfile
```

Should show:
```
FROM ./codellama-7b-instruct.Q4_K_M.gguf

PARAMETER temperature 0.2
PARAMETER top_p 0.9
PARAMETER top_k 40

TEMPLATE """[INST] {{ .Prompt }} [/INST]"""

SYSTEM """You are a helpful AI assistant specialized in construction analysis and code review."""
```

### Step 5: Create the Model

```bash
cd /d F:\Automations\Models\
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

---

## Detailed Instructions (Step-by-Step)

### Using Notepad

1. **Open Notepad**
   - Press `Win + R`
   - Type `notepad`
   - Press Enter

2. **Copy the correct content**
   ```
FROM ./codellama-7b-instruct.Q4_K_M.gguf

PARAMETER temperature 0.2
PARAMETER top_p 0.9
PARAMETER top_k 40

TEMPLATE """[INST] {{ .Prompt }} [/INST]"""

SYSTEM """You are a helpful AI assistant specialized in construction analysis and code review."""
   ```

3. **Paste into Notepad**
   - Right-click → Paste
   - Or Ctrl+V

4. **Save the file**
   - Click **File** → **Save As**
   - Location: `F:\Automations\Models\`
   - Filename: `codellama.Modelfile`
   - File type: **All Files (*.*)**
   - Click **Save**

### Using Command Line

```bash
cd /d F:\Automations\Models\

REM Delete old file
del codellama.Modelfile

REM Create new file with correct content
(
echo FROM ./codellama-7b-instruct.Q4_K_M.gguf
echo.
echo PARAMETER temperature 0.2
echo PARAMETER top_p 0.9
echo PARAMETER top_k 40
echo.
echo TEMPLATE """[INST] {{ .Prompt }} [/INST]"""
echo.
echo SYSTEM """You are a helpful AI assistant specialized in construction analysis and code review."""
) > codellama.Modelfile

REM Verify
type codellama.Modelfile
```

---

## Common Mistakes to Avoid

### ❌ Wrong: Absolute Path
```
FROM C:/Users/mshke/Documents/Automations/Models/codellama-7b-instruct.Q4_K_M.gguf
```

### ✅ Correct: Relative Path
```
FROM ./codellama-7b-instruct.Q4_K_M.gguf
```

### ❌ Wrong: Filename Split Across Lines
```
FROM ./codellama
-7b-instruct.Q4_K_M.gguf
```

### ✅ Correct: Filename on One Line
```
FROM ./codellama-7b-instruct.Q4_K_M.gguf
```

### ❌ Wrong: Saved as .txt
```
codellama.Modelfile.txt
```

### ✅ Correct: No Extension
```
codellama.Modelfile
```

### ❌ Wrong: Backslashes
```
FROM .\codellama-7b-instruct.Q4_K_M.gguf
```

### ✅ Correct: Forward Slashes
```
FROM ./codellama-7b-instruct.Q4_K_M.gguf
```

---

## Verification Checklist

- [ ] File is named `codellama.Modelfile` (no .txt)
- [ ] File is in `F:\Automations\Models\`
- [ ] First line is: `FROM ./codellama-7b-instruct.Q4_K_M.gguf`
- [ ] Filename is on ONE line (not split)
- [ ] Uses `./` (relative path)
- [ ] No absolute paths
- [ ] File has no extra blank lines at start

---

## After Fixing

```bash
cd /d F:\Automations\Models\
ollama create codellama -f codellama.Modelfile
```

Should now show:
```
gathering model components
parsing modelfile
creating model layer
creating config layer
writing manifest
success
```

---

## If Still Getting Error

### Check file content
```bash
type codellama.Modelfile
```

### Check file exists
```bash
dir codellama.Modelfile
```

### Check GGUF file exists
```bash
dir codellama-7b-instruct.Q4_K_M.gguf
```

### Try with full path
```bash
ollama create codellama -f F:\Automations\Models\codellama.Modelfile
```

### Check Ollama version
```bash
ollama --version
```

---

## Summary

**The Problem:** Modelfile had wrong path and broken formatting

**The Solution:** Create new Modelfile with:
```
FROM ./codellama-7b-instruct.Q4_K_M.gguf
```

**Key Points:**
- Use `./` for relative path
- Keep filename on ONE line
- Save as `codellama.Modelfile` (no .txt)
- File must be in `F:\Automations\Models\`

You're almost there! Just fix the Modelfile and try again. 🚀
