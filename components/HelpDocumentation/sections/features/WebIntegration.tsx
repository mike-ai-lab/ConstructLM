import React from 'react';
import { PageTitle, PageDescription, TOC, SectionTitle, SectionDivider, Paragraph, List, ListItem } from '../../SharedComponents';

export const WebIntegration: React.FC = () => (
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
