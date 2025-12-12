@echo off
REM Ollama Model Setup Script
REM This script creates the Code Llama model in Ollama

echo.
echo ========================================
echo Ollama Model Setup
echo ========================================
echo.

REM Navigate to the models directory
cd /d F:\Automations\Models\

REM Check if we're in the right directory
if not exist "codellama.Modelfile" (
    echo ERROR: codellama.Modelfile not found!
    echo.
    echo Make sure you have:
    echo   - F:\Automations\Models\codellama.Modelfile
    echo   - F:\Automations\Models\codellama-7b-instruct.Q4_K_M.gguf
    echo.
    pause
    exit /b 1
)

if not exist "codellama-7b-instruct.Q4_K_M.gguf" (
    echo ERROR: codellama-7b-instruct.Q4_K_M.gguf not found!
    echo.
    echo Make sure you have:
    echo   - F:\Automations\Models\codellama.Modelfile
    echo   - F:\Automations\Models\codellama-7b-instruct.Q4_K_M.gguf
    echo.
    pause
    exit /b 1
)

echo Current directory: %cd%
echo.
echo Files found:
dir /b *.Modelfile *.gguf
echo.

REM Check if Ollama is running
echo Checking if Ollama is running...
ollama list >nul 2>&1
if errorlevel 1 (
    echo.
    echo WARNING: Ollama doesn't appear to be running!
    echo Please start Ollama first:
    echo   1. Open the Ollama application
    echo   2. Or run: ollama serve
    echo.
    pause
    exit /b 1
)

echo Ollama is running. Proceeding...
echo.

REM Create the model
echo Creating Code Llama model...
echo.
ollama create codellama -f codellama.Modelfile

if errorlevel 1 (
    echo.
    echo ERROR: Failed to create model!
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS! Model created.
echo ========================================
echo.

REM Verify the model was created
echo Verifying model installation...
echo.
ollama list

echo.
echo You can now use Code Llama in ConstructLM!
echo.
echo Next steps:
echo   1. Open ConstructLM
echo   2. Click Settings (gear icon)
echo   3. Scroll to "Local Models (Ollama)"
echo   4. Click "Test Connection"
echo   5. You should see "codellama" listed
echo.
pause
