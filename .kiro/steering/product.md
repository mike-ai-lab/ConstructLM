# Product Overview

ConstructLM is a production-grade RAG (Retrieval-Augmented Generation) desktop and web application for AI-powered document analysis and multi-model chat.

## Core Value Proposition

- **Privacy-First RAG**: 100% local embeddings using Transformers.js (Xenova/all-MiniLM-L6-v2) - documents never leave the user's machine
- **Zero Embedding Cost**: Browser-based embeddings via WebAssembly, no API calls for RAG
- **Multi-Model Support**: 26+ models across 5 providers (Gemini, Groq, Cerebras, OpenAI, AWS Bedrock)
- **Desktop & Web**: Full Electron app or browser deployment

## Key Features

- Advanced document processing (PDF, Excel, CSV, DOCX, Markdown, code files)
- Semantic search with inline citations and source linking
- Multi-chat management with context-aware conversations
- Mind map generation, notebook, todo list, reminders
- GitHub integration for code analysis
- Web viewer with tabbed browsing
- Voice input and activity logging

## Target Users

Researchers, developers, and knowledge workers who need powerful document analysis with privacy and cost-efficiency.

## Technical Approach

- Client-side only architecture (no backend except CORS proxy)
- IndexedDB for persistent storage
- Local embeddings for semantic search
- Streaming responses from multiple LLM providers
- Electron for desktop, Vite for web builds
