import React from 'react';
import { PageTitle, PageDescription, TOC, SectionTitle, SectionDivider, Paragraph, List, ListItem, InfoBox } from '../../SharedComponents';

export const GraphicsLibrary: React.FC = () => (
  <>
    <PageTitle>Graphics Library</PageTitle>
    <PageDescription>
      Store and manage all your snapshots and generated mind maps in one centralized location.
    </PageDescription>

    <TOC items={[
      'What is the Graphics Library?',
      'Snapshots',
      'Mind Map Gallery'
    ]} />

    <SectionTitle number="1">What is the Graphics Library?</SectionTitle>
    <Paragraph>
      The Graphics Library stores all your snapshots and generated mind maps in one place. Access it by clicking the image icon in the header.
    </Paragraph>

    <SectionDivider />

    <SectionTitle number="2">Snapshots</SectionTitle>
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

    <SectionDivider />

    <SectionTitle number="3">Mind Map Gallery</SectionTitle>
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
