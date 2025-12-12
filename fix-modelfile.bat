@echo off
REM Fix Modelfile Script
REM This script creates the correct Modelfile for Code Llama

echo.
echo ========================================
echo Fixing Modelfile
echo ========================================
echo.

REM Navigate to models directory
cd /d F:\Automations\Models\

echo Current directory: %cd%
echo.

REM Check if GGUF file exists
if not exist "codellama-7b-instruct.Q4_K_M.gguf" (
    echo ERROR: GGUF file not found!
    echo Expected: F:\Automations\Models\codellama-7b-instruct.Q4_K_M.gguf
    echo.
    pause
    exit /b 1
)

echo GGUF file found: codellama-7b-instruct.Q4_K_M.gguf
echo.

REM Delete old Modelfile
if exist "codellama.Modelfile" (
    echo Deleting old Modelfile...
    del codellama.Modelfile
    echo Done.
    echo.
)

REM Create new Modelfile with correct content
echo Creating new Modelfile...
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

echo Done.
echo.

REM Verify the file was created
if not exist "codellama.Modelfile" (
    echo ERROR: Failed to create Modelfile!
    echo.
    pause
    exit /b 1
)

echo Modelfile created successfully!
echo.
echo Content:
echo ========================================
type codellama.Modelfile
echo ========================================
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

echo Ollama is running.
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
pause
