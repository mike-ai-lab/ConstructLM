# ConstructLM

A **production-grade RAG (Retrieval-Augmented Generation)** application with multi-model AI support, advanced document processing, and intelligent conversation management.

> **Built for researchers, developers, and knowledge workers who need powerful document analysis with privacy and cost-efficiency.**

![ConstructLM](logo.png)

## 🎯 What Makes ConstructLM Different

- **🔒 Privacy-First RAG**: TRUE local embeddings with Transformers.js (Xenova/all-MiniLM-L6-v2) - your documents never leave your machine
- **💰 Zero Embedding Cost**: Local browser-based embeddings, no API calls for RAG
- **🚀 Multi-Model Support**: Switch between Gemini, Groq, Cerebras, OpenAI, and AWS Bedrock seamlessly (26 models total)
- **📱 Desktop & Web**: Full Electron app or browser-based deployment
- **⚡ Production-Ready**: Used in real applications with robust error handling and rate limiting

**[📖 Read the Architecture Documentation](ARCHITECTURE.md)** to understand the RAG system design.

## 🌟 Features

### 🧠 Advanced RAG (Retrieval-Augmented Generation)
- **TRUE Local Embeddings**: Transformers.js (Xenova/all-MiniLM-L6-v2, 384-dim) runs in browser via WebAssembly
- **Zero API Costs**: No embedding API fees - 100% local processing
- **Privacy-First**: Your documents never leave your machine - all embeddings generated locally
- **Vector Storage**: IndexedDB-based vector store with semantic search
- **Smart Retrieval**: Cosine similarity with relevance scoring
- **Auto-Indexing**: Files automatically processed on upload (when RAG enabled)
- **Context Management**: Token-aware context building for optimal responses
- **Citation System**: Inline citations with direct links to source documents
- **Chunk Optimization**: Intelligent text splitting (500 tokens, 10% overlap)
- **First-Time Setup**: ~5-10 seconds to download 25MB model (one-time, cached in browser)
- **Performance**: 50-100ms per embedding after initial load

### 🤖 Multi-Model AI Support
- **Google Gemini Models**: 5 models including Flash, Pro, and latest versions with 1M+ token context windows
- **Groq Models**: 11 models including Llama 3.3 70B, Llama 3.1 8B, Qwen 3 32B, and more ultra-fast models
- **Cerebras Models**: 4 models including Llama 3.3 70B, GPT OSS 120B, Qwen 3 235B - ultra-fast inference (900+ tok/s), free unlimited
- **OpenAI Models**: GPT-4o and GPT-4o Mini (paid)
- **AWS Bedrock**: Claude 3.5 Sonnet, Claude 3 Haiku, Llama 3, Mistral Large
- **Local Models**: Support for running models locally via Ollama
- **Total**: 26+ models across 5 providers

### 📄 Advanced Document Processing
- **Multi-format Support**: PDF, TXT, CSV, Excel, Markdown, JSON, XML, HTML, and code files
- **Intelligent Parsing**: Extract text, tables, and structure from complex documents
- **Structured PDF Extraction**: Advanced section-based parsing with page numbers
- **Document Viewer**: Built-in viewer with page navigation, search, and highlighting
- **Citation System**: Inline citations with direct links to source documents
- **RAG Integration**: Automatic semantic indexing on upload (when enabled)

### 💬 Smart Chat Features
- **Multi-Chat Management**: Create, switch, and manage multiple conversation threads
- **Context-Aware**: Automatically manages context windows and token limits
- **File Mentions**: Use `@filename` to reference specific documents in conversations
- **Web Sources**: Add URLs as context sources for research and analysis
- **Message Controls**: Retry, regenerate, save to notes, and view alternative outputs
- **Voice Input**: Speech-to-text transcription for hands-free interaction

### 🎨 Visual & Creative Tools
- **Mind Map Generator**: AI-powered mind maps from documents and conversations
- **Drawing Tools**: Annotate and sketch directly on the interface
- **Snapshot System**: Capture and save conversation states with visual previews
- **Graphics Library**: Manage and reuse generated visualizations

### 📝 Productivity Features
- **Notebook**: Save important AI responses as organized notes
- **Todo List**: Advanced task management with subtasks, priorities, and progress tracking
- **Reminders**: Set time-based reminders with snooze functionality
- **Activity Logging**: Track usage patterns and model performance
- **Export Options**: Export notes, conversations, and data

### 🌐 Web Integration
- **Tabbed Web Viewer**: Browse websites within the app with cookie persistence
- **GitHub Integration**: Browse and import code from any public GitHub repository
  - Repository browser with folder navigation
  - Multi-file selection and batch import
  - Branch switching and code search
  - Smart import of README and config files
  - AI-powered code analysis and documentation
- **CORS Proxy**: Automatic proxy rotation for accessing web content
- **Live Sessions**: Real-time collaborative features (Electron only)

### 🎯 Advanced Capabilities
- **Smart Context Management**: Automatic file selection based on relevance (keyword + semantic)
- **Hybrid Search**: Combines keyword matching (30%) with semantic similarity (70%)
- **Compression Service**: Optimize large documents for API limits
- **Rate Limit Handling**: Intelligent cooldown and retry mechanisms
- **Embedding Service**: TRUE local vector-based semantic search (Transformers.js)
- **User Profiles**: Personalized greetings based on usage patterns
- **RAG Toggle**: Enable/disable semantic search in Settings

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v16 or higher recommended)
- **npm** (comes with Node.js)
- API keys for your preferred AI providers (at least one required)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ConstructLM.git
   cd ConstructLM-1
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy `.env.example` to `.env.local` and add your API keys:
   ```bash
   cp .env.example .env.local
   ```
   
   Then edit `.env.local` with your actual API keys:
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
   
   **⚠️ IMPORTANT:** Never commit `.env.local` to version control!

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:5173` (or the URL shown in your terminal)

## 🔑 Getting API Keys

### Google Gemini (Free Tier Available)
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key to your `.env.local` file

### Groq (Free Tier Available)
1. Visit [Groq Console](https://console.groq.com/)
2. Sign up for a free account
3. Navigate to API Keys section
4. Generate a new API key

### Cerebras (Free Unlimited)
1. Visit [Cerebras Cloud](https://cloud.cerebras.ai/)
2. Sign up for a free account (no credit card required)
3. Click "API Keys" in the left sidebar
4. Create a new API key (starts with `csk-`)
5. Copy the key to Settings in the app

**Why Cerebras?**
- ✅ **Free unlimited** requests (rate-limited but generous)
- ✅ **Ultra-fast inference**: 900+ tokens/second
- ✅ **4 powerful models**: Llama 3.3 70B, GPT OSS 120B, Qwen 3 235B, ZAI GLM 4.7
- ✅ **No credit card** required

### OpenAI (Paid)
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create an account and add billing information
3. Go to API Keys section
4. Create a new secret key

### AWS Bedrock (Paid)
1. Set up an AWS account
2. Enable Bedrock service in your region
3. Create IAM credentials with Bedrock access
4. Configure AWS credentials

## 📦 Building for Production

### Web Application
```bash
npm run build
npm run preview
```

### Desktop Application (Electron)

**Development:**
```bash
npm run electron:dev
```

**Build for Windows:**
```bash
npm run electron:build
```

The installer will be created in the `release/` directory.

## 🎮 Usage Guide

### Basic Chat
1. Select a model from the header dropdown
2. Type your message in the input field
3. Press Enter or click Send
4. View AI responses with inline citations

### Document Analysis
1. Click the file upload button or drag & drop files
2. Files appear in the left sidebar
3. Use `@filename` in chat to reference specific documents
4. Click citations in responses to view source locations

### Advanced Features

**Mind Maps:**
- Right-click a document → "Generate Mind Map"
- AI creates an interactive visualization of document structure

**Web Research:**
- Click the link icon in the input area
- Add URLs as context sources
- AI can reference web content in responses

**Voice Input:**
- Click the microphone icon
- Speak your message
- AI transcribes and processes your speech

**Notebook:**
- Click the bookmark icon on any AI response
- Access saved notes from the header
- Export notes as markdown or PDF

**Todo List:**
- Switch to Todos tab in header
- Create tasks with priorities, categories, and subtasks
- Track progress and completion

## 🛠️ Configuration

### Settings Modal
Access via the gear icon in the header:
- **RAG Settings**: Enable/disable semantic search (enabled by default)
- Configure API keys for all providers
- Test API key validity
- Adjust model preferences
- Manage storage and cache
- View activity logs
- Export/import data
- Clear application data

### User Profile
Set up your profile for personalized greetings:
- Name and role
- Greeting style (casual/professional/friendly)
- Usage patterns tracking

## 📁 Project Structure

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

## 💻 Technologies Used

### RAG & AI
- **Transformers.js** (@xenova/transformers v2.17.2) - TRUE local embeddings
  - Model: Xenova/all-MiniLM-L6-v2 (384 dimensions)
  - Technology: WebAssembly-based inference in browser
  - Performance: 50-100ms per embedding
  - Privacy: 100% local, zero API calls
- **Vector Storage** - IndexedDB (raw API) with semantic search
- **Multi-Model LLM** - Google Gemini, Groq, Cerebras, OpenAI, AWS Bedrock (26 models)
- **Context Management** - Smart token-aware context building with hybrid search

### Frontend: React 19, TypeScript, Vite
- **UI**: Tailwind CSS, Lucide Icons
- **3D Graphics**: Three.js, React Three Fiber
- **Document Processing**: PDF.js (structured extraction), XLSX
- **AI Integration**: Google Generative AI, OpenAI SDK, AWS SDK
- **Desktop**: Electron, Electron Builder
- **Storage**: IndexedDB (raw API), LocalStorage
- **Markdown**: React Markdown, Mark.js

## 🔒 Security

### API Key Safety
- **Never commit** `.env.local` or any file containing API keys
- Store API keys only in `.env.local` (already in .gitignore)
- The app stores keys in browser localStorage (client-side only)
- Use the Settings modal to manage keys securely

### Data Privacy
- **100% Local RAG**: All embeddings generated in your browser - no data sent to external APIs
- **Local Storage**: All data stored locally in browser (IndexedDB)
- **No Tracking**: No analytics or telemetry
- **API Calls**: Only for LLM inference (Gemini/Groq/OpenAI/Bedrock) - not for embeddings
- **Export/Import**: Full data portability

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

**Before submitting:**
- Ensure no API keys are exposed
- Test with at least one AI provider
- Update documentation if needed

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🐛 Known Issues

- Large PDF files (>50MB) may take time to process
- Some websites may not load in the web viewer due to CORS restrictions
- Local model support requires Ollama to be running separately
- Groq API key testing may show CORS errors (keys still work in actual usage)
- First-time RAG setup downloads ~25MB model (one-time, 5-10 seconds)

## 🔮 Roadmap

- [ ] Multi-user collaboration features
- [ ] Plugin system for custom integrations
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Custom model fine-tuning interface
- [ ] Team workspace features

## 💡 Tips & Tricks

- Use `Ctrl/Cmd + K` to quickly switch models
- Drag files directly onto the chat area for instant upload
- Right-click on messages for quick actions
- Use the snapshot feature to save important conversation states
- Enable activity logging to track token usage and costs

## 📧 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check the Help Documentation (? icon in app)
- Review activity logs for debugging (Settings → View Logs)
- Export diagnostic data for troubleshooting

## 🙏 Acknowledgments

- Google Gemini for powerful AI capabilities
- Groq for ultra-fast inference
- Cerebras for free unlimited ultra-fast models
- OpenAI for industry-leading models
- AWS Bedrock for enterprise AI services
- The open-source community for amazing tools and libraries

## 📄 License

MIT License - see LICENSE file for details

---

**Built with ❤️ for researchers, developers, and knowledge workers**

**Version:** 1.0.0  
**Author:** Int. Arch. M.Shkeir
