import React from 'react';
import { PageTitle, PageDescription, TOC, SectionTitle, SectionDivider, Paragraph, List, ListItem, InfoBox } from '../../SharedComponents';

export const WebSources: React.FC = () => (
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
