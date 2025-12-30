import React, { useState } from 'react';
import { X, FileText, MessageSquare, Sparkles, Keyboard, Settings, Network, Image, Phone, Search, Database, ExternalLink } from 'lucide-react';
import { DOCUMENTATION_KB } from '../../data/documentationKB';
import ReactMarkdown from 'react-markdown';

// Import section components
import { GettingStarted, HowItWorks } from './sections/basics';
import { DocumentSources, WebSources } from './sections/sources';
import { ChatFeatures, NotebookFeature, TodosFeature, RemindersFeature, MindMaps, WebIntegration, LiveMode, GraphicsLibrary } from './sections/features';
import { DataManagement, KeyboardShortcuts, Configuration, SupportFeedback } from './sections/advanced';

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
        if (unit.keywords.includes(word)) score += 5;
        else if (unit.keywords.some(kw => kw.includes(word) || word.includes(kw))) score += 2;
        if (unit.content.toLowerCase().includes(word)) score += 1;
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
      const { sendMessageToLLM } = await import('../../services/llmService');
      
      const relevantUnits = searchKnowledgeBase(message, 3);
      const context = relevantUnits.map(u => `${u.title}:\n${u.content}`).join('\n\n');
      
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
    { id: 'support', title: 'Support & Feedback', icon: Settings, category: 'Advanced' },
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

export default HelpDocumentation;
