import React, { useState } from 'react';
import { X, FileText, MessageSquare, Sparkles, Keyboard, Settings, Network, Image, Phone, ChevronRight, Search, Bug, Lightbulb, Mail, Database, ExternalLink } from 'lucide-react';
import { DOCUMENTATION_KB } from '../data/documentationKB';
import ReactMarkdown from 'react-markdown';
import { PipelineTracker } from './PipelineTracker';

interface HelpDocumentationProps {
  onClose: () => void;
}

const HelpDocumentation: React.FC<HelpDocumentationProps> = ({ onClose }) => {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAssistant, setShowAssistant] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<Array<{id: string, role: 'user' | 'model', content: string, timestamp: number}>>([]);
  const [assistantInput, setAssistantInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastRelevantSection, setLastRelevantSection] = useState<string | null>(null);

  const navigateToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const contentArea = document.querySelector('.documentation-content');
    if (contentArea) {
      contentArea.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const searchKnowledgeBase = (query: string, topK: number = 3) => {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);
    
    // Check if asking about current page
    if (queryLower.includes('this page') || queryLower.includes('what is this')) {
      const currentSection = sections.find(s => s.id === activeSection);
      return [{
        id: `current_${activeSection}`,
        section: activeSection,
        title: `About ${currentSection?.title}`,
        content: `This page covers ${currentSection?.title}. ${DOCUMENTATION_KB.units.filter(u => u.section === activeSection).map(u => u.content).join(' ')}`,
        keywords: []
      }];
    }
    
    const scored = DOCUMENTATION_KB.units.map(unit => {
      let score = 0;
      queryWords.forEach(word => {
        // Exact keyword match (highest priority)
        if (unit.keywords.includes(word)) score += 5;
        // Partial keyword match
        else if (unit.keywords.some(kw => kw.includes(word) || word.includes(kw))) score += 2;
        // Content match
        if (unit.content.toLowerCase().includes(word)) score += 1;
        // Title match (high priority)
        if (unit.title.toLowerCase().includes(word)) score += 4;
      });
      return { unit, score };
    });
    
    scored.sort((a, b) => b.score - a.score);
    const results = scored.filter(s => s.score > 0).slice(0, topK);
    
    console.log('[DOC-KB] Query:', query);
    console.log('[DOC-KB] Results:', results.map(r => ({ title: r.unit.title, score: r.score })));
    
    return results.map(r => r.unit);
  };

  const handleSendToAssistant = async (message: string) => {
    if (!message.trim() || isGenerating) return;
    
    const userMessage = { id: `user-${Date.now()}`, role: 'user' as const, content: message, timestamp: Date.now() };
    setAssistantMessages(prev => [...prev, userMessage]);
    setAssistantInput('');
    setIsGenerating(true);

    try {
      const { sendMessageToLLM } = await import('../services/llmService');
      
      const relevantUnits = searchKnowledgeBase(message, 3);
      const context = relevantUnits.map(u => `${u.title}:\n${u.content}`).join('\n\n');
      
      // Set CTA only if highest score meets threshold
      const highestScore = relevantUnits[0] ? relevantUnits.length > 0 ? Math.max(...relevantUnits.map((_, i) => 
        relevantUnits.filter(u => u.section === relevantUnits[i].section).length
      )) : 0 : 0;
      
      if (highestScore >= 2 && relevantUnits[0]) {
        setLastRelevantSection(relevantUnits[0].section);
      } else {
        setLastRelevantSection(null);
      }
      
      const enhancedMessage = `You are a helpful ConstructLM documentation assistant.\n\nRelevant Documentation:\n${context}\n\nUser Question: ${message}\n\nProvide a clear, direct answer based on the documentation. Be conversational and focus on the official methods. Present information factually without speculating on outcomes. Format your response in markdown.\n\nAt the very end of your response, on a new line, add: [SECTION:section-id] where section-id is the most relevant documentation section. Valid sections: getting-started, sources, chat, notebook, todos, mindmap, live, graphics, data, shortcuts, settings, support. Only include this if your answer references a specific section.`;

      let response = '';
      
      await sendMessageToLLM(
        'gemini-2.5-flash',
        assistantMessages,
        enhancedMessage,
        [],
        (chunk) => {
          response += chunk;
          setAssistantMessages(prev => {
            const newMessages = [...prev];
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg?.role === 'model') {
              // Extract section tag and remove it from display
              const sectionMatch = response.match(/\[SECTION:([a-z-]+)\]/);
              if (sectionMatch) {
                setLastRelevantSection(sectionMatch[1]);
                lastMsg.content = response.replace(/\[SECTION:[a-z-]+\]/, '').trim();
              } else {
                lastMsg.content = response;
              }
            } else {
              newMessages.push({ id: `model-${Date.now()}`, role: 'model', content: response, timestamp: Date.now() });
            }
            return newMessages;
          });
        },
        []
      );
    } catch (error) {
      console.error('Assistant error:', error);
      setAssistantMessages(prev => [...prev, { id: `model-${Date.now()}`, role: 'model', content: 'Sorry, I encountered an error. Please try again.', timestamp: Date.now() }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const suggestedPrompts = [
    'How do I get started?',
    'How do I generate a mind map?',
    'How do I export my notes?'
  ];

  const sections = [
    { id: 'getting-started', title: 'Getting Started', icon: Sparkles, category: 'Basics' },
    { id: 'how-it-works', title: 'How It Works', icon: Network, category: 'Basics' },
    { id: 'document-sources', title: 'Document Sources', icon: FileText, category: 'Sources' },
    { id: 'web-sources', title: 'Web Sources', icon: ExternalLink, category: 'Sources' },
    { id: 'chat', title: 'Chat Features', icon: MessageSquare, category: 'Features' },
    { id: 'notebook', title: 'Notebook', icon: FileText, category: 'Features' },
    { id: 'todos', title: 'Tasks & Todos', icon: MessageSquare, category: 'Features' },
    { id: 'reminders', title: 'Reminders', icon: MessageSquare, category: 'Features' },
    { id: 'mindmap', title: 'Mind Maps', icon: Network, category: 'Features' },
    { id: 'web', title: 'Web Integration', icon: ExternalLink, category: 'Features' },
    { id: 'live', title: 'Live Mode', icon: Phone, category: 'Features' },
    { id: 'graphics', title: 'Graphics Library', icon: Image, category: 'Features' },
    { id: 'data', title: 'Data Management', icon: Database, category: 'Advanced' },
    { id: 'shortcuts', title: 'Keyboard Shortcuts', icon: Keyboard, category: 'Advanced' },
    { id: 'settings', title: 'Configuration', icon: Settings, category: 'Advanced' },
    { id: 'support', title: 'Support & Feedback', icon: Mail, category: 'Advanced' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex bg-white dark:bg-[#1a1a1a]">
      {/* Sidebar */}
      <div className="w-64 border-r border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] flex flex-col">
        <div className="h-[65px] flex items-center justify-between px-4 border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]">
          <h2 className="text-sm font-semibold text-[#1a1a1a] dark:text-white">Documentation</h2>
          <button 
            onClick={() => setShowAssistant(!showAssistant)} 
            className="p-1.5 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] rounded-full"
            title="AI Assistant"
          >
            <Sparkles size={16} className={showAssistant ? 'text-[#4485d1]' : 'text-[#a0a0a0]'} />
          </button>
        </div>
        
        <div className="p-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#a0a0a0]" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded-lg text-xs text-[#1a1a1a] dark:text-white focus:outline-none focus:ring-2 focus:ring-[rgba(37,99,235,0.3)]"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          {['Basics', 'Sources', 'Features', 'Advanced'].map(category => {
            const categoryItems = sections.filter(s => s.category === category);
            return (
              <div key={category} className="mb-4">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#a0a0a0]">{category}</div>
                {categoryItems.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        setActiveSection(section.id);
                        const contentArea = document.querySelector('.documentation-content');
                        if (contentArea) {
                          contentArea.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      className={`documentation-nav-button w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                        activeSection === section.id
                          ? 'active bg-[rgba(37,99,235,0.15)] text-[rgb(37,99,235)]'
                          : 'text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a]'
                      }`}
                    >
                      <Icon size={14} />
                      <span>{section.title}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto documentation-content">
        <div className="h-[65px] flex items-center justify-end px-4 border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]">
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] rounded-full"
          >
            <X size={20} className="text-[#a0a0a0]" />
          </button>
        </div>
        <div className="max-w-3xl mx-auto px-8 py-8">
          <div className="documentation-section">
            {activeSection === 'getting-started' && <GettingStarted />}
            {activeSection === 'how-it-works' && <HowItWorks />}
            {activeSection === 'document-sources' && <DocumentSources />}
            {activeSection === 'web-sources' && <WebSources />}
            {activeSection === 'chat' && <ChatFeatures />}
            {activeSection === 'notebook' && <NotebookFeature />}
            {activeSection === 'todos' && <TodosFeature />}
            {activeSection === 'reminders' && <RemindersFeature />}
            {activeSection === 'mindmap' && <MindMaps />}
            {activeSection === 'web' && <WebIntegration />}
            {activeSection === 'live' && <LiveMode />}
            {activeSection === 'graphics' && <GraphicsLibrary />}
            {activeSection === 'data' && <DataManagement />}
            {activeSection === 'shortcuts' && <KeyboardShortcuts />}
            {activeSection === 'settings' && <Configuration />}
            {activeSection === 'support' && <SupportFeedback />}
          </div>
        </div>
      </div>

      {/* AI Assistant Sidebar */}
      {showAssistant && (
        <div className="w-[450px] border-l border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] flex flex-col bg-white dark:bg-[#1a1a1a]">
          <div className="h-[65px] flex items-center justify-between px-4 border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#4485d1]" />
              <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white">AI Assistant</h3>
            </div>
            <button onClick={() => setShowAssistant(false)} className="p-1.5 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] rounded-full">
              <X size={16} className="text-[#a0a0a0]" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {assistantMessages.length === 0 && (
              <div className="space-y-2 px-2">
                <p className="text-xs text-[#666666] dark:text-[#a0a0a0] mb-3">Ask me anything about this documentation:</p>
                {suggestedPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendToAssistant(prompt)}
                    className="w-full text-left px-3 py-2 text-xs bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] hover:bg-[rgba(68,133,209,0.1)] rounded-lg text-[#1a1a1a] dark:text-white transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
            {assistantMessages.map((msg, i) => (
              <div key={i} className="px-2">
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`px-3 py-2 rounded-lg text-xs ${
                    msg.role === 'user' 
                      ? 'bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] text-[#1a1a1a] dark:text-white max-w-[85%]' 
                      : 'bg-[rgba(68,133,209,0.1)] text-[#1a1a1a] dark:text-white w-full'
                  }`}>
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
                {msg.role === 'model' && i === assistantMessages.length - 1 && lastRelevantSection && (
                  <button
                    onClick={() => navigateToSection(lastRelevantSection)}
                    className="mt-2 flex items-center gap-1 px-2 py-1 text-xs bg-[#4485d1] text-white rounded hover:bg-[#3a75c1] transition-colors"
                  >
                    <ExternalLink size={12} />
                    View {sections.find(s => s.id === lastRelevantSection)?.title}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]">
            <div className="flex gap-2">
              <input
                type="text"
                value={assistantInput}
                onChange={(e) => setAssistantInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !isGenerating) {
                    e.preventDefault();
                    handleSendToAssistant(assistantInput);
                  }
                }}
                placeholder="Ask a question..."
                disabled={isGenerating}
                className="flex-1 px-3 py-2 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded-lg text-sm text-[#1a1a1a] dark:text-white placeholder:text-[#a0a0a0] focus:outline-none focus:ring-1 focus:ring-[rgba(68,133,209,0.5)] disabled:opacity-50"
              />
              <button
                onClick={() => handleSendToAssistant(assistantInput)}
                disabled={!assistantInput.trim() || isGenerating}
                className="p-2 bg-[#4485d1] text-white rounded-lg hover:bg-[#3a75c1] disabled:opacity-50 transition-colors"
                title="Send"
              >
                <MessageSquare size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PageTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h1 className="text-4xl font-bold text-[#1a1a1a] dark:text-white mb-2">{children}</h1>
);

const PageDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-base text-[#666666] dark:text-[#a0a0a0] mb-8 pb-6 border-b border-[rgba(0,0,0,0.1)] dark:border-[rgba(255,255,255,0.1)]">{children}</p>
);

const TOC: React.FC<{ items: string[] }> = ({ items }) => (
  <div className="bg-[rgba(37,99,235,0.05)] dark:bg-[rgba(37,99,235,0.1)] border border-[rgba(37,99,235,0.2)] rounded-lg p-4 mb-8">
    <h3 className="text-sm font-semibold text-[#1a1a1a] dark:text-white mb-3">On This Page</h3>
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-[#666666] dark:text-[#a0a0a0] hover:text-[rgb(37,99,235)] cursor-pointer transition-colors">
          <span className="text-[rgb(37,99,235)] font-mono text-xs mt-0.5">{i + 1}.</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

const SectionDivider: React.FC = () => (
  <div className="my-8 border-t border-[rgba(0,0,0,0.1)] dark:border-[rgba(255,255,255,0.1)]" />
);

const SectionTitle: React.FC<{ number?: string; children: React.ReactNode }> = ({ number, children }) => (
  <h2 className="text-2xl font-bold text-[#1a1a1a] dark:text-white mt-8 mb-4 flex items-center gap-3">
    {number && <span className="text-[rgb(37,99,235)] font-mono text-xl">{number}</span>}
    <span>{children}</span>
  </h2>
);

const SubTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-lg font-semibold text-[#1a1a1a] dark:text-white mt-6 mb-3">{children}</h3>
);

const FeatureTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h4 className="text-base font-semibold text-[#1a1a1a] dark:text-white mt-5 mb-2">{children}</h4>
);

const Paragraph: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-sm text-[#666666] dark:text-[#a0a0a0] leading-relaxed mb-4">{children}</p>
);

const List: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ul className="space-y-2 mb-4">{children}</ul>
);

const ListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-2 text-sm text-[#666666] dark:text-[#a0a0a0]">
    <ChevronRight size={14} className="text-[rgb(37,99,235)] flex-shrink-0 mt-0.5" />
    <span>{children}</span>
  </li>
);

const CodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded-lg p-3 mb-4">
    <code className="text-xs text-[#1a1a1a] dark:text-white font-mono">{children}</code>
  </div>
);

const InfoBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-[rgba(37,99,235,0.1)] border border-[rgba(37,99,235,0.25)] dark:border-[rgba(37,99,235,0.3)] rounded-lg p-3 mb-4">
    <p className="text-xs text-[#1a1a1a] dark:text-white leading-relaxed">{children}</p>
  </div>
);

const HowItWorks: React.FC = () => (
  <>
    <PageTitle>How ConstructLM Works</PageTitle>
    <PageDescription>
      Understanding the processing pipeline helps you work more efficiently with ConstructLM. Here's what happens behind the scenes when you upload files and ask questions.
    </PageDescription>

    <TOC items={[
      'File Upload Process',
      'Query Processing Pipeline',
      'Smart Context Management',
      'Performance Optimization'
    ]} />

    <SectionTitle number="1">File Upload Process</SectionTitle>
    <Paragraph>
      When you upload a document, ConstructLM processes it through several stages:
    </Paragraph>
    <List>
      <ListItem><strong>Upload:</strong> File is read from your device into browser memory</ListItem>
      <ListItem><strong>Parse:</strong> Content is extracted based on file type (PDF text, Excel tables, image analysis, etc.)</ListItem>
      <ListItem><strong>Embed:</strong> Text is converted to vector embeddings for semantic search capabilities</ListItem>
      <ListItem><strong>Index:</strong> Vectors are stored in IndexedDB for fast retrieval</ListItem>
      <ListItem><strong>Ready:</strong> File is now available for AI conversations with full search support</ListItem>
    </List>

    <InfoBox>
      Most files process in under 1 second. Large PDFs (50+ pages) may take 2-3 seconds. The app shows real-time progress for batch uploads.
    </InfoBox>

    <SectionDivider />

    <SectionTitle number="2">Query Processing Pipeline</SectionTitle>
    <Paragraph>
      When you send a message with file context, the system intelligently retrieves relevant information:
    </Paragraph>
    <List>
      <ListItem><strong>Query Analysis:</strong> Your question is analyzed to understand intent</ListItem>
      <ListItem><strong>Semantic Search:</strong> Vector embeddings find the most relevant document sections</ListItem>
      <ListItem><strong>Context Selection:</strong> Top matching chunks are selected (typically 3-5 sections)</ListItem>
      <ListItem><strong>AI Processing:</strong> Selected context + your question is sent to the AI model</ListItem>
      <ListItem><strong>Response Generation:</strong> AI streams back an answer with inline citations</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="3">Smart Context Management</SectionTitle>
    <Paragraph>
      ConstructLM automatically manages context to stay within model limits:
    </Paragraph>
    <List>
      <ListItem>Monitors total token count across all selected files</ListItem>
      <ListItem>Warns when approaching model context limits (typically 30-50k tokens)</ListItem>
      <ListItem>Uses semantic search to include only relevant sections</ListItem>
      <ListItem>Compresses large documents while preserving key information</ListItem>
      <ListItem>Handles rate limits with intelligent retry mechanisms</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="4">Performance Optimization</SectionTitle>
    <List>
      <ListItem><strong>Caching:</strong> Processed files persist across sessions - no re-processing needed</ListItem>
      <ListItem><strong>Batch Processing:</strong> Multiple files upload in parallel for speed</ListItem>
      <ListItem><strong>Incremental Loading:</strong> Large documents load progressively</ListItem>
      <ListItem><strong>Duplicate Detection:</strong> Identical files are automatically skipped</ListItem>
    </List>
  </>
);

const GettingStarted: React.FC = () => (
  <>
    <PageTitle>Getting Started</PageTitle>
    <PageDescription>
      ConstructLM is an AI-powered document analysis and chat application that helps you interact with your files using advanced language models.
    </PageDescription>

    <TOC items={[
      'Quick Start',
      'Supported File Types',
      'Privacy & Security'
    ]} />

    <SectionTitle number="1">Quick Start</SectionTitle>
    <List>
      <ListItem>Configure your API keys in Settings (click the gear icon in the header)</ListItem>
      <ListItem>Upload documents by clicking the plus icon in the Sources panel or drag files anywhere</ListItem>
      <ListItem>Type @ in the chat to mention files and include them in your conversation</ListItem>
      <ListItem>Select an AI model from the dropdown in the header</ListItem>
      <ListItem>Start chatting with your documents</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="2">Supported File Types</SectionTitle>
    <List>
      <ListItem>PDF documents</ListItem>
      <ListItem>Excel spreadsheets (.xlsx, .xls, .csv)</ListItem>
      <ListItem>Images (.png, .jpg, .jpeg, .gif, .bmp, .webp)</ListItem>
      <ListItem>Text files (.txt, .md, .json)</ListItem>
      <ListItem>Word documents (.doc, .docx)</ListItem>
      <ListItem>PowerPoint presentations (.ppt, .pptx)</ListItem>
    </List>

    <InfoBox>
      All files are processed locally in your browser. Your documents never leave your device unless you explicitly send them to an AI model.
    </InfoBox>
  </>
);

const DocumentSources: React.FC = () => (
  <>
    <PageTitle>Document Sources</PageTitle>
    <PageDescription>
      ConstructLM's document processing is one of its most powerful features. Upload files once, and the AI can reference them across all conversations with intelligent semantic search.
    </PageDescription>

    <TOC items={[
      'Supported Document Types',
      'Adding Documents',
      'Organizing Files with Folders',
      'File Selection & Sources Panel',
      'Using Files in Chat',
      'File Actions',
      'View Modes'
    ]} />

    <SectionTitle number="1">Supported Document Types</SectionTitle>
    
    <FeatureTitle>PDF Documents</FeatureTitle>
    <List>
      <ListItem>Full text extraction from all PDF versions</ListItem>
      <ListItem>Table detection and structured data extraction</ListItem>
      <ListItem>Page-level navigation with direct citations</ListItem>
      <ListItem>Handles scanned PDFs with OCR capabilities</ListItem>
      <ListItem>Preserves document structure and formatting</ListItem>
      <ListItem>Ideal for: Reports, specifications, contracts, manuals</ListItem>
    </List>

    <FeatureTitle>Excel & Spreadsheets</FeatureTitle>
    <List>
      <ListItem>Formats: .xlsx, .xls, .csv</ListItem>
      <ListItem>Multi-sheet support with sheet names preserved</ListItem>
      <ListItem>Cell-level precision in citations</ListItem>
      <ListItem>Formula and calculated value extraction</ListItem>
      <ListItem>Table structure maintained for AI analysis</ListItem>
      <ListItem>Ideal for: BOQ, cost estimates, schedules, data analysis</ListItem>
    </List>

    <FeatureTitle>Word Documents</FeatureTitle>
    <List>
      <ListItem>Formats: .doc, .docx</ListItem>
      <ListItem>Heading hierarchy preserved</ListItem>
      <ListItem>Lists, tables, and formatting maintained</ListItem>
      <ListItem>Comments and tracked changes extracted</ListItem>
      <ListItem>Ideal for: Proposals, specifications, meeting notes</ListItem>
    </List>

    <FeatureTitle>Images</FeatureTitle>
    <List>
      <ListItem>Formats: .png, .jpg, .jpeg, .gif, .bmp, .webp</ListItem>
      <ListItem>AI vision analysis (with compatible models)</ListItem>
      <ListItem>Text extraction from images (OCR)</ListItem>
      <ListItem>Diagram and chart interpretation</ListItem>
      <ListItem>Ideal for: Site photos, diagrams, blueprints, charts</ListItem>
    </List>

    <FeatureTitle>Text & Code Files</FeatureTitle>
    <List>
      <ListItem>Formats: .txt, .md, .json, .xml, .html</ListItem>
      <ListItem>Code files: .js, .ts, .py, .java, .c, .cpp, .cs, .css</ListItem>
      <ListItem>Syntax highlighting and structure preservation</ListItem>
      <ListItem>Markdown rendering with formatting</ListItem>
      <ListItem>Ideal for: Documentation, code review, configuration files</ListItem>
    </List>

    <FeatureTitle>Presentations</FeatureTitle>
    <List>
      <ListItem>Formats: .ppt, .pptx</ListItem>
      <ListItem>Slide-by-slide content extraction</ListItem>
      <ListItem>Speaker notes included</ListItem>
      <ListItem>Ideal for: Project presentations, training materials</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="2">Adding Documents</SectionTitle>
    <Paragraph>
      Multiple ways to add files to your workspace:
    </Paragraph>
    <List>
      <ListItem><strong>Click Upload:</strong> Click the + icon in Sources panel</ListItem>
      <ListItem><strong>Drag & Drop:</strong> Drag files anywhere in the app</ListItem>
      <ListItem><strong>Drag to Chat:</strong> Drop files directly into chat input</ListItem>
      <ListItem><strong>Folder Upload:</strong> Upload entire folder structures</ListItem>
      <ListItem><strong>Batch Upload:</strong> Select multiple files at once</ListItem>
    </List>

    <InfoBox>
      Files are processed instantly (typically under 1 second) and stored in IndexedDB. They persist across sessions - no need to re-upload!
    </InfoBox>

    <SectionDivider />

    <SectionTitle number="3">Organizing Files with Folders</SectionTitle>
    <Paragraph>
      Create custom folders to organize your documents:
    </Paragraph>
    <List>
      <ListItem>Click the folder+ icon to create a new folder</ListItem>
      <ListItem>Right-click files and select "Cut" to move them</ListItem>
      <ListItem>Right-click a folder and select "Paste" to move files into it</ListItem>
      <ListItem>Rename folders by right-clicking and selecting "Rename"</ListItem>
      <ListItem>Delete folders (files are moved to root, not deleted)</ListItem>
      <ListItem>Folders persist across sessions</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="4">File Selection & Sources Panel</SectionTitle>
    <Paragraph>
      Control which files are included in your AI conversations:
    </Paragraph>
    <List>
      <ListItem>Check/uncheck files to include/exclude them from context</ListItem>
      <ListItem>Click "Select All" to check all files at once</ListItem>
      <ListItem>Click "Deselect All" to uncheck all files</ListItem>
      <ListItem>Folder checkboxes select/deselect all files within</ListItem>
      <ListItem>Only checked files are sent to the AI model</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="5">Using Files in Chat</SectionTitle>
    <Paragraph>
      Files must be explicitly mentioned using the @ symbol to be included in your conversation:
    </Paragraph>
    <List>
      <ListItem>Type @ in the chat input to see a list of available files</ListItem>
      <ListItem>Select a file from the dropdown or continue typing to filter</ListItem>
      <ListItem>You can mention multiple files in a single message</ListItem>
      <ListItem>Drag a file from the sidebar into the chat input to mention it</ListItem>
      <ListItem>Files work even when inside folders - just drag or mention them</ListItem>
    </List>

    <InfoBox>
      The app shows token counts for each file. Most models support 30-50k tokens of context. If you exceed this limit, you'll receive a warning.
    </InfoBox>

    <SectionDivider />

    <SectionTitle number="6">File Actions</SectionTitle>
    <Paragraph>
      Hover over any file in the Sources panel to access these actions:
    </Paragraph>
    <List>
      <ListItem>Preview: View the file content in a modal</ListItem>
      <ListItem>Download: Save the file to your computer</ListItem>
      <ListItem>Mind Map: Generate an interactive visualization of the document structure</ListItem>
      <ListItem>Remove: Delete the file from your workspace</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="7">View Modes</SectionTitle>
    <Paragraph>
      Switch between two view modes in the Sources panel:
    </Paragraph>
    <List>
      <ListItem><strong>Files Only:</strong> Flat list of all files with checkboxes</ListItem>
      <ListItem><strong>Folders:</strong> Tree view showing folder structure from uploaded folders</ListItem>
    </List>
  </>
);

const ChatFeatures: React.FC = () => (
  <>
    <PageTitle>Chat Features</PageTitle>
    <PageDescription>
      Powerful chat capabilities with message controls, highlighting, drawing tools, and multi-model support.
    </PageDescription>

    <TOC items={[
      'Message Controls',
      'Alternative Outputs',
      'Text Highlighter',
      'Drawing Tools',
      'Multiple Conversations',
      'Model Selection',
      'Citations',
      'Save to Notebook',
      'Note Styling',
      'Voice Input',
      'Web Sources'
    ]} />

    <SectionTitle number="1">Message Controls</SectionTitle>
    <Paragraph>
      Every AI message has powerful controls:
    </Paragraph>
    <List>
      <ListItem><strong>Read Aloud:</strong> Click the speaker icon to hear the AI response with text-to-speech</ListItem>
      <ListItem><strong>Regenerate:</strong> Click the refresh icon to get a new response to the same question</ListItem>
      <ListItem><strong>Delete:</strong> Remove messages from the conversation</ListItem>
      <ListItem><strong>Save to Notebook:</strong> Bookmark important responses for later reference</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="2">Alternative Outputs</SectionTitle>
    <Paragraph>
      When you regenerate a response, you can view all variations:
    </Paragraph>
    <List>
      <ListItem>Use left/right arrows to navigate between different AI responses</ListItem>
      <ListItem>Shows "1 of 3" indicator when multiple outputs exist</ListItem>
      <ListItem>Each output is saved and can be revisited</ListItem>
      <ListItem>Useful for comparing different AI perspectives</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="3">Text Highlighter</SectionTitle>
    <Paragraph>
      Mark important parts of AI responses with colored highlights:
    </Paragraph>
    <List>
      <ListItem>Right-click on any AI message and select "Highlight Text"</ListItem>
      <ListItem>A floating toolbar appears with 5 color options</ListItem>
      <ListItem>Select text to highlight it with your chosen color</ListItem>
      <ListItem>Click highlighted text to remove the highlight</ListItem>
      <ListItem>Use Undo/Redo buttons to manage your highlights</ListItem>
      <ListItem>Drag the toolbar to reposition it anywhere on screen</ListItem>
      <ListItem>Click the checkmark to exit highlight mode</ListItem>
      <ListItem>Click the trash icon to clear all highlights from the message</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="4">Drawing Tools</SectionTitle>
    <Paragraph>
      Draw annotations directly on your screen over any content:
    </Paragraph>
    <FeatureTitle>Accessing Drawing Mode</FeatureTitle>
    <List>
      <ListItem>Right-click on any AI message and select "Draw on Screen"</ListItem>
      <ListItem>A floating toolbar appears with drawing tools</ListItem>
      <ListItem>Drag the toolbar to move it out of your way</ListItem>
    </List>
    <FeatureTitle>Available Tools</FeatureTitle>
    <List>
      <ListItem><strong>Pen:</strong> Draw freehand - circles and rectangles are auto-detected</ListItem>
      <ListItem><strong>Rectangle:</strong> Click and drag to draw perfect rectangles</ListItem>
      <ListItem><strong>Circle:</strong> Click and drag to draw perfect circles</ListItem>
      <ListItem><strong>Arrow:</strong> Click and drag to draw arrows pointing in any direction</ListItem>
    </List>
    <FeatureTitle>Customization</FeatureTitle>
    <List>
      <ListItem>Choose from 5 colors for your drawings</ListItem>
      <ListItem>Adjust stroke width with +/- buttons</ListItem>
      <ListItem>Click checkmark when done to exit drawing mode</ListItem>
      <ListItem>Click trash icon to clear all drawings</ListItem>
    </List>
    <InfoBox>
      Tip: With the Pen tool, draw a straight line and add a quick zigzag at the end to create an arrow automatically!
    </InfoBox>

    <SectionDivider />

    <SectionTitle number="5">Multiple Conversations</SectionTitle>
    <List>
      <ListItem>Click the plus icon in the header to create a new chat</ListItem>
      <ListItem>Switch between chats using the Chats tab in the sidebar</ListItem>
      <ListItem>Each chat maintains its own conversation history</ListItem>
      <ListItem>Chats are automatically saved to your browser's local storage</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="6">Model Selection</SectionTitle>
    <List>
      <ListItem>Google Gemini: Fast, supports large contexts and images (Free tier available)</ListItem>
      <ListItem>Groq Llama: Extremely fast inference, great for quick tasks (Free tier available)</ListItem>
      <ListItem>OpenAI GPT: Industry-standard intelligence (requires paid account)</ListItem>
      <ListItem>AWS Bedrock: Claude 3.5 Sonnet, Haiku, Llama 3, Mistral (requires AWS account)</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="7">Citations</SectionTitle>
    <Paragraph>
      When the AI references your documents, clickable citations appear in the response. Click any citation to view the exact location in the source document.
    </Paragraph>

    <SectionDivider />

    <SectionTitle number="8">Save to Notebook</SectionTitle>
    <Paragraph>
      Save important AI responses with visual styling:
    </Paragraph>
    <List>
      <ListItem>Click the bookmark icon on any AI message to save it</ListItem>
      <ListItem>Saved notes are numbered automatically (Note #1, #2, etc.)</ListItem>
      <ListItem>Saved messages get a blue highlight background by default</ListItem>
      <ListItem>Access all saved notes from the Notebook tab in the header</ListItem>
      <ListItem>Click the bookmark icon again to unsave</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="9">Note Styling</SectionTitle>
    <Paragraph>
      Customize how saved notes appear in chat (Settings → Note Style):
    </Paragraph>
    <List>
      <ListItem><strong>Highlight BG (Default):</strong> Blue background tint</ListItem>
      <ListItem><strong>Left Border:</strong> Blue vertical line on the left</ListItem>
      <ListItem><strong>Glow Effect:</strong> Subtle shadow around the message</ListItem>
      <ListItem><strong>Corner Badge:</strong> Note number badge in top-right corner</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="10">Voice Input</SectionTitle>
    <List>
      <ListItem>Click the microphone icon in the chat input</ListItem>
      <ListItem>Speak your message clearly</ListItem>
      <ListItem>Click again to stop recording and transcribe</ListItem>
      <ListItem>Edit the transcribed text before sending</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="11">Web Sources</SectionTitle>
    <List>
      <ListItem>Click the link icon in the chat input</ListItem>
      <ListItem>Enter a URL to fetch and include in context</ListItem>
      <ListItem>The AI can reference content from added URLs</ListItem>
      <ListItem>Remove sources by clicking the X icon</ListItem>
    </List>
  </>
);

const MindMaps: React.FC = () => (
  <>
    <PageTitle>Mind Maps</PageTitle>
    <PageDescription>
      Interactive visualizations that show the hierarchical structure of your documents with AI-powered analysis.
    </PageDescription>

    <TOC items={[
      'What are Mind Maps?',
      'Generating Mind Maps',
      'Interacting with Mind Maps',
      'Mind Map Cache',
      'Best Use Cases'
    ]} />

    <SectionTitle number="1">What are Mind Maps?</SectionTitle>
    <Paragraph>
      Mind maps are interactive visualizations that show the hierarchical structure of your documents. The AI analyzes your file and creates a tree diagram showing relationships between concepts.
    </Paragraph>

    <SectionDivider />

    <SectionTitle number="2">Generating Mind Maps</SectionTitle>
    <List>
      <ListItem>Hover over any file in the Sources panel</ListItem>
      <ListItem>Click the Network icon (purple)</ListItem>
      <ListItem>Wait for the AI to analyze the document structure</ListItem>
      <ListItem>The mind map opens in fullscreen mode</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="3">Interacting with Mind Maps</SectionTitle>
    <List>
      <ListItem>Click nodes to expand or collapse branches</ListItem>
      <ListItem>Scroll to zoom in and out</ListItem>
      <ListItem>Drag to pan around the visualization</ListItem>
      <ListItem>Click the fullscreen button to toggle fullscreen mode</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="4">Mind Map Cache</SectionTitle>
    <List>
      <ListItem>Generated mind maps are cached locally in IndexedDB</ListItem>
      <ListItem>Access cached mind maps from the Graphics Library</ListItem>
      <ListItem>No additional API calls needed for cached maps</ListItem>
      <ListItem>Cache persists across browser sessions</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="5">Best Use Cases</SectionTitle>
    <List>
      <ListItem>Bill of Quantities (BOQ) documents</ListItem>
      <ListItem>Technical specifications</ListItem>
      <ListItem>Project reports with hierarchical structure</ListItem>
      <ListItem>Any document with clear sections and subsections</ListItem>
    </List>

    <InfoBox>
      Mind maps are cached locally. Once generated, you can access them instantly from the Graphics Library without using additional API calls.
    </InfoBox>
  </>
);

const NotebookFeature: React.FC = () => (
  <>
    <PageTitle>Notebook</PageTitle>
    <PageDescription>
      Your personal knowledge base for saving, organizing, and managing important AI responses and notes.
    </PageDescription>

    <TOC items={[
      'What is the Notebook?',
      'Saving Notes',
      'Organizing Notes',
      'View Modes',
      'Search and Filter',
      'Editing Notes',
      'Multi-Select & Batch Operations',
      'Exporting Notes',
      'Navigation'
    ]} />

    <SectionTitle number="1">What is the Notebook?</SectionTitle>
    <Paragraph>
      The Notebook is your personal knowledge base where you can save, organize, and manage important AI responses and notes.
    </Paragraph>

    <SectionDivider />

    <SectionTitle number="2">Saving Notes</SectionTitle>
    <List>
      <ListItem>Click the bookmark icon on any AI message to save it</ListItem>
      <ListItem>Notes are automatically numbered (Note #1, #2, etc.)</ListItem>
      <ListItem>Saved messages appear with blue highlight in chat</ListItem>
      <ListItem>Each note includes the model used and timestamp</ListItem>
      <ListItem>Notes maintain links to their original chat conversation</ListItem>
      <ListItem>Change note styling in Settings (4 visual styles available)</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="3">Organizing Notes</SectionTitle>
    <List>
      <ListItem>Add titles to notes for easy identification</ListItem>
      <ListItem>Add tags to categorize notes by topic</ListItem>
      <ListItem>Assign categories for better organization</ListItem>
      <ListItem>Mark notes as favorites with the star icon</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="4">View Modes</SectionTitle>
    <Paragraph>
      Switch between different view modes:
    </Paragraph>
    <List>
      <ListItem>Grid View: Visual card layout with previews</ListItem>
      <ListItem>List View: Detailed list with full content</ListItem>
      <ListItem>Details View: Table format showing metadata</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="5">Search and Filter</SectionTitle>
    <List>
      <ListItem>Search notes by content, title, or tags</ListItem>
      <ListItem>Filter by category</ListItem>
      <ListItem>Sort by creation date, last modified, or model</ListItem>
      <ListItem>Toggle sort order (ascending/descending)</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="6">Editing Notes</SectionTitle>
    <List>
      <ListItem>Click any note to open the full editor in a modal</ListItem>
      <ListItem>Edit content and title directly in the large text area</ListItem>
      <ListItem>Changes are tracked with "Last Modified" timestamp</ListItem>
      <ListItem>Click Save to apply changes</ListItem>
      <ListItem>Modal shows note number, model, and creation date</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="7">Multi-Select & Batch Operations</SectionTitle>
    <List>
      <ListItem>Click checkboxes to select multiple notes</ListItem>
      <ListItem>Export selected notes as a ZIP file</ListItem>
      <ListItem>Use "Select All" to quickly select all visible notes</ListItem>
      <ListItem>Selected count shows in the header</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="8">Exporting Notes</SectionTitle>
    <List>
      <ListItem>Export individual notes as Markdown or Text</ListItem>
      <ListItem>Select multiple notes and export as ZIP</ListItem>
      <ListItem>Export all notes at once</ListItem>
      <ListItem>Copy note content to clipboard</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="9">Navigation</SectionTitle>
    <List>
      <ListItem>Click the external link icon to jump to the original conversation</ListItem>
      <ListItem>The chat will scroll to the exact message</ListItem>
      <ListItem>Message is highlighted briefly for easy identification</ListItem>
    </List>
  </>
);

const TodosFeature: React.FC = () => (
  <>
    <PageTitle>Tasks & Todos</PageTitle>
    <PageDescription>
      Track action items, to-dos, and follow-ups from your conversations with priorities, due dates, and subtasks.
    </PageDescription>

    <TOC items={[
      'What are Tasks?',
      'Creating Tasks',
      'Task Properties',
      'Managing Tasks',
      'Filtering and Sorting',
      'Time Indicators'
    ]} />

    <SectionTitle number="1">What are Tasks?</SectionTitle>
    <Paragraph>
      The Tasks feature helps you track action items, to-dos, and follow-ups from your conversations and work.
    </Paragraph>

    <SectionDivider />

    <SectionTitle number="2">Creating Tasks</SectionTitle>
    <List>
      <ListItem>Type your task in the input field at the top</ListItem>
      <ListItem>Press Enter or click Add to create</ListItem>
      <ListItem>Tasks are automatically timestamped</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="3">Task Properties</SectionTitle>
    <List>
      <ListItem>Priority: Set as Low, Medium, or High (shown as colored dots)</ListItem>
      <ListItem>Due Date: Set deadlines for time-sensitive tasks</ListItem>
      <ListItem>Completion Status: Check off completed tasks</ListItem>
      <ListItem>Subtasks: Break down complex tasks into smaller steps</ListItem>
      <ListItem>Categories: Organize tasks by project or type</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="4">Managing Tasks</SectionTitle>
    <List>
      <ListItem>Click the checkbox to mark tasks as complete</ListItem>
      <ListItem>Completed tasks show with strikethrough text</ListItem>
      <ListItem>Delete tasks by clicking the trash icon</ListItem>
      <ListItem>Hover over tasks to reveal action buttons</ListItem>
      <ListItem>Progress bars show completion percentage for tasks with subtasks</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="5">Filtering and Sorting</SectionTitle>
    <List>
      <ListItem>Filter: All, Active, or Completed tasks</ListItem>
      <ListItem>Sort by: Created date, Due date, or Priority</ListItem>
      <ListItem>High priority tasks show red dots</ListItem>
      <ListItem>Overdue tasks are highlighted in red</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="6">Time Indicators</SectionTitle>
    <List>
      <ListItem>Tasks show time remaining (e.g., "2d", "5h", "30m")</ListItem>
      <ListItem>Overdue tasks display "Overdue" badge</ListItem>
      <ListItem>Color-coded badges for quick status recognition</ListItem>
    </List>
  </>
);

const WebIntegration: React.FC = () => (
  <>
    <PageTitle>Web Integration</PageTitle>
    <PageDescription>
      Browse websites, import GitHub code, and add web pages as context for AI conversations.
    </PageDescription>

    <TOC items={[
      'Web Viewer',
      'GitHub Integration',
      'Web Sources'
    ]} />

    <SectionTitle number="1">Web Viewer</SectionTitle>
    <Paragraph>
      Browse websites directly within ConstructLM:
    </Paragraph>
    <List>
      <ListItem>Click the globe icon in the header to open the web viewer</ListItem>
      <ListItem>Multiple tabs supported - browse several sites at once</ListItem>
      <ListItem>Cookies persist across sessions</ListItem>
      <ListItem>Use for research while chatting with AI</ListItem>
      <ListItem>Copy content from web pages to chat</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="2">GitHub Integration</SectionTitle>
    <Paragraph>
      Import code directly from GitHub repositories:
    </Paragraph>
    <List>
      <ListItem>Enter any public GitHub repository URL</ListItem>
      <ListItem>Browse folders and files in the repository</ListItem>
      <ListItem>Switch between branches</ListItem>
      <ListItem>Select multiple files for batch import</ListItem>
      <ListItem>Smart import of README and config files</ListItem>
      <ListItem>AI can analyze and explain imported code</ListItem>
      <ListItem>Search through repository files</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="3">Web Sources</SectionTitle>
    <Paragraph>
      Add web pages as context for AI conversations:
    </Paragraph>
    <List>
      <ListItem>Click the link icon in the chat input</ListItem>
      <ListItem>Enter a URL to fetch and include in context</ListItem>
      <ListItem>The AI can reference content from added URLs</ListItem>
      <ListItem>Remove sources by clicking the X icon</ListItem>
      <ListItem>CORS proxy automatically handles restricted sites</ListItem>
    </List>
  </>
);

const WebSources: React.FC = () => (
  <>
    <PageTitle>Web Sources</PageTitle>
    <PageDescription>
      Fetch and analyze content from the web, giving your AI conversations access to live information, documentation, and online resources.
    </PageDescription>

    <TOC items={[
      'Adding Web URLs',
      'CORS Proxy',
      'Web Viewer',
      'GitHub Integration',
      'Best Use Cases'
    ]} />

    <SectionTitle number="1">Adding Web URLs</SectionTitle>
    <Paragraph>
      Include web pages as context for AI conversations:
    </Paragraph>
    <List>
      <ListItem>Click the link icon in the chat input area</ListItem>
      <ListItem>Enter any URL (articles, documentation, GitHub, etc.)</ListItem>
      <ListItem>The system fetches and processes the content</ListItem>
      <ListItem>AI can now reference the web content in responses</ListItem>
      <ListItem>Remove sources by clicking the X icon</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="2">CORS Proxy</SectionTitle>
    <Paragraph>
      ConstructLM automatically handles restricted websites:
    </Paragraph>
    <List>
      <ListItem>Automatic proxy rotation for blocked sites</ListItem>
      <ListItem>Handles CORS restrictions transparently</ListItem>
      <ListItem>Fetches content from sites that block direct access</ListItem>
      <ListItem>No configuration needed - works automatically</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="3">Web Viewer</SectionTitle>
    <Paragraph>
      Browse websites directly within ConstructLM:
    </Paragraph>
    <List>
      <ListItem>Click the globe icon in the header to open web viewer</ListItem>
      <ListItem>Multiple tabs supported - browse several sites at once</ListItem>
      <ListItem>Cookies persist across sessions</ListItem>
      <ListItem>Use for research while chatting with AI</ListItem>
      <ListItem>Copy content from web pages to chat</ListItem>
      <ListItem>Full browser functionality within the app</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="4">GitHub Integration</SectionTitle>
    <Paragraph>
      Import code directly from GitHub repositories:
    </Paragraph>
    <List>
      <ListItem>Enter any public GitHub repository URL</ListItem>
      <ListItem>Browse folders and files in the repository</ListItem>
      <ListItem>Switch between branches</ListItem>
      <ListItem>Select multiple files for batch import</ListItem>
      <ListItem>Smart import of README and config files</ListItem>
      <ListItem>AI can analyze and explain imported code</ListItem>
      <ListItem>Search through repository files</ListItem>
      <ListItem>Perfect for code review and documentation</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="5">Best Use Cases</SectionTitle>
    <List>
      <ListItem><strong>Research:</strong> Add technical articles and documentation as context</ListItem>
      <ListItem><strong>Code Analysis:</strong> Import GitHub repos for AI code review</ListItem>
      <ListItem><strong>Standards:</strong> Reference online specifications and standards</ListItem>
      <ListItem><strong>Comparison:</strong> Compare multiple web sources side-by-side</ListItem>
      <ListItem><strong>Learning:</strong> Use tutorials and guides as reference material</ListItem>
    </List>

    <InfoBox>
      Web sources are fetched once and cached. The AI can reference them across multiple conversations without re-fetching.
    </InfoBox>
  </>
);

const RemindersFeature: React.FC = () => (
  <>
    <PageTitle>Reminders</PageTitle>
    <PageDescription>
      Set time-based reminders with automatic notifications to remember important deadlines, meetings, and time-sensitive tasks.
    </PageDescription>

    <TOC items={[
      'What are Reminders?',
      'Creating Reminders',
      'Reminder Notifications',
      'Managing Active Reminders',
      'Reminder States',
      'Filtering',
      'Time Display'
    ]} />

    <SectionTitle number="1">What are Reminders?</SectionTitle>
    <Paragraph>
      Reminders help you remember important deadlines, meetings, and time-sensitive tasks with automatic notifications.
    </Paragraph>

    <SectionDivider />

    <SectionTitle number="2">Creating Reminders</SectionTitle>
    <List>
      <ListItem>Enter a reminder title in the input field</ListItem>
      <ListItem>Select date and time using the datetime picker</ListItem>
      <ListItem>Click Add to create the reminder</ListItem>
      <ListItem>Reminders must be set for future times</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="3">Reminder Notifications</SectionTitle>
    <List>
      <ListItem>System checks for due reminders every 10 seconds</ListItem>
      <ListItem>Toast notification appears when reminder triggers</ListItem>
      <ListItem>Audio notification plays (if browser allows)</ListItem>
      <ListItem>Reminder card pulses and highlights in red</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="4">Managing Active Reminders</SectionTitle>
    <List>
      <ListItem>Snooze: Postpone for 5 min, 15 min, or 1 hour</ListItem>
      <ListItem>Done: Mark as completed and dismiss</ListItem>
      <ListItem>Delete: Remove reminder permanently</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="5">Reminder States</SectionTitle>
    <List>
      <ListItem>Pending: Waiting for trigger time (blue badge)</ListItem>
      <ListItem>Triggered: Time has arrived (red badge, pulsing)</ListItem>
      <ListItem>Dismissed: Marked as done (grayed out)</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="6">Filtering</SectionTitle>
    <List>
      <ListItem>All: Show all reminders regardless of status</ListItem>
      <ListItem>Pending: Only upcoming reminders</ListItem>
      <ListItem>Triggered: Only active notifications</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="7">Time Display</SectionTitle>
    <List>
      <ListItem>Shows countdown: "in 2d", "in 5h", "in 30m"</ListItem>
      <ListItem>Urgent reminders (under 1 hour) show yellow badge</ListItem>
      <ListItem>Triggered reminders show "Now!" badge</ListItem>
    </List>
  </>
);

const LiveMode: React.FC = () => (
  <>
    <PageTitle>Live Mode</PageTitle>
    <PageDescription>
      Real-time voice conversations with Gemini AI. Speak naturally and receive audio responses for a conversational experience.
    </PageDescription>

    <TOC items={[
      'What is Live Mode?',
      'Starting a Live Session',
      'During a Live Session',
      'Tips for Best Results'
    ]} />

    <SectionTitle number="1">What is Live Mode?</SectionTitle>
    <Paragraph>
      Live Mode enables real-time voice conversations with Gemini AI. Speak naturally and receive audio responses, creating a conversational experience similar to talking with an assistant.
    </Paragraph>

    <InfoBox>
      Live Mode is only available in the browser version. It requires a Google Gemini API key and microphone access.
    </InfoBox>

    <SectionDivider />

    <SectionTitle number="2">Starting a Live Session</SectionTitle>
    <List>
      <ListItem>Click the phone icon in the header</ListItem>
      <ListItem>Grant microphone permissions when prompted</ListItem>
      <ListItem>Wait for the connection to establish</ListItem>
      <ListItem>Start speaking naturally</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="3">During a Live Session</SectionTitle>
    <List>
      <ListItem>Speak clearly into your microphone</ListItem>
      <ListItem>The AI responds with voice output</ListItem>
      <ListItem>Visual indicators show when you're speaking and when the AI is responding</ListItem>
      <ListItem>Click the mute button to temporarily disable your microphone</ListItem>
      <ListItem>Click the end call button to disconnect</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="4">Tips for Best Results</SectionTitle>
    <List>
      <ListItem>Use a quiet environment to minimize background noise</ListItem>
      <ListItem>Speak clearly and at a normal pace</ListItem>
      <ListItem>Wait for the AI to finish responding before speaking again</ListItem>
      <ListItem>Use headphones to prevent audio feedback</ListItem>
    </List>
  </>
);

const GraphicsLibrary: React.FC = () => (
  <>
    <PageTitle>Graphics Library</PageTitle>
    <PageDescription>
      Store and manage all your snapshots and generated mind maps in one centralized location.
    </PageDescription>

    <TOC items={[
      'What is the Graphics Library?',
      'Snapshots',
      'Mind Map Gallery'
    ]} />

    <SectionTitle number="1">What is the Graphics Library?</SectionTitle>
    <Paragraph>
      The Graphics Library stores all your snapshots and generated mind maps in one place. Access it by clicking the image icon in the header.
    </Paragraph>

    <SectionDivider />

    <SectionTitle number="2">Snapshots</SectionTitle>
    <Paragraph>
      Snapshots are screenshots of your chat conversations:
    </Paragraph>
    <List>
      <ListItem>Press Ctrl+Shift+S (or Cmd+Shift+S on Mac) to take a snapshot</ListItem>
      <ListItem>Click the camera icon in the header</ListItem>
      <ListItem>Snapshots capture the entire visible chat area</ListItem>
      <ListItem>Download snapshots as PNG images</ListItem>
      <ListItem>Copy snapshots to clipboard for quick sharing</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="3">Mind Map Gallery</SectionTitle>
    <Paragraph>
      All generated mind maps are automatically saved to the library:
    </Paragraph>
    <List>
      <ListItem>View thumbnails of all your mind maps</ListItem>
      <ListItem>Click to reopen any mind map instantly</ListItem>
      <ListItem>Delete mind maps you no longer need</ListItem>
      <ListItem>Mind maps are organized by file and model used</ListItem>
    </List>

    <InfoBox>
      All graphics are stored locally in your browser. They persist across sessions but are not synced between devices.
    </InfoBox>
  </>
);

const DataManagement: React.FC = () => (
  <>
    <PageTitle>Data Management</PageTitle>
    <PageDescription>
      Comprehensive tools to backup, restore, and manage your application data with export/import capabilities.
    </PageDescription>

    <TOC items={[
      'Overview',
      'Export Data',
      'What Gets Exported',
      'Import Data',
      'Clear All App Data',
      'Best Practices',
      'Troubleshooting'
    ]} />

    <SectionTitle number="1">Overview</SectionTitle>
    <Paragraph>
      ConstructLM provides comprehensive tools to backup, restore, and manage your application data. All features are accessible through the Settings menu.
    </Paragraph>

    <SectionDivider />

    <SectionTitle number="2">Export Data</SectionTitle>
    <Paragraph>
      Create a complete backup of all your ConstructLM data:
    </Paragraph>
    <List>
      <ListItem>Click Settings (gear icon) in the header</ListItem>
      <ListItem>Scroll to "Data Management" section</ListItem>
      <ListItem>Click "Export Data" button</ListItem>
      <ListItem>A ZIP file will be downloaded to your default Downloads folder</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="3">What Gets Exported</SectionTitle>
    <Paragraph>
      The export includes everything you need to restore your ConstructLM experience:
    </Paragraph>
    <List>
      <ListItem><strong>All Chat Conversations:</strong> Complete message history with timestamps</ListItem>
      <ListItem><strong>Mind Maps:</strong> All generated visualizations and their data</ListItem>
      <ListItem><strong>Snapshots:</strong> Screenshots with full image data</ListItem>
      <ListItem><strong>Settings:</strong> API keys, theme preferences, default model</ListItem>
      <ListItem><strong>Metadata:</strong> Export timestamp and version information</ListItem>
    </List>

    <InfoBox>
      Export files are named with the current date (e.g., "constructlm-backup-2024-01-15.zip") and saved to your system's default Downloads folder.
    </InfoBox>

    <SectionDivider />

    <SectionTitle number="4">Import Data</SectionTitle>
    <Paragraph>
      Restore your data from a previously exported backup:
    </Paragraph>
    <List>
      <ListItem>Click Settings → Data Management → "Import Data"</ListItem>
      <ListItem>Select your backup ZIP file</ListItem>
      <ListItem>Review the import confirmation dialog</ListItem>
      <ListItem>Click "Continue" to proceed with the import</ListItem>
      <ListItem>The app will automatically refresh after import</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="5">Clear All App Data</SectionTitle>
    <Paragraph>
      Reset ConstructLM to a completely fresh state:
    </Paragraph>
    <List>
      <ListItem>Click Settings → Data Management → "Clear All App Data" (red button)</ListItem>
      <ListItem>Confirm the first warning dialog</ListItem>
      <ListItem>Confirm the second "Are you absolutely sure?" dialog</ListItem>
      <ListItem>All data will be permanently deleted</ListItem>
      <ListItem>The app will refresh to a brand new state</ListItem>
    </List>

    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-white text-xs font-bold">!</span>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">Warning: Data Loss</h4>
          <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
            Clearing app data is permanent and cannot be undone. Export your data first if you want to keep a backup.
          </p>
        </div>
      </div>
    </div>

    <SectionDivider />

    <SectionTitle number="6">Best Practices</SectionTitle>
    <List>
      <ListItem><strong>Regular Backups:</strong> Export your data weekly or after important conversations</ListItem>
      <ListItem><strong>Before Updates:</strong> Always export before updating the application</ListItem>
      <ListItem><strong>Device Changes:</strong> Export from old device, import to new device</ListItem>
      <ListItem><strong>Storage Management:</strong> Use "Clear All Data" when storage space is low</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="7">Troubleshooting</SectionTitle>
    <Paragraph>
      Common issues and solutions:
    </Paragraph>
    <List>
      <ListItem><strong>Import Failed:</strong> Ensure the ZIP file is a valid ConstructLM export</ListItem>
      <ListItem><strong>Large Export:</strong> Exports with many snapshots may take longer to generate</ListItem>
      <ListItem><strong>Browser Storage Full:</strong> Clear app data or use browser storage management</ListItem>
      <ListItem><strong>Missing Data:</strong> Check that the export was created successfully before importing</ListItem>
    </List>
  </>
);

const KeyboardShortcuts: React.FC = () => (
  <>
    <PageTitle>Keyboard Shortcuts</PageTitle>
    <PageDescription>
      Speed up your workflow with keyboard shortcuts for common actions and navigation.
    </PageDescription>

    <TOC items={[
      'Chat Input',
      'Application',
      'Context Menus'
    ]} />

    <SectionTitle number="1">Chat Input</SectionTitle>
    <List>
      <ListItem>Enter: Send message</ListItem>
      <ListItem>Shift+Enter: New line</ListItem>
      <ListItem>@: Open file mention menu</ListItem>
      <ListItem>Arrow Up/Down: Navigate mention menu</ListItem>
      <ListItem>Escape: Close mention menu</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="2">Application</SectionTitle>
    <List>
      <ListItem>Ctrl+Shift+S (Cmd+Shift+S): Take snapshot</ListItem>
      <ListItem>Escape: Close modals and menus</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="3">Context Menus</SectionTitle>
    <Paragraph>
      Right-click on various elements to access context-specific actions:
    </Paragraph>
    <List>
      <ListItem>Chat input: Cut, copy, paste, select all</ListItem>
      <ListItem>Messages: Copy message text</ListItem>
    </List>
  </>
);

const Configuration: React.FC = () => (
  <>
    <PageTitle>Configuration</PageTitle>
    <PageDescription>
      Configure API keys, personalize your experience, and manage application settings.
    </PageDescription>

    <TOC items={[
      'User Profile',
      'Note Style',
      'API Keys',
      'Getting API Keys',
      'Theme',
      'Data Management',
      'Local Models (Ollama)',
      'Activity Logging',
      'Data Storage'
    ]} />

    <SectionTitle number="1">User Profile</SectionTitle>
    <Paragraph>
      Personalize your experience with smart greetings:
    </Paragraph>
    <List>
      <ListItem>Set your name for personalized greetings</ListItem>
      <ListItem>Add your role (e.g., Developer, Designer, Engineer)</ListItem>
      <ListItem>Choose greeting style: Professional, Casual, or Minimal</ListItem>
      <ListItem>AI adapts greetings based on time of day and usage patterns</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="2">Note Style</SectionTitle>
    <Paragraph>
      Choose how saved notes appear in your chat:
    </Paragraph>
    <List>
      <ListItem><strong>Highlight BG:</strong> Blue background tint (default)</ListItem>
      <ListItem><strong>Left Border:</strong> Blue vertical line on the left side</ListItem>
      <ListItem><strong>Glow Effect:</strong> Subtle shadow around the message</ListItem>
      <ListItem><strong>Corner Badge:</strong> Note number badge in top-right corner</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="3">API Keys</SectionTitle>
    <Paragraph>
      ConstructLM requires API keys to communicate with AI models. Configure them in Settings:
    </Paragraph>
    <List>
      <ListItem>Click the gear icon in the header</ListItem>
      <ListItem>Enter your API keys for each provider</ListItem>
      <ListItem>Click "Test Connection" to verify each key</ListItem>
      <ListItem>Click "Save & Apply" to store your configuration</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="4">Getting API Keys</SectionTitle>
    <Paragraph>
      Google Gemini (Free tier available):
    </Paragraph>
    <List>
      <ListItem>Visit ai.google.dev</ListItem>
      <ListItem>Sign in with your Google account</ListItem>
      <ListItem>Navigate to "Get API Key"</ListItem>
      <ListItem>Create a new API key</ListItem>
    </List>

    <Paragraph>
      Groq (Free tier available):
    </Paragraph>
    <List>
      <ListItem>Visit console.groq.com</ListItem>
      <ListItem>Create an account</ListItem>
      <ListItem>Generate an API key from the dashboard</ListItem>
    </List>

    <Paragraph>
      OpenAI (Paid only):
    </Paragraph>
    <List>
      <ListItem>Visit platform.openai.com</ListItem>
      <ListItem>Create an account and add payment method</ListItem>
      <ListItem>Generate an API key from API settings</ListItem>
    </List>

    <Paragraph>
      AWS Bedrock (Paid, requires AWS account):
    </Paragraph>
    <List>
      <ListItem>Visit console.aws.amazon.com</ListItem>
      <ListItem>Enable Bedrock service in your region</ListItem>
      <ListItem>Create IAM user with Bedrock permissions</ListItem>
      <ListItem>Generate Access Key ID and Secret Access Key</ListItem>
      <ListItem>Enter both keys in Settings</ListItem>
    </List>

    <InfoBox>
      API keys are stored locally in your browser's local storage. They are never sent to any server except the respective AI provider when making requests.
    </InfoBox>

    <SectionDivider />

    <SectionTitle number="5">Theme</SectionTitle>
    <Paragraph>
      Toggle between light and dark mode using the sun/moon icon in the header. Your preference is saved automatically.
    </Paragraph>

    <SectionDivider />

    <SectionTitle number="6">Data Management</SectionTitle>
    <Paragraph>
      ConstructLM provides comprehensive data backup and management tools:
    </Paragraph>
    <List>
      <ListItem><strong>Export Data:</strong> Create a complete backup ZIP file containing all your chats, mind maps, snapshots, and settings</ListItem>
      <ListItem><strong>Import Data:</strong> Restore from a previously exported ZIP file to recover all your data</ListItem>
      <ListItem><strong>Clear All Data:</strong> Reset the app to a brand new state by permanently deleting all stored data</ListItem>
    </List>

    <InfoBox>
      Export your data regularly to prevent loss. The export includes everything: conversations, generated mind maps, screenshots, and all your settings.
    </InfoBox>

    <SectionDivider />

    <SectionTitle number="7">Local Models (Ollama)</SectionTitle>
    <Paragraph>
      Run AI models offline on your computer:
    </Paragraph>
    <List>
      <ListItem>Download and install Ollama from ollama.ai</ListItem>
      <ListItem>Pull models like Code Llama, Mistral, or Llama 3</ListItem>
      <ListItem>Click "Test Connection" in Settings to verify Ollama is running</ListItem>
      <ListItem>Select local models from the model dropdown</ListItem>
      <ListItem>No API keys needed - runs completely offline</ListItem>
      <ListItem>Great for when you hit API quota limits</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="8">Activity Logging</SectionTitle>
    <Paragraph>
      Track your usage and monitor performance:
    </Paragraph>
    <List>
      <ListItem>View detailed logs of all API calls and file operations</ListItem>
      <ListItem>Monitor token usage per conversation</ListItem>
      <ListItem>Track which models you use most</ListItem>
      <ListItem>Debug issues with detailed error logs</ListItem>
      <ListItem>Export logs for analysis</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="9">Data Storage</SectionTitle>
    <Paragraph>
      All data is stored locally in your browser:
    </Paragraph>
    <List>
      <ListItem>API keys: Browser local storage</ListItem>
      <ListItem>Chat history: Browser local storage</ListItem>
      <ListItem>User folders: Browser local storage</ListItem>
      <ListItem>Uploaded files: IndexedDB (persists across sessions)</ListItem>
      <ListItem>Mind maps: IndexedDB</ListItem>
      <ListItem>Snapshots: IndexedDB</ListItem>
      <ListItem>Notes: Browser local storage</ListItem>
      <ListItem>Todos & Reminders: Browser local storage</ListItem>
    </List>
  </>
);

const SupportFeedback: React.FC = () => (
  <>
    <PageTitle>Support & Feedback</PageTitle>
    <PageDescription>
      Get help, report bugs, request features, and contribute to making ConstructLM better.
    </PageDescription>

    <TOC items={[
      'Download & Updates',
      'Report a Bug',
      'Request a Feature',
      'Contact Information',
      'Contributing'
    ]} />

    <Paragraph>
      ConstructLM is actively developed and we value your feedback. Here's how you can get help or contribute to making the app better.
    </Paragraph>

    <SectionTitle number="1">Download & Updates</SectionTitle>
    <InfoBox>
      ConstructLM is available for download at: <strong>https://mimevents.com/</strong>
      <br />Check this page regularly for the latest updates and new features.
    </InfoBox>

    <SectionDivider />

    <SectionTitle number="2">Report a Bug</SectionTitle>
    <Paragraph>
      Found an issue? Help us fix it by reporting bugs:
    </Paragraph>
    <List>
      <ListItem>Email us at: <strong>mshk@mimevents.com</strong></ListItem>
      <ListItem>Include your operating system and browser version</ListItem>
      <ListItem>Describe the steps to reproduce the issue</ListItem>
      <ListItem>Attach screenshots if helpful</ListItem>
      <ListItem>Mention which AI model you were using when the issue occurred</ListItem>
    </List>

    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <Bug size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">Bug Report Template</h4>
          <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
            Subject: [Bug] Brief description<br />
            OS: Windows/Mac/Linux<br />
            Browser: Chrome/Firefox/Safari + version<br />
            Steps: 1. Do this, 2. Then this, 3. Bug occurs<br />
            Expected: What should happen<br />
            Actual: What actually happened
          </p>
        </div>
      </div>
    </div>

    <SectionDivider />

    <SectionTitle number="3">Request a Feature</SectionTitle>
    <Paragraph>
      Have an idea for a new feature or improvement? We'd love to hear it:
    </Paragraph>
    <List>
      <ListItem>Email us at: <strong>mshk@mimevents.com</strong></ListItem>
      <ListItem>Describe the feature and how it would help you</ListItem>
      <ListItem>Explain your current workflow and how this would improve it</ListItem>
      <ListItem>Include mockups or examples if you have them</ListItem>
      <ListItem>Let us know if this is for construction/engineering use cases</ListItem>
    </List>

    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <Lightbulb size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">Feature Request Template</h4>
          <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
            Subject: [Feature] Brief description<br />
            Problem: What challenge are you trying to solve?<br />
            Solution: How would this feature help?<br />
            Use Case: Describe your workflow<br />
            Priority: How important is this to you?
          </p>
        </div>
      </div>
    </div>

    <SectionDivider />

    <SectionTitle number="4">Contact Information</SectionTitle>
    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-3 mb-3">
        <Mail size={20} className="text-gray-600 dark:text-gray-400" />
        <div>
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Developer Contact</h4>
          <p className="text-xs text-gray-600 dark:text-gray-400">For bugs, features, and general support</p>
        </div>
      </div>
      <div className="text-sm">
        <p className="text-gray-800 dark:text-gray-200 font-medium">Email: mshk@mimevents.com</p>
        <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">Response time: Usually within 24-48 hours</p>
      </div>
    </div>

    <SectionDivider />

    <SectionTitle number="5">Contributing</SectionTitle>
    <Paragraph>
      ConstructLM is designed specifically for construction and engineering professionals. Your feedback helps us:
    </Paragraph>
    <List>
      <ListItem>Prioritize features that matter most to your workflow</ListItem>
      <ListItem>Fix bugs that impact productivity</ListItem>
      <ListItem>Improve document parsing for construction file formats</ListItem>
      <ListItem>Enhance AI responses for technical queries</ListItem>
      <ListItem>Add integrations with industry-standard tools</ListItem>
    </List>

    <InfoBox>
      Thank you for using ConstructLM! Your feedback drives our development and helps us build better tools for the construction industry.
    </InfoBox>
  </>
);

export default HelpDocumentation;
