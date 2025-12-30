import React from 'react';
import { PageTitle, PageDescription, TOC, SectionTitle, SectionDivider, Paragraph, FeatureTitle, List, ListItem, InfoBox } from '../../SharedComponents';

export const DocumentSources: React.FC = () => (
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
