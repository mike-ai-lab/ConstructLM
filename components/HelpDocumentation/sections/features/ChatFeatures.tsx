import React from 'react';
import { PageTitle, PageDescription, TOC, SectionTitle, SectionDivider, Paragraph, FeatureTitle, List, ListItem, InfoBox } from '../../SharedComponents';

export const ChatFeatures: React.FC = () => (
  <>
    <PageTitle>Chat Features</PageTitle>
    <PageDescription>
      Powerful chat capabilities with message controls, highlighting, drawing tools, and multi-model support.
    </PageDescription>

    <TOC items={[
      'Message Controls',
      'Alternative Outputs',
      'Text Highlighter',
      'Drawing Tools',
      'Multiple Conversations',
      'Model Selection',
      'Citations',
      'Save to Notebook',
      'Note Styling',
      'Voice Input',
      'Web Sources'
    ]} />

    <SectionTitle number="1">Message Controls</SectionTitle>
    <Paragraph>
      Every AI message has powerful controls:
    </Paragraph>
    <List>
      <ListItem><strong>Read Aloud:</strong> Click the speaker icon to hear the AI response with text-to-speech</ListItem>
      <ListItem><strong>Regenerate:</strong> Click the refresh icon to get a new response to the same question</ListItem>
      <ListItem><strong>Delete:</strong> Remove messages from the conversation</ListItem>
      <ListItem><strong>Save to Notebook:</strong> Bookmark important responses for later reference</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="2">Alternative Outputs</SectionTitle>
    <Paragraph>
      When you regenerate a response, you can view all variations:
    </Paragraph>
    <List>
      <ListItem>Use left/right arrows to navigate between different AI responses</ListItem>
      <ListItem>Shows "1 of 3" indicator when multiple outputs exist</ListItem>
      <ListItem>Each output is saved and can be revisited</ListItem>
      <ListItem>Useful for comparing different AI perspectives</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="3">Text Highlighter</SectionTitle>
    <Paragraph>
      Mark important parts of AI responses with colored highlights:
    </Paragraph>
    <List>
      <ListItem>Right-click on any AI message and select "Highlight Text"</ListItem>
      <ListItem>A floating toolbar appears with 5 color options</ListItem>
      <ListItem>Select text to highlight it with your chosen color</ListItem>
      <ListItem>Click highlighted text to remove the highlight</ListItem>
      <ListItem>Use Undo/Redo buttons to manage your highlights</ListItem>
      <ListItem>Drag the toolbar to reposition it anywhere on screen</ListItem>
      <ListItem>Click the checkmark to exit highlight mode</ListItem>
      <ListItem>Click the trash icon to clear all highlights from the message</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="4">Drawing Tools</SectionTitle>
    <Paragraph>
      Draw annotations directly on your screen over any content:
    </Paragraph>
    <FeatureTitle>Accessing Drawing Mode</FeatureTitle>
    <List>
      <ListItem>Right-click on any AI message and select "Draw on Screen"</ListItem>
      <ListItem>A floating toolbar appears with drawing tools</ListItem>
      <ListItem>Drag the toolbar to move it out of your way</ListItem>
    </List>
    <FeatureTitle>Available Tools</FeatureTitle>
    <List>
      <ListItem><strong>Pen:</strong> Draw freehand - circles and rectangles are auto-detected</ListItem>
      <ListItem><strong>Rectangle:</strong> Click and drag to draw perfect rectangles</ListItem>
      <ListItem><strong>Circle:</strong> Click and drag to draw perfect circles</ListItem>
      <ListItem><strong>Arrow:</strong> Click and drag to draw arrows pointing in any direction</ListItem>
    </List>
    <FeatureTitle>Customization</FeatureTitle>
    <List>
      <ListItem>Choose from 5 colors for your drawings</ListItem>
      <ListItem>Adjust stroke width with +/- buttons</ListItem>
      <ListItem>Click checkmark when done to exit drawing mode</ListItem>
      <ListItem>Click trash icon to clear all drawings</ListItem>
    </List>
    <InfoBox>
      Tip: With the Pen tool, draw a straight line and add a quick zigzag at the end to create an arrow automatically!
    </InfoBox>

    <SectionDivider />

    <SectionTitle number="5">Multiple Conversations</SectionTitle>
    <List>
      <ListItem>Click the plus icon in the header to create a new chat</ListItem>
      <ListItem>Switch between chats using the Chats tab in the sidebar</ListItem>
      <ListItem>Each chat maintains its own conversation history</ListItem>
      <ListItem>Chats are automatically saved to your browser's local storage</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="6">Model Selection</SectionTitle>
    <List>
      <ListItem>Google Gemini: Fast, supports large contexts and images (Free tier available)</ListItem>
      <ListItem>Groq Llama: Extremely fast inference, great for quick tasks (Free tier available)</ListItem>
      <ListItem>OpenAI GPT: Industry-standard intelligence (requires paid account)</ListItem>
      <ListItem>AWS Bedrock: Claude 3.5 Sonnet, Haiku, Llama 3, Mistral (requires AWS account)</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="7">Citations</SectionTitle>
    <Paragraph>
      When the AI references your documents, clickable citations appear in the response. Click any citation to view the exact location in the source document.
    </Paragraph>

    <SectionDivider />

    <SectionTitle number="8">Save to Notebook</SectionTitle>
    <Paragraph>
      Save important AI responses with visual styling:
    </Paragraph>
    <List>
      <ListItem>Click the bookmark icon on any AI message to save it</ListItem>
      <ListItem>Saved notes are numbered automatically (Note #1, #2, etc.)</ListItem>
      <ListItem>Saved messages get a blue highlight background by default</ListItem>
      <ListItem>Access all saved notes from the Notebook tab in the header</ListItem>
      <ListItem>Click the bookmark icon again to unsave</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="9">Note Styling</SectionTitle>
    <Paragraph>
      Customize how saved notes appear in chat (Settings → Note Style):
    </Paragraph>
    <List>
      <ListItem><strong>Highlight BG (Default):</strong> Blue background tint</ListItem>
      <ListItem><strong>Left Border:</strong> Blue vertical line on the left</ListItem>
      <ListItem><strong>Glow Effect:</strong> Subtle shadow around the message</ListItem>
      <ListItem><strong>Corner Badge:</strong> Note number badge in top-right corner</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="10">Voice Input</SectionTitle>
    <List>
      <ListItem>Click the microphone icon in the chat input</ListItem>
      <ListItem>Speak your message clearly</ListItem>
      <ListItem>Click again to stop recording and transcribe</ListItem>
      <ListItem>Edit the transcribed text before sending</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="11">Web Sources</SectionTitle>
    <List>
      <ListItem>Click the link icon in the chat input</ListItem>
      <ListItem>Enter a URL to fetch and include in context</ListItem>
      <ListItem>The AI can reference content from added URLs</ListItem>
      <ListItem>Remove sources by clicking the X icon</ListItem>
    </List>
  </>
);
