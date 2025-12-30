import React from 'react';
import { PageTitle, PageDescription, TOC, SectionTitle, SectionDivider, Paragraph, List, ListItem, InfoBox } from '../../SharedComponents';

export const Configuration: React.FC = () => (
  <>
    <PageTitle>Configuration</PageTitle>
    <PageDescription>
      Configure API keys, personalize your experience, and manage application settings.
    </PageDescription>

    <TOC items={[
      'User Profile',
      'Note Style',
      'API Keys',
      'Getting API Keys',
      'Theme',
      'Data Management',
      'Local Models (Ollama)',
      'Activity Logging',
      'Data Storage'
    ]} />

    <SectionTitle number="1">User Profile</SectionTitle>
    <Paragraph>
      Personalize your experience with smart greetings:
    </Paragraph>
    <List>
      <ListItem>Set your name for personalized greetings</ListItem>
      <ListItem>Add your role (e.g., Developer, Designer, Engineer)</ListItem>
      <ListItem>Choose greeting style: Professional, Casual, or Minimal</ListItem>
      <ListItem>AI adapts greetings based on time of day and usage patterns</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="2">Note Style</SectionTitle>
    <Paragraph>
      Choose how saved notes appear in your chat:
    </Paragraph>
    <List>
      <ListItem><strong>Highlight BG:</strong> Blue background tint (default)</ListItem>
      <ListItem><strong>Left Border:</strong> Blue vertical line on the left side</ListItem>
      <ListItem><strong>Glow Effect:</strong> Subtle shadow around the message</ListItem>
      <ListItem><strong>Corner Badge:</strong> Note number badge in top-right corner</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="3">API Keys</SectionTitle>
    <Paragraph>
      ConstructLM requires API keys to communicate with AI models. Configure them in Settings:
    </Paragraph>
    <List>
      <ListItem>Click the gear icon in the header</ListItem>
      <ListItem>Enter your API keys for each provider</ListItem>
      <ListItem>Click "Test Connection" to verify each key</ListItem>
      <ListItem>Click "Save & Apply" to store your configuration</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="4">Getting API Keys</SectionTitle>
    <Paragraph>
      Google Gemini (Free tier available):
    </Paragraph>
    <List>
      <ListItem>Visit ai.google.dev</ListItem>
      <ListItem>Sign in with your Google account</ListItem>
      <ListItem>Navigate to "Get API Key"</ListItem>
      <ListItem>Create a new API key</ListItem>
    </List>

    <Paragraph>
      Groq (Free tier available):
    </Paragraph>
    <List>
      <ListItem>Visit console.groq.com</ListItem>
      <ListItem>Create an account</ListItem>
      <ListItem>Generate an API key from the dashboard</ListItem>
    </List>

    <Paragraph>
      OpenAI (Paid only):
    </Paragraph>
    <List>
      <ListItem>Visit platform.openai.com</ListItem>
      <ListItem>Create an account and add payment method</ListItem>
      <ListItem>Generate an API key from API settings</ListItem>
    </List>

    <Paragraph>
      AWS Bedrock (Paid, requires AWS account):
    </Paragraph>
    <List>
      <ListItem>Visit console.aws.amazon.com</ListItem>
      <ListItem>Enable Bedrock service in your region</ListItem>
      <ListItem>Create IAM user with Bedrock permissions</ListItem>
      <ListItem>Generate Access Key ID and Secret Access Key</ListItem>
      <ListItem>Enter both keys in Settings</ListItem>
    </List>

    <InfoBox>
      API keys are stored locally in your browser's local storage. They are never sent to any server except the respective AI provider when making requests.
    </InfoBox>

    <SectionDivider />

    <SectionTitle number="5">Theme</SectionTitle>
    <Paragraph>
      Toggle between light and dark mode using the sun/moon icon in the header. Your preference is saved automatically.
    </Paragraph>

    <SectionDivider />

    <SectionTitle number="6">Data Management</SectionTitle>
    <Paragraph>
      ConstructLM provides comprehensive data backup and management tools:
    </Paragraph>
    <List>
      <ListItem><strong>Export Data:</strong> Create a complete backup ZIP file containing all your chats, mind maps, snapshots, and settings</ListItem>
      <ListItem><strong>Import Data:</strong> Restore from a previously exported ZIP file to recover all your data</ListItem>
      <ListItem><strong>Clear All Data:</strong> Reset the app to a brand new state by permanently deleting all stored data</ListItem>
    </List>

    <InfoBox>
      Export your data regularly to prevent loss. The export includes everything: conversations, generated mind maps, screenshots, and all your settings.
    </InfoBox>

    <SectionDivider />

    <SectionTitle number="7">Local Models (Ollama)</SectionTitle>
    <Paragraph>
      Run AI models offline on your computer:
    </Paragraph>
    <List>
      <ListItem>Download and install Ollama from ollama.ai</ListItem>
      <ListItem>Pull models like Code Llama, Mistral, or Llama 3</ListItem>
      <ListItem>Click "Test Connection" in Settings to verify Ollama is running</ListItem>
      <ListItem>Select local models from the model dropdown</ListItem>
      <ListItem>No API keys needed - runs completely offline</ListItem>
      <ListItem>Great for when you hit API quota limits</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="8">Activity Logging</SectionTitle>
    <Paragraph>
      Track your usage and monitor performance:
    </Paragraph>
    <List>
      <ListItem>View detailed logs of all API calls and file operations</ListItem>
      <ListItem>Monitor token usage per conversation</ListItem>
      <ListItem>Track which models you use most</ListItem>
      <ListItem>Debug issues with detailed error logs</ListItem>
      <ListItem>Export logs for analysis</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="9">Data Storage</SectionTitle>
    <Paragraph>
      All data is stored locally in your browser:
    </Paragraph>
    <List>
      <ListItem>API keys: Browser local storage</ListItem>
      <ListItem>Chat history: Browser local storage</ListItem>
      <ListItem>User folders: Browser local storage</ListItem>
      <ListItem>Uploaded files: IndexedDB (persists across sessions)</ListItem>
      <ListItem>Mind maps: IndexedDB</ListItem>
      <ListItem>Snapshots: IndexedDB</ListItem>
      <ListItem>Notes: Browser local storage</ListItem>
      <ListItem>Todos & Reminders: Browser local storage</ListItem>
    </List>
  </>
);
