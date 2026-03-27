# ConstructLM - Frequently Asked Questions & Answers

## General Information

### Q: What is ConstructLM?
A: ConstructLM is a production-grade RAG (Retrieval-Augmented Generation) application with multi-model AI support, advanced document processing, and intelligent conversation management. It's designed for researchers, developers, and knowledge workers who need powerful document analysis with privacy and cost-efficiency.

### Q: What makes ConstructLM different from other AI applications?
A: ConstructLM stands out with four key differentiators:
1. **Privacy-First RAG**: Uses TRUE local embeddings with Transformers.js - documents never leave your machine
2. **Zero Embedding Cost**: Local browser-based embeddings mean no API calls for RAG functionality
3. **Multi-Model Support**: Seamlessly switch between 26+ models across 5 providers (Gemini, Groq, Cerebras, OpenAI, AWS Bedrock)
4. **Desktop & Web**: Available as both a full Electron desktop app and browser-based deployment

### Q: Is ConstructLM production-ready?
A: Yes, ConstructLM is production-grade and used in real applications with robust error handling and rate limiting built in.

---

## Features & Capabilities

### Q: What RAG (Retrieval-Augmented Generation) features does ConstructLM offer?
A: ConstructLM includes comprehensive RAG capabilities:
- TRUE local embeddings using Transformers.js (Xenova/all-MiniLM-L6-v2, 384-dimensional)
- Zero API costs for embeddings - 100% local processing
- Privacy-first approach with documents never leaving your machine
- IndexedDB-based vector store with semantic search
- Smart retrieval using cosine similarity with relevance scoring
- Auto-indexing of files when RAG is enabled
- Token-aware context management for optimal responses
- Inline citation system with direct links to source documents
- Intelligent text splitting (500 tokens with 10% overlap)
- Performance: 50-100ms per embedding after initial load
- First-time setup takes 5-10 seconds to download the 25MB model (cached in browser)

### Q: How many AI models does ConstructLM support?
A: ConstructLM supports 26+ models across 5 providers:
- **Google Gemini**: 5 models including Flash, Pro, and latest versions with 1M+ token context windows
- **Groq**: 11 models including Llama 3.3 70B, Llama 3.1 8B, Qwen 3 32B, and more ultra-fast models
- **Cerebras**: 4 models including Llama 3.3 70B, GPT OSS 120B, Qwen 3 235B with ultra-fast inference (900+ tok/s)
- **OpenAI**: GPT-4o and GPT-4o Mini (paid)
- **AWS Bedrock**: Claude 3.5 Sonnet, Claude 3 Haiku, Llama 3, Mistral Large
- **Local Models**: Support for running models locally via Ollama

### Q: What document formats does ConstructLM support?
A: ConstructLM supports multiple document formats:
- PDF (with advanced structured extraction and page numbers)
- TXT (plain text)
- CSV (comma-separated values)
- Excel (XLSX format)
- Markdown
- JSON
- XML
- HTML
- Code files

### Q: What are the main chat features?
A: ConstructLM offers several smart chat features:
- Multi-chat management to create, switch, and manage multiple conversation threads
- Context-aware responses that automatically manage context windows and token limits
- File mentions using `@filename` syntax to reference specific documents
- Web sources integration to add URLs as context
- Message controls including retry, regenerate, save to notes, and view alternatives
- Voice input with speech-to-text transcription

### Q: What visual and creative tools are available?
A: ConstructLM includes several creative tools:
- **Mind Map Generator**: AI-powered mind maps from documents and conversations
- **Drawing Tools**: Annotate and sketch directly on the interface
- **Snapshot System**: Capture and save conversation states with visual previews
- **Graphics Library**: Manage and reuse generated visualizations

### Q: What productivity features does ConstructLM have?
A: ConstructLM includes several productivity features:
- **Notebook**: Save important AI responses as organized notes
- **Todo List**: Advanced task management with subtasks, priorities, and progress tracking
- **Reminders**: Set time-based reminders with snooze functionality
- **Activity Logging**: Track usage patterns and model performance
- **Export Options**: Export notes, conversations, and data

### Q: Does ConstructLM have web integration features?
A: Yes, ConstructLM includes comprehensive web integration:
- **Tabbed Web Viewer**: Browse websites within the app with cookie persistence
- **GitHub Integration**: Browse and import code from any public GitHub repository with:
  - Repository browser with folder navigation
  - Multi-file selection and batch import
  - Branch switching and code search
  - Smart import of README and config files
  - AI-powered code analysis and documentation
- **CORS Proxy**: Automatic proxy rotation for accessing web content
- **Live Sessions**: Real-time collaborative features (Electron only)

### Q: What advanced capabilities does ConstructLM offer?
A: ConstructLM includes several advanced capabilities:
- Smart context management with automatic file selection based on relevance (keyword + semantic)
- Hybrid search combining keyword matching (30%) with semantic similarity (70%)
- Compression service to optimize large documents for API limits
- Rate limit handling with intelligent cooldown and retry mechanisms
- Embedding service for TRUE local vector-based semantic search
- User profiles with personalized greetings based on usage patterns
- RAG toggle to enable/disable semantic search in Settings

---

## Getting Started

### Q: What are the prerequisites for running ConstructLM?
A: You need:
- Node.js v16 or higher (recommended)
- npm (comes with Node.js)
- API keys for at least one preferred AI provider

### Q: How do I install ConstructLM?
A: Follow these steps:
1. Clone the repository: `git clone https://github.com/yourusername/ConstructLM.git`
2. Navigate to the directory: `cd ConstructLM-1`
3. Install dependencies: `npm install`
4. Set up environment variables by copying `.env.example` to `.env.local`
5. Edit `.env.local` with your API keys
6. Run the development server: `npm run dev`
7. Open your browser and navigate to `http://localhost:5173`

### Q: How do I set up environment variables?
A: Copy `.env.example` to `.env.local` and add your API keys:
```env
# Required: At least one API key
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Additional providers
GROQ_API_KEY=your_groq_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Optional: AWS Bedrock
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
```
**Important**: Never commit `.env.local` to version control!

---

## API Keys & Providers

### Q: How do I get a Google Gemini API key?
A: Follow these steps:
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key to your `.env.local` file

### Q: How do I get a Groq API key?
A: Follow these steps:
1. Visit [Groq Console](https://console.groq.com/)
2. Sign up for a free account
3. Navigate to the API Keys section
4. Generate a new API key

### Q: How do I get a Cerebras API key?
A: Follow these steps:
1. Visit [Cerebras Cloud](https://cloud.cerebras.ai/)
2. Sign up for a free account (no credit card required)
3. Click "API Keys" in the left sidebar
4. Create a new API key (starts with `csk-`)
5. Copy the key to Settings in the app

### Q: Why should I use Cerebras?
A: Cerebras offers several advantages:
- ✅ **Free unlimited** requests (rate-limited but generous)
- ✅ **Ultra-fast inference**: 900+ tokens/second
- ✅ **4 powerful models**: Llama 3.3 70B, GPT OSS 120B, Qwen 3 235B, ZAI GLM 4.7
- ✅ **No credit card** required

### Q: How do I get an OpenAI API key?
A: Follow these steps:
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create an account and add billing information
3. Go to the API Keys section
4. Create a new secret key

### Q: How do I set up AWS Bedrock?
A: Follow these steps:
1. Set up an AWS account
2. Enable Bedrock service in your region
3. Create IAM credentials with Bedrock access
4. Configure AWS credentials in your `.env.local` file

---

## Building & Deployment

### Q: How do I build ConstructLM for web deployment?
A: Run these commands:
```bash
npm run build
npm run preview
```

### Q: How do I build ConstructLM as a desktop application?
A: For development, run:
```bash
npm run electron:dev
```

For production build on Windows:
```bash
npm run electron:build
```
The installer will be created in the `release/` directory.

---

## Usage Guide

### Q: How do I use basic chat in ConstructLM?
A: Follow these steps:
1. Select a model from the header dropdown
2. Type your message in the input field
3. Press Enter or click Send
4. View AI responses with inline citations

### Q: How do I analyze documents?
A: Follow these steps:
1. Click the file upload button or drag & drop files
2. Files appear in the left sidebar
3. Use `@filename` in chat to reference specific documents
4. Click citations in responses to view source locations

### Q: How do I generate a mind map?
A: Right-click a document in the sidebar and select "Generate Mind Map". The AI will create an interactive visualization of the document structure.

### Q: How do I use web research features?
A: Click the link icon in the input area, add URLs as context sources, and the AI can reference web content in responses.

### Q: How do I use voice input?
A: Click the microphone icon, speak your message, and the AI will transcribe and process your speech.

### Q: How do I save important responses to my notebook?
A: Click the bookmark icon on any AI response to save it as a note. Access saved notes from the header and export them as markdown or PDF.

### Q: How do I use the Todo List feature?
A: Switch to the Todos tab in the header, create tasks with priorities, categories, and subtasks, and track progress and completion.

---

## Configuration & Settings

### Q: What settings can I configure in ConstructLM?
A: Access settings via the gear icon in the header to:
- Enable/disable semantic search (RAG settings)
- Configure API keys for all providers
- Test API key validity
- Adjust model preferences
- Manage storage and cache
- View activity logs
- Export/import data
- Clear application data

### Q: How do I set up my user profile?
A: Set up your profile for personalized greetings by configuring:
- Your name and role
- Greeting style (casual/professional/friendly)
- Usage patterns tracking

---

## Security & Privacy

### Q: How does ConstructLM handle API key safety?
A: ConstructLM follows these security practices:
- Never commit `.env.local` or any file containing API keys
- Store API keys only in `.env.local` (already in .gitignore)
- The app stores keys in browser localStorage (client-side only)
- Use the Settings modal to manage keys securely

### Q: Is my data private in ConstructLM?
A: Yes, ConstructLM prioritizes data privacy:
- **100% Local RAG**: All embeddings generated in your browser - no data sent to external APIs
- **Local Storage**: All data stored locally in browser (IndexedDB)
- **No Tracking**: No analytics or telemetry
- **API Calls**: Only for LLM inference (Gemini/Groq/OpenAI/Bedrock) - not for embeddings
- **Export/Import**: Full data portability

---

## Project Structure

### Q: What is the project structure of ConstructLM?
A: ConstructLM is organized as follows:
```
ConstructLM-1/
├── App/                    # Core application logic
│   ├── components/         # Main app components
│   ├── handlers/           # Event handlers
│   ├── hooks/              # React hooks
│   └── types.ts            # TypeScript types
├── components/             # UI components
│   ├── CitationRenderer/   # Citation display system
│   ├── DocumentViewer/     # Document viewing components
│   └── ...                 # Other UI components
├── services/               # Business logic services
│   ├── geminiService.ts    # Google Gemini integration
│   ├── llmService.ts       # Multi-model LLM service
│   ├── fileParser.ts       # Document parsing
│   ├── ragService.ts       # RAG implementation
│   └── ...                 # Other services
├── electron/               # Electron desktop app
├── server/                 # Proxy server
└── styles/                 # CSS styles
```

---

## Technologies Used

### Q: What technologies does ConstructLM use?
A: ConstructLM is built with:

**RAG & AI:**
- Transformers.js (@xenova/transformers v2.17.2) for TRUE local embeddings
- Model: Xenova/all-MiniLM-L6-v2 (384 dimensions)
- Technology: WebAssembly-based inference in browser
- Performance: 50-100ms per embedding
- Privacy: 100% local, zero API calls
- Vector Storage: IndexedDB (raw API) with semantic search
- Multi-Model LLM: Google Gemini, Groq, Cerebras, OpenAI, AWS Bedrock (26 models)
- Context Management: Smart token-aware context building with hybrid search

**Frontend:**
- React 19, TypeScript, Vite
- UI: Tailwind CSS, Lucide Icons
- 3D Graphics: Three.js, React Three Fiber
- Document Processing: PDF.js (structured extraction), XLSX
- AI Integration: Google Generative AI, OpenAI SDK, AWS SDK
- Desktop: Electron, Electron Builder
- Storage: IndexedDB (raw API), LocalStorage
- Markdown: React Markdown, Mark.js

---

## Known Issues & Limitations

### Q: What are the known issues with ConstructLM?
A: Current known issues include:
- Large PDF files (>50MB) may take time to process
- Some websites may not load in the web viewer due to CORS restrictions
- Local model support requires Ollama to be running separately
- Groq API key testing may show CORS errors (keys still work in actual usage)
- First-time RAG setup downloads ~25MB model (one-time, 5-10 seconds)

---

## Contributing & Support

### Q: How can I contribute to ConstructLM?
A: Contributions are welcome! Follow these steps:
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Before submitting:
- Ensure no API keys are exposed
- Test with at least one AI provider
- Update documentation if needed

### Q: Where can I get support for ConstructLM?
A: For issues, questions, or suggestions:
- Open an issue on GitHub
- Check the Help Documentation (? icon in app)
- Review activity logs for debugging (Settings → View Logs)
- Export diagnostic data for troubleshooting

---

## Tips & Tricks

### Q: What are some useful tips for using ConstructLM?
A: Here are some helpful tips:
- Use `Ctrl/Cmd + K` to quickly switch models
- Drag files directly onto the chat area for instant upload
- Right-click on messages for quick actions
- Use the snapshot feature to save important conversation states
- Enable activity logging to track token usage and costs

---

## Roadmap & Future Features

### Q: What features are planned for ConstructLM?
A: The roadmap includes:
- [ ] Multi-user collaboration features
- [ ] Plugin system for custom integrations
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Custom model fine-tuning interface
- [ ] Team workspace features

---

## License & Attribution

### Q: What license does ConstructLM use?
A: ConstructLM is licensed under the MIT License - see the LICENSE file for details.

### Q: Who should I credit for ConstructLM?
A: ConstructLM acknowledges:
- Google Gemini for powerful AI capabilities
- Groq for ultra-fast inference
- Cerebras for free unlimited ultra-fast models
- OpenAI for industry-leading models
- AWS Bedrock for enterprise AI services
- The open-source community for amazing tools and libraries

---

## Version & Author

### Q: What is the current version of ConstructLM?
A: **Version:** 1.0.0  
**Author:** Int. Arch. M.Shkeir

---

**Last Updated:** March 28, 2026
