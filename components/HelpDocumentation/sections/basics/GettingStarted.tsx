import React from 'react';
import { PageTitle, PageDescription, TOC, SectionTitle, SectionDivider, List, ListItem, InfoBox } from '../../SharedComponents';

export const GettingStarted: React.FC = () => (
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
