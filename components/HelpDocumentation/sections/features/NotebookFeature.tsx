import React from 'react';
import { PageTitle, PageDescription, TOC, SectionTitle, SectionDivider, Paragraph, List, ListItem } from '../../SharedComponents';

export const NotebookFeature: React.FC = () => (
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
