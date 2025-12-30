import React from 'react';
import { PageTitle, PageDescription, TOC, SectionTitle, SectionDivider, Paragraph, List, ListItem, InfoBox } from '../../SharedComponents';

export const HowItWorks: React.FC = () => (
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
