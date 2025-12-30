import React from 'react';
import { PageTitle, PageDescription, TOC, SectionTitle, SectionDivider, Paragraph, List, ListItem } from '../../SharedComponents';

export const KeyboardShortcuts: React.FC = () => (
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
