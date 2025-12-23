import React, { useState } from 'react';
import { X, FileText, MessageSquare, Sparkles, Keyboard, Settings, Network, Image, Phone, ChevronRight, Search, Bug, Lightbulb, Mail, Database } from 'lucide-react';

interface HelpDocumentationProps {
  onClose: () => void;
}

const HelpDocumentation: React.FC<HelpDocumentationProps> = ({ onClose }) => {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');

  const sections = [
    { id: 'getting-started', title: 'Getting Started', icon: Sparkles },
    { id: 'sources', title: 'Managing Sources', icon: FileText },
    { id: 'chat', title: 'Chat Features', icon: MessageSquare },
    { id: 'notebook', title: 'Notebook', icon: FileText },
    { id: 'todos', title: 'Tasks & Todos', icon: MessageSquare },
    { id: 'reminders', title: 'Reminders', icon: MessageSquare },
    { id: 'mindmap', title: 'Mind Maps', icon: Network },
    { id: 'live', title: 'Live Mode', icon: Phone },
    { id: 'graphics', title: 'Graphics Library', icon: Image },
    { id: 'data', title: 'Data Management', icon: Database },
    { id: 'shortcuts', title: 'Keyboard Shortcuts', icon: Keyboard },
    { id: 'settings', title: 'Configuration', icon: Settings },
    { id: 'support', title: 'Support & Feedback', icon: Mail },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex bg-white dark:bg-[#1a1a1a]">
      {/* Sidebar */}
      <div className="w-64 border-r border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] flex flex-col">
        <div className="h-[65px] flex items-center justify-between px-4 border-b border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)]">
          <h2 className="text-sm font-semibold text-[#1a1a1a] dark:text-white">Documentation</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a] rounded-full">
            <X size={16} className="text-[#a0a0a0]" />
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
              className="w-full pl-8 pr-2.5 py-1.5 bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded-lg text-xs text-[#1a1a1a] dark:text-white focus:outline-none focus:ring-2 focus:ring-[rgba(68,133,209,0.2)]"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => {
                  setActiveSection(section.id);
                  // Smooth scroll to top of content
                  const contentArea = document.querySelector('.documentation-content');
                  if (contentArea) {
                    contentArea.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className={`documentation-nav-button w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                  activeSection === section.id
                    ? 'active bg-[rgba(68,133,209,0.1)] text-[#4485d1]'
                    : 'text-[#666666] dark:text-[#a0a0a0] hover:bg-[rgba(0,0,0,0.03)] dark:hover:bg-[#2a2a2a]'
                }`}
              >
                <Icon size={14} />
                <span>{section.title}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto documentation-content">
        <div className="max-w-3xl mx-auto px-8 py-8">
          <div className="documentation-section">
            {activeSection === 'getting-started' && <GettingStarted />}
            {activeSection === 'sources' && <ManagingSources />}
            {activeSection === 'chat' && <ChatFeatures />}
            {activeSection === 'notebook' && <NotebookFeature />}
            {activeSection === 'todos' && <TodosFeature />}
            {activeSection === 'reminders' && <RemindersFeature />}
            {activeSection === 'mindmap' && <MindMaps />}
            {activeSection === 'live' && <LiveMode />}
            {activeSection === 'graphics' && <GraphicsLibrary />}
            {activeSection === 'data' && <DataManagement />}
            {activeSection === 'shortcuts' && <KeyboardShortcuts />}
            {activeSection === 'settings' && <Configuration />}
            {activeSection === 'support' && <SupportFeedback />}
          </div>
        </div>
      </div>
    </div>
  );
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h1 className="text-2xl font-semibold text-[#1a1a1a] dark:text-white mb-6">{children}</h1>
);

const SubTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-lg font-semibold text-[#1a1a1a] dark:text-white mt-6 mb-3">{children}</h2>
);

const Paragraph: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-sm text-[#666666] dark:text-[#a0a0a0] leading-relaxed mb-4">{children}</p>
);

const List: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ul className="space-y-2 mb-4">{children}</ul>
);

const ListItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-2 text-sm text-[#666666] dark:text-[#a0a0a0]">
    <ChevronRight size={14} className="text-[#4485d1] flex-shrink-0 mt-0.5" />
    <span>{children}</span>
  </li>
);

const CodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-[rgba(0,0,0,0.03)] dark:bg-[#2a2a2a] border border-[rgba(0,0,0,0.15)] dark:border-[rgba(255,255,255,0.05)] rounded-lg p-3 mb-4">
    <code className="text-xs text-[#1a1a1a] dark:text-white font-mono">{children}</code>
  </div>
);

const InfoBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-[rgba(68,133,209,0.1)] border border-[rgba(68,133,209,0.2)] dark:border-[rgba(68,133,209,0.3)] rounded-lg p-3 mb-4">
    <p className="text-xs text-[#1a1a1a] dark:text-white leading-relaxed">{children}</p>
  </div>
);

const GettingStarted: React.FC = () => (
  <>
    <SectionTitle>Getting Started</SectionTitle>
    <Paragraph>
      ConstructLM is an AI-powered document analysis and chat application that helps you interact with your files using advanced language models.
    </Paragraph>

    <SubTitle>Quick Start</SubTitle>
    <List>
      <ListItem>Configure your API keys in Settings (click the gear icon in the header)</ListItem>
      <ListItem>Upload documents by clicking the plus icon in the Sources panel or drag files anywhere</ListItem>
      <ListItem>Type @ in the chat to mention files and include them in your conversation</ListItem>
      <ListItem>Select an AI model from the dropdown in the header</ListItem>
      <ListItem>Start chatting with your documents</ListItem>
    </List>

    <SubTitle>Supported File Types</SubTitle>
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

const ManagingSources: React.FC = () => (
  <>
    <SectionTitle>Managing Sources</SectionTitle>
    
    <SubTitle>Adding Files</SubTitle>
    <Paragraph>
      You can add files to your workspace in multiple ways:
    </Paragraph>
    <List>
      <ListItem>Click the plus icon in the Sources panel</ListItem>
      <ListItem>Drag and drop files anywhere in the application</ListItem>
      <ListItem>Drag files directly into the chat input field</ListItem>
      <ListItem>Upload entire folders using the folder icon</ListItem>
    </List>

    <SubTitle>Using Files in Chat</SubTitle>
    <Paragraph>
      Files must be explicitly mentioned using the @ symbol to be included in your conversation:
    </Paragraph>
    <List>
      <ListItem>Type @ in the chat input to see a list of available files</ListItem>
      <ListItem>Select a file from the dropdown or continue typing to filter</ListItem>
      <ListItem>You can mention multiple files in a single message</ListItem>
      <ListItem>Drag a file from the sidebar into the chat input to mention it</ListItem>
    </List>

    <InfoBox>
      The app shows token counts for each file. Most models support 30-50k tokens of context. If you exceed this limit, you'll receive a warning.
    </InfoBox>

    <SubTitle>File Actions</SubTitle>
    <Paragraph>
      Hover over any file in the Sources panel to access these actions:
    </Paragraph>
    <List>
      <ListItem>Preview: View the file content in a modal</ListItem>
      <ListItem>Mind Map: Generate an interactive visualization of the document structure</ListItem>
      <ListItem>Remove: Delete the file from your workspace</ListItem>
    </List>
  </>
);

const ChatFeatures: React.FC = () => (
  <>
    <SectionTitle>Chat Features</SectionTitle>

    <SubTitle>Multiple Conversations</SubTitle>
    <Paragraph>
      Manage multiple chat sessions simultaneously:
    </Paragraph>
    <List>
      <ListItem>Click the plus icon in the header to create a new chat</ListItem>
      <ListItem>Switch between chats using the Chats tab in the sidebar</ListItem>
      <ListItem>Each chat maintains its own conversation history</ListItem>
      <ListItem>Chats are automatically saved to your browser's local storage</ListItem>
    </List>

    <SubTitle>Model Selection</SubTitle>
    <Paragraph>
      Choose from multiple AI models based on your needs:
    </Paragraph>
    <List>
      <ListItem>Google Gemini: Fast, supports large contexts and images (Free tier available)</ListItem>
      <ListItem>Groq Llama: Extremely fast inference, great for quick tasks (Free tier available)</ListItem>
      <ListItem>OpenAI GPT: Industry-standard intelligence (requires paid account)</ListItem>
      <ListItem>AWS Bedrock: Claude 3.5 Sonnet, Haiku, Llama 3, Mistral (requires AWS account)</ListItem>
    </List>

    <SubTitle>Citations</SubTitle>
    <Paragraph>
      When the AI references your documents, clickable citations appear in the response. Click any citation to view the exact location in the source document.
    </Paragraph>

    <SubTitle>Save to Notebook</SubTitle>
    <Paragraph>
      Save important AI responses to your notebook:
    </Paragraph>
    <List>
      <ListItem>Click the bookmark icon on any AI message to save it</ListItem>
      <ListItem>Saved notes are numbered automatically (Note #1, #2, etc.)</ListItem>
      <ListItem>Access all saved notes from the Notebook tab in the header</ListItem>
      <ListItem>Click the bookmark icon again to unsave</ListItem>
    </List>

    <SubTitle>Drawing Tools</SubTitle>
    <Paragraph>
      Annotate your chat and documents with drawing tools:
    </Paragraph>
    <List>
      <ListItem>Highlighter: Mark important text passages</ListItem>
      <ListItem>Pen: Draw freehand annotations</ListItem>
      <ListItem>Color picker: Choose from multiple colors</ListItem>
      <ListItem>Stroke width: Adjust pen thickness</ListItem>
      <ListItem>Clear all: Remove all annotations</ListItem>
    </List>

    <SubTitle>Voice Input</SubTitle>
    <Paragraph>
      Use voice-to-text for hands-free input:
    </Paragraph>
    <List>
      <ListItem>Click the microphone icon in the chat input</ListItem>
      <ListItem>Speak your message clearly</ListItem>
      <ListItem>Click again to stop recording and transcribe</ListItem>
      <ListItem>Edit the transcribed text before sending</ListItem>
    </List>

    <SubTitle>Web Sources</SubTitle>
    <Paragraph>
      Add web pages as context for your conversations:
    </Paragraph>
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
    <SectionTitle>Mind Maps</SectionTitle>

    <SubTitle>What are Mind Maps?</SubTitle>
    <Paragraph>
      Mind maps are interactive visualizations that show the hierarchical structure of your documents. The AI analyzes your file and creates a tree diagram showing relationships between concepts.
    </Paragraph>

    <SubTitle>Generating Mind Maps</SubTitle>
    <List>
      <ListItem>Hover over any file in the Sources panel</ListItem>
      <ListItem>Click the Network icon (purple)</ListItem>
      <ListItem>Wait for the AI to analyze the document structure</ListItem>
      <ListItem>The mind map opens in fullscreen mode</ListItem>
    </List>

    <SubTitle>Interacting with Mind Maps</SubTitle>
    <List>
      <ListItem>Click nodes to expand or collapse branches</ListItem>
      <ListItem>Scroll to zoom in and out</ListItem>
      <ListItem>Drag to pan around the visualization</ListItem>
      <ListItem>Click the fullscreen button to toggle fullscreen mode</ListItem>
    </List>

    <SubTitle>Mind Map Cache</SubTitle>
    <List>
      <ListItem>Generated mind maps are cached locally in IndexedDB</ListItem>
      <ListItem>Access cached mind maps from the Graphics Library</ListItem>
      <ListItem>No additional API calls needed for cached maps</ListItem>
      <ListItem>Cache persists across browser sessions</ListItem>
    </List>

    <SubTitle>Best Use Cases</SubTitle>
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
    <SectionTitle>Notebook</SectionTitle>

    <SubTitle>What is the Notebook?</SubTitle>
    <Paragraph>
      The Notebook is your personal knowledge base where you can save, organize, and manage important AI responses and notes.
    </Paragraph>

    <SubTitle>Saving Notes</SubTitle>
    <List>
      <ListItem>Click the bookmark icon on any AI message to save it</ListItem>
      <ListItem>Notes are automatically numbered (Note #1, #2, etc.)</ListItem>
      <ListItem>Each note includes the model used and timestamp</ListItem>
      <ListItem>Notes maintain links to their original chat conversation</ListItem>
    </List>

    <SubTitle>Organizing Notes</SubTitle>
    <List>
      <ListItem>Add titles to notes for easy identification</ListItem>
      <ListItem>Add tags to categorize notes by topic</ListItem>
      <ListItem>Assign categories for better organization</ListItem>
      <ListItem>Mark notes as favorites with the star icon</ListItem>
    </List>

    <SubTitle>View Modes</SubTitle>
    <Paragraph>
      Switch between different view modes:
    </Paragraph>
    <List>
      <ListItem>Grid View: Visual card layout with previews</ListItem>
      <ListItem>List View: Detailed list with full content</ListItem>
      <ListItem>Details View: Table format showing metadata</ListItem>
    </List>

    <SubTitle>Search and Filter</SubTitle>
    <List>
      <ListItem>Search notes by content, title, or tags</ListItem>
      <ListItem>Filter by category</ListItem>
      <ListItem>Sort by creation date, last modified, or model</ListItem>
      <ListItem>Toggle sort order (ascending/descending)</ListItem>
    </List>

    <SubTitle>Editing Notes</SubTitle>
    <List>
      <ListItem>Click any note to open the full editor</ListItem>
      <ListItem>Edit content and title directly</ListItem>
      <ListItem>Changes are tracked with "Last Modified" timestamp</ListItem>
      <ListItem>Click Save to apply changes</ListItem>
    </List>

    <SubTitle>Exporting Notes</SubTitle>
    <List>
      <ListItem>Export individual notes as Markdown or Text</ListItem>
      <ListItem>Select multiple notes and export as ZIP</ListItem>
      <ListItem>Export all notes at once</ListItem>
      <ListItem>Copy note content to clipboard</ListItem>
    </List>

    <SubTitle>Navigation</SubTitle>
    <List>
      <ListItem>Click the external link icon to jump to the original conversation</ListItem>
      <ListItem>The chat will scroll to the exact message</ListItem>
      <ListItem>Message is highlighted briefly for easy identification</ListItem>
    </List>
  </>
);

const TodosFeature: React.FC = () => (
  <>
    <SectionTitle>Tasks & Todos</SectionTitle>

    <SubTitle>What are Tasks?</SubTitle>
    <Paragraph>
      The Tasks feature helps you track action items, to-dos, and follow-ups from your conversations and work.
    </Paragraph>

    <SubTitle>Creating Tasks</SubTitle>
    <List>
      <ListItem>Type your task in the input field at the top</ListItem>
      <ListItem>Press Enter or click Add to create</ListItem>
      <ListItem>Tasks are automatically timestamped</ListItem>
    </List>

    <SubTitle>Task Properties</SubTitle>
    <List>
      <ListItem>Priority: Set as Low, Medium, or High (shown as colored dots)</ListItem>
      <ListItem>Due Date: Set deadlines for time-sensitive tasks</ListItem>
      <ListItem>Completion Status: Check off completed tasks</ListItem>
    </List>

    <SubTitle>Managing Tasks</SubTitle>
    <List>
      <ListItem>Click the checkbox to mark tasks as complete</ListItem>
      <ListItem>Completed tasks show with strikethrough text</ListItem>
      <ListItem>Delete tasks by clicking the trash icon</ListItem>
      <ListItem>Hover over tasks to reveal action buttons</ListItem>
    </List>

    <SubTitle>Filtering and Sorting</SubTitle>
    <List>
      <ListItem>Filter: All, Active, or Completed tasks</ListItem>
      <ListItem>Sort by: Created date, Due date, or Priority</ListItem>
      <ListItem>High priority tasks show red dots</ListItem>
      <ListItem>Overdue tasks are highlighted in red</ListItem>
    </List>

    <SubTitle>Time Indicators</SubTitle>
    <List>
      <ListItem>Tasks show time remaining (e.g., "2d", "5h", "30m")</ListItem>
      <ListItem>Overdue tasks display "Overdue" badge</ListItem>
      <ListItem>Color-coded badges for quick status recognition</ListItem>
    </List>
  </>
);

const RemindersFeature: React.FC = () => (
  <>
    <SectionTitle>Reminders</SectionTitle>

    <SubTitle>What are Reminders?</SubTitle>
    <Paragraph>
      Reminders help you remember important deadlines, meetings, and time-sensitive tasks with automatic notifications.
    </Paragraph>

    <SubTitle>Creating Reminders</SubTitle>
    <List>
      <ListItem>Enter a reminder title in the input field</ListItem>
      <ListItem>Select date and time using the datetime picker</ListItem>
      <ListItem>Click Add to create the reminder</ListItem>
      <ListItem>Reminders must be set for future times</ListItem>
    </List>

    <SubTitle>Reminder Notifications</SubTitle>
    <List>
      <ListItem>System checks for due reminders every 10 seconds</ListItem>
      <ListItem>Toast notification appears when reminder triggers</ListItem>
      <ListItem>Audio notification plays (if browser allows)</ListItem>
      <ListItem>Reminder card pulses and highlights in red</ListItem>
    </List>

    <SubTitle>Managing Active Reminders</SubTitle>
    <List>
      <ListItem>Snooze: Postpone for 5 min, 15 min, or 1 hour</ListItem>
      <ListItem>Done: Mark as completed and dismiss</ListItem>
      <ListItem>Delete: Remove reminder permanently</ListItem>
    </List>

    <SubTitle>Reminder States</SubTitle>
    <List>
      <ListItem>Pending: Waiting for trigger time (blue badge)</ListItem>
      <ListItem>Triggered: Time has arrived (red badge, pulsing)</ListItem>
      <ListItem>Dismissed: Marked as done (grayed out)</ListItem>
    </List>

    <SubTitle>Filtering</SubTitle>
    <List>
      <ListItem>All: Show all reminders regardless of status</ListItem>
      <ListItem>Pending: Only upcoming reminders</ListItem>
      <ListItem>Triggered: Only active notifications</ListItem>
    </List>

    <SubTitle>Time Display</SubTitle>
    <List>
      <ListItem>Shows countdown: "in 2d", "in 5h", "in 30m"</ListItem>
      <ListItem>Urgent reminders (under 1 hour) show yellow badge</ListItem>
      <ListItem>Triggered reminders show "Now!" badge</ListItem>
    </List>
  </>
);

const LiveMode: React.FC = () => (
  <>
    <SectionTitle>Live Mode</SectionTitle>

    <SubTitle>What is Live Mode?</SubTitle>
    <Paragraph>
      Live Mode enables real-time voice conversations with Gemini AI. Speak naturally and receive audio responses, creating a conversational experience similar to talking with an assistant.
    </Paragraph>

    <InfoBox>
      Live Mode is only available in the browser version. It requires a Google Gemini API key and microphone access.
    </InfoBox>

    <SubTitle>Starting a Live Session</SubTitle>
    <List>
      <ListItem>Click the phone icon in the header</ListItem>
      <ListItem>Grant microphone permissions when prompted</ListItem>
      <ListItem>Wait for the connection to establish</ListItem>
      <ListItem>Start speaking naturally</ListItem>
    </List>

    <SubTitle>During a Live Session</SubTitle>
    <List>
      <ListItem>Speak clearly into your microphone</ListItem>
      <ListItem>The AI responds with voice output</ListItem>
      <ListItem>Visual indicators show when you're speaking and when the AI is responding</ListItem>
      <ListItem>Click the mute button to temporarily disable your microphone</ListItem>
      <ListItem>Click the end call button to disconnect</ListItem>
    </List>

    <SubTitle>Tips for Best Results</SubTitle>
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
    <SectionTitle>Graphics Library</SectionTitle>

    <SubTitle>What is the Graphics Library?</SubTitle>
    <Paragraph>
      The Graphics Library stores all your snapshots and generated mind maps in one place. Access it by clicking the image icon in the header.
    </Paragraph>

    <SubTitle>Snapshots</SubTitle>
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

    <SubTitle>Mind Map Gallery</SubTitle>
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
    <SectionTitle>Data Management</SectionTitle>

    <SubTitle>Overview</SubTitle>
    <Paragraph>
      ConstructLM provides comprehensive tools to backup, restore, and manage your application data. All features are accessible through the Settings menu.
    </Paragraph>

    <SubTitle>Export Data</SubTitle>
    <Paragraph>
      Create a complete backup of all your ConstructLM data:
    </Paragraph>
    <List>
      <ListItem>Click Settings (gear icon) in the header</ListItem>
      <ListItem>Scroll to "Data Management" section</ListItem>
      <ListItem>Click "Export Data" button</ListItem>
      <ListItem>A ZIP file will be downloaded to your default Downloads folder</ListItem>
    </List>

    <SubTitle>What Gets Exported</SubTitle>
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

    <SubTitle>Import Data</SubTitle>
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

    <SubTitle>Clear All App Data</SubTitle>
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

    <SubTitle>Best Practices</SubTitle>
    <List>
      <ListItem><strong>Regular Backups:</strong> Export your data weekly or after important conversations</ListItem>
      <ListItem><strong>Before Updates:</strong> Always export before updating the application</ListItem>
      <ListItem><strong>Device Changes:</strong> Export from old device, import to new device</ListItem>
      <ListItem><strong>Storage Management:</strong> Use "Clear All Data" when storage space is low</ListItem>
    </List>

    <SubTitle>Troubleshooting</SubTitle>
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
    <SectionTitle>Keyboard Shortcuts</SectionTitle>

    <SubTitle>Chat Input</SubTitle>
    <List>
      <ListItem>Enter: Send message</ListItem>
      <ListItem>Shift+Enter: New line</ListItem>
      <ListItem>@: Open file mention menu</ListItem>
      <ListItem>Arrow Up/Down: Navigate mention menu</ListItem>
      <ListItem>Escape: Close mention menu</ListItem>
    </List>

    <SubTitle>Application</SubTitle>
    <List>
      <ListItem>Ctrl+Shift+S (Cmd+Shift+S): Take snapshot</ListItem>
      <ListItem>Escape: Close modals and menus</ListItem>
    </List>

    <SubTitle>Context Menus</SubTitle>
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
    <SectionTitle>Configuration</SectionTitle>

    <SubTitle>API Keys</SubTitle>
    <Paragraph>
      ConstructLM requires API keys to communicate with AI models. Configure them in Settings:
    </Paragraph>
    <List>
      <ListItem>Click the gear icon in the header</ListItem>
      <ListItem>Enter your API keys for each provider</ListItem>
      <ListItem>Click "Test Connection" to verify each key</ListItem>
      <ListItem>Click "Save & Apply" to store your configuration</ListItem>
    </List>

    <SubTitle>Getting API Keys</SubTitle>
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

    <SubTitle>Theme</SubTitle>
    <Paragraph>
      Toggle between light and dark mode using the sun/moon icon in the header. Your preference is saved automatically.
    </Paragraph>

    <SubTitle>Data Management</SubTitle>
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

    <SubTitle>Data Storage</SubTitle>
    <Paragraph>
      All data is stored locally in your browser:
    </Paragraph>
    <List>
      <ListItem>API keys: Browser local storage</ListItem>
      <ListItem>Chat history: Browser local storage</ListItem>
      <ListItem>Uploaded files: Browser memory (cleared on refresh)</ListItem>
      <ListItem>Mind maps: IndexedDB</ListItem>
      <ListItem>Snapshots: IndexedDB</ListItem>
    </List>
  </>
);

const SupportFeedback: React.FC = () => (
  <>
    <SectionTitle>Support & Feedback</SectionTitle>

    <Paragraph>
      ConstructLM is actively developed and we value your feedback. Here's how you can get help or contribute to making the app better.
    </Paragraph>

    <SubTitle>Download & Updates</SubTitle>
    <InfoBox>
      ConstructLM is available for download at: <strong>https://mimevents.com/</strong>
      <br />Check this page regularly for the latest updates and new features.
    </InfoBox>

    <SubTitle>Report a Bug</SubTitle>
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

    <SubTitle>Request a Feature</SubTitle>
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

    <SubTitle>Contact Information</SubTitle>
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

    <SubTitle>Contributing</SubTitle>
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
