import React from 'react';
import { PageTitle, PageDescription, TOC, SectionTitle, SectionDivider, Paragraph, List, ListItem, InfoBox } from '../../SharedComponents';

export const LiveMode: React.FC = () => (
  <>
    <PageTitle>Live Mode</PageTitle>
    <PageDescription>
      Real-time voice conversations with Gemini AI. Speak naturally and receive audio responses for a conversational experience.
    </PageDescription>

    <TOC items={[
      'What is Live Mode?',
      'Starting a Live Session',
      'During a Live Session',
      'Tips for Best Results'
    ]} />

    <SectionTitle number="1">What is Live Mode?</SectionTitle>
    <Paragraph>
      Live Mode enables real-time voice conversations with Gemini AI. Speak naturally and receive audio responses, creating a conversational experience similar to talking with an assistant.
    </Paragraph>

    <InfoBox>
      Live Mode is only available in the browser version. It requires a Google Gemini API key and microphone access.
    </InfoBox>

    <SectionDivider />

    <SectionTitle number="2">Starting a Live Session</SectionTitle>
    <List>
      <ListItem>Click the phone icon in the header</ListItem>
      <ListItem>Grant microphone permissions when prompted</ListItem>
      <ListItem>Wait for the connection to establish</ListItem>
      <ListItem>Start speaking naturally</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="3">During a Live Session</SectionTitle>
    <List>
      <ListItem>Speak clearly into your microphone</ListItem>
      <ListItem>The AI responds with voice output</ListItem>
      <ListItem>Visual indicators show when you're speaking and when the AI is responding</ListItem>
      <ListItem>Click the mute button to temporarily disable your microphone</ListItem>
      <ListItem>Click the end call button to disconnect</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="4">Tips for Best Results</SectionTitle>
    <List>
      <ListItem>Use a quiet environment to minimize background noise</ListItem>
      <ListItem>Speak clearly and at a normal pace</ListItem>
      <ListItem>Wait for the AI to finish responding before speaking again</ListItem>
      <ListItem>Use headphones to prevent audio feedback</ListItem>
    </List>
  </>
);
