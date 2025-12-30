import React from 'react';
import { PageTitle, PageDescription, TOC, SectionTitle, SectionDivider, Paragraph, List, ListItem, InfoBox } from '../../SharedComponents';

export const MindMaps: React.FC = () => (
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
