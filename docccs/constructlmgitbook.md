# ConstructLM Documentation

ConstructLM is an AI-powered document analysis and chat application that helps you interact with your files using advanced language models.

---

### Table of Contents

*   [Getting Started](#getting-started)
*   [Managing Sources](#managing-sources)
*   [Chat Features](#chat-features)
*   [Notebook](#notebook)
*   [Tasks & Todos](#tasks--todos)
*   [Reminders](#reminders)
*   [Mind Maps](#mind-maps)
*   [Live Mode](#live-mode)
*   [Graphics Library](#graphics-library)
*   [Data Management](#data-management)
*   [Keyboard Shortcuts](#keyboard-shortcuts)
*   [Configuration](#configuration)
*   [Support & Feedback](#support--feedback)

---

# Getting Started

ConstructLM is an AI-powered document analysis and chat application that helps you interact with your files using advanced language models.

## Quick Start

*   Configure your API keys in Settings (click the gear icon in the header)
*   Upload documents by clicking the plus icon in the Sources panel or drag files anywhere
*   Type @ in the chat to mention files and include them in your conversation
*   Select an AI model from the dropdown in the header
*   Start chatting with your documents

## Supported File Types

*   PDF documents
*   Excel spreadsheets (.xlsx, .xls, .csv)
*   Images (.png, .jpg, .jpeg, .gif, .bmp, .webp)
*   Text files (.txt, .md, .json)
*   Word documents (.doc, .docx)
*   PowerPoint presentations (.ppt, .pptx)

> [!NOTE]
> All files are processed locally in your browser. Your documents never leave your device unless you explicitly send them to an "AI model".

# Managing Sources

## Adding Files

You can add files to your workspace in multiple ways:

*   Click the plus icon in the Sources panel
*   Drag and drop files anywhere in the application
*   Drag files directly into the chat input field
*   Upload entire folders using the folder icon

## Using Files in Chat

Files must be explicitly mentioned using the @ symbol to be included in your conversation:

*   Type @ in the chat input to see a list of available files
*   Select a file from the dropdown or continue typing to filter
*   You can mention multiple files in a single message
*   Drag a file from the sidebar into the chat input to mention it

> [!NOTE]
> The app shows token counts for each file. Most models support 30-50k tokens of context. If you exceed this limit, you'll receive a warning.

## File Actions

Hover over any file in the Sources panel to access these actions:

*   Preview: View the file content in a modal
*   Mind Map: Generate an interactive visualization of the document structure
*   Remove: Delete the file from your workspace

# Chat Features

## Text Highlighter

Mark important parts of AI responses with colored highlights:

*   Right-click on any AI message and select "Highlight Text"
*   A floating toolbar appears with 5 color options
*   Select text to highlight it with your chosen color
*   Click highlighted text to remove the highlight
*   Use Undo/Redo buttons to manage your highlights
*   Drag the toolbar to reposition it anywhere on screen
*   Click the checkmark to exit highlight mode
*   Click the trash icon to clear all highlights from the message

## Drawing Tools

Draw annotations directly on your screen over any content:

### Accessing Drawing Mode

*   Right-click on any AI message and select "Draw on Screen"
*   A floating toolbar appears with drawing tools
*   Drag the toolbar to move it out of your way

### Available Tools

*   **Pen:** Draw freehand - circles and rectangles are auto-detected
*   **Rectangle:** Click and drag to draw perfect rectangles
*   **Circle:** Click and drag to draw perfect circles
*   **Arrow:** Click and drag to draw arrows pointing in any direction

### Customization

*   Choose from 5 colors for your drawings
*   Adjust stroke width with +/- buttons
*   Click checkmark when done to exit drawing mode
*   Click trash icon to clear all drawings

> [!TIP]
> With the Pen tool, draw a straight line and add a quick zigzag at the end to create an arrow automatically!

## Multiple Conversations

*   Click the plus icon in the header to create a new chat
*   Switch between chats using the Chats tab in the sidebar
*   Each chat maintains its own conversation history
*   Chats are automatically saved to your browser's local storage

## Model Selection

*   Google Gemini: Fast, supports large contexts and images (Free tier available)
*   Groq Llama: Extremely fast inference, great for quick tasks (Free tier available)
*   OpenAI GPT: Industry-standard intelligence (requires paid account)
*   AWS Bedrock: Claude 3.5 Sonnet, Haiku, Llama 3, Mistral (requires AWS account)

## Citations

When the AI references your documents, clickable citations appear in the response. Click any citation to view the exact location in the source document.

## Save to Notebook

*   Click the bookmark icon on any AI message to save it
*   Saved notes are numbered automatically (Note #1, #2, etc.)
*   Access all saved notes from the Notebook tab in the header
*   Click the bookmark icon again to unsave

## Voice Input

*   Click the microphone icon in the chat input
*   Speak your message clearly
*   Click again to stop recording and transcribe
*   Edit the transcribed text before sending

## Web Sources

*   Click the link icon in the chat input
*   Enter a URL to fetch and include in context
*   The AI can reference content from added URLs
*   Remove sources by clicking the X icon

# Mind Maps

## What are Mind Maps?

Mind maps are interactive visualizations that show the hierarchical structure of your documents. The AI analyzes your file and creates a tree diagram showing relationships between concepts.

## Generating Mind Maps

*   Hover over any file in the Sources panel
*   Click the Network icon (purple)
*   Wait for the AI to analyze the document structure
*   The mind map opens in fullscreen mode

## Interacting with Mind Maps

*   Click nodes to expand or collapse branches
*   Scroll to zoom in and out
*   Drag to pan around the visualization
*   Click the fullscreen button to toggle fullscreen mode

## Mind Map Cache

*   Generated mind maps are cached locally in IndexedDB
*   Access cached mind maps from the Graphics Library
*   No additional API calls needed for cached maps
*   Cache persists across browser sessions

## Best Use Cases

*   Bill of Quantities (BOQ) documents
*   Technical specifications
*   Project reports with hierarchical structure
*   Any document with clear sections and subsections

> [!NOTE]
> Mind maps are cached locally. Once generated, you can access them instantly from the Graphics Library without using additional API calls.

# Notebook

## What is the Notebook?

The Notebook is your personal knowledge base where you can save, organize, and manage important AI responses and notes.

## Saving Notes

*   Click the bookmark icon on any AI message to save it
*   Notes are automatically numbered (Note #1, #2, etc.)
*   Each note includes the model used and timestamp
*   Notes maintain links to their original chat conversation

## Organizing Notes

*   Add titles to notes for easy identification
*   Add tags to categorize notes by topic
*   Assign categories for better organization
*   Mark notes as favorites with the star icon

## View Modes

Switch between different view modes:

*   Grid View: Visual card layout with previews
*   List View: Detailed list with full content
*   Details View: Table format showing metadata

## Search and Filter

*   Search notes by content, title, or tags
*   Filter by category
*   Sort by creation date, last modified, or model
*   Toggle sort order (ascending/descending)

## Editing Notes

*   Click any note to open the full editor
*   Edit content and title directly
*   Changes are tracked with "Last Modified" timestamp
*   Click Save to apply changes

## Exporting Notes

*   Export individual notes as Markdown or Text
*   Select multiple notes and export as ZIP
*   Export all notes at once
*   Copy note content to clipboard

## Navigation

*   Click the external link icon to jump to the original conversation
*   The chat will scroll to the exact message
*   Message is highlighted briefly for easy identification

# Tasks & Todos

## What are Tasks?

The Tasks feature helps you track action items, to-dos, and follow-ups from your conversations and work.

## Creating Tasks

*   Type your task in the input field at the top
*   Press Enter or click Add to create
*   Tasks are automatically timestamped

## Task Properties

*   Priority: Set as Low, Medium, or High (shown as colored dots)
*   Due Date: Set deadlines for time-sensitive tasks
*   Completion Status: Check off completed tasks

## Managing Tasks

*   Click the checkbox to mark tasks as complete
*   Completed tasks show with strikethrough text
*   Delete tasks by clicking the trash icon
*   Hover over tasks to reveal action buttons

## Filtering and Sorting

*   Filter: All, Active, or Completed tasks
*   Sort by: Created date, Due date, or Priority
*   High priority tasks show red dots
*   Overdue tasks are highlighted in red

## Time Indicators

*   Tasks show time remaining (e.g., "2d", "5h", "30m")
*   Overdue tasks display "Overdue" badge
*   Color-coded badges for quick status recognition

# Reminders

## What are Reminders?

Reminders help you remember important deadlines, meetings, and time-sensitive tasks with automatic notifications.

## Creating Reminders

*   Enter a reminder title in the input field
*   Select date and time using the datetime picker
*   Click Add to create the reminder
*   Reminders must be set for future times

## Reminder Notifications

*   System checks for due reminders every 10 seconds
*   Toast notification appears when reminder triggers
*   Audio notification plays (if browser allows)
*   Reminder card pulses and highlights in red

## Managing Active Reminders

*   Snooze: Postpone for 5 min, 15 min, or 1 hour
*   Done: Mark as completed and dismiss
*   Delete: Remove reminder permanently

## Reminder States

*   Pending: Waiting for trigger time (blue badge)
*   Triggered: Time has arrived (red badge, pulsing)
*   Dismissed: Marked as done (grayed out)

## Filtering

*   All: Show all reminders regardless of status
*   Pending: Only upcoming reminders
*   Triggered: Only active notifications

## Time Display

*   Shows countdown: "in 2d", "in 5h", "in 30m"
*   Urgent reminders (under 1 hour) show yellow badge
*   Triggered reminders show "Now!" badge

# Live Mode

## What is Live Mode?

Live Mode enables real-time voice conversations with Gemini AI. Speak naturally and receive audio responses, creating a conversational experience similar to talking with an assistant.

> [!NOTE]
> Live Mode is only available in the browser version. It requires a Google Gemini API key and microphone access.

## Starting a Live Session

*   Click the phone icon in the header
*   Grant microphone permissions when prompted
*   Wait for the connection to establish
*   Start speaking naturally

## During a Live Session

*   Speak clearly into your microphone
*   The AI responds with voice output
*   Visual indicators show when you're speaking and when the AI is responding
*   Click the mute button to temporarily disable your microphone
*   Click the end call button to disconnect

## Tips for Best Results

*   Use a quiet environment to minimize background noise
*   Speak clearly and at a normal pace
*   Wait for the AI to finish responding before speaking again
*   Use headphones to prevent audio feedback

# Graphics Library

## What is the Graphics Library?

The Graphics Library stores all your snapshots and generated mind maps in one place. Access it by clicking the image icon in the header.

## Snapshots

Snapshots are screenshots of your chat conversations:

*   Press Ctrl+Shift+S (or Cmd+Shift+S on Mac) to take a snapshot
*   Click the camera icon in the header
*   Snapshots capture the entire visible chat area
*   Download snapshots as PNG images
*   Copy snapshots to clipboard for quick sharing

## Mind Map Gallery

All generated mind maps are automatically saved to the library:

*   View thumbnails of all your mind maps
*   Click to reopen any mind map instantly
*   Delete mind maps you no longer need
*   Mind maps are organized by file and model used

> [!NOTE]
> All graphics are stored locally in your browser. They persist across sessions but are not synced between devices.

# Data Management

## Overview

ConstructLM provides comprehensive tools to backup, restore, and manage your application data. All features are accessible through the Settings menu.

## Export Data

Create a complete backup of all your ConstructLM data:

*   Click Settings (gear icon) in the header
*   Scroll to "Data Management" section
*   Click "Export Data" button
*   A ZIP file will be downloaded to your default Downloads folder

## What Gets Exported

The export includes everything you need to restore your ConstructLM experience:

*   **All Chat Conversations:** Complete message history with timestamps
*   **Mind Maps:** All generated visualizations and their data
*   **Snapshots:** Screenshots with full image data
*   **Settings:** API keys, theme preferences, default model
*   **Metadata:** Export timestamp and version information

> [!NOTE]
> Export files are named with the current date (e.g., "constructlm-backup-2024-01-15.zip") and saved to your system's default Downloads folder.

## Import Data

Restore your data from a previously exported backup:

*   Click Settings → Data Management → "Import Data"
*   Select your backup ZIP file
*   Review the import confirmation dialog
*   Click "Continue" to proceed with the import
*   The app will automatically refresh after import

## Clear All App Data

Reset ConstructLM to a completely fresh state:

*   Click Settings → Data Management → "Clear All App Data" (red button)
*   Confirm the first warning dialog
*   Confirm the second "Are you absolutely sure?" dialog
*   All data will be permanently deleted
*   The app will refresh to a brand new state

> [!WARNING]
> #### Warning: Data Loss
> Clearing app data is permanent and cannot be undone. Export your data first if you want to keep a backup.

## Best Practices

*   **Regular Backups:** Export your data weekly or after important conversations
*   **Before Updates:** Always export before updating the application
*   **Device Changes:** Export from old device, import to new device
*   **Storage Management:** Use "Clear All Data" when storage space is low

## Troubleshooting

Common issues and solutions:

*   **Import Failed:** Ensure the ZIP file is a valid ConstructLM export
*   **Large Export:** Exports with many snapshots may take longer to generate
*   **Browser Storage Full:** Clear app data or use browser storage management
*   **Missing Data:** Check that the export was created successfully before importing

# Keyboard Shortcuts

## Chat Input

*   Enter: Send message
*   Shift+Enter: New line
*   @: Open file mention menu
*   Arrow Up/Down: Navigate mention menu
*   Escape: Close mention menu

## Application

*   Ctrl+Shift+S (Cmd+Shift+S): Take snapshot
*   Escape: Close modals and menus

## Context Menus

Right-click on various elements to access context-specific actions:

*   Chat input: Cut, copy, paste, select all
*   Messages: Copy message text

# Configuration

## API Keys

ConstructLM requires API keys to communicate with AI models. Configure them in Settings:

*   Click the gear icon in the header
*   Enter your API keys for each provider
*   Click "Test Connection" to verify each key
*   Click "Save & Apply" to store your configuration

## Getting API Keys

Google Gemini (Free tier available):

*   Visit ai.google.dev
*   Sign in with your Google account
*   Navigate to "Get API Key"
*   Create a new API key

Groq (Free tier available):

*   Visit console.groq.com
*   Create an account
*   Generate an API key from the dashboard

OpenAI (Paid only):

*   Visit platform.openai.com
*   Create an account and add payment method
*   Generate an API key from API settings

AWS Bedrock (Paid, requires AWS account):

*   Visit console.aws.amazon.com
*   Enable Bedrock service in your region
*   Create IAM user with Bedrock permissions
*   Generate Access Key ID and Secret Access Key
*   Enter both keys in Settings

> [!NOTE]
> API keys are stored locally in your browser's local storage. They are never sent to any server except the respective AI provider when making requests.

## Theme

Toggle between light and dark mode using the sun/moon icon in the header. Your preference is saved automatically.

## Data Management

ConstructLM provides comprehensive data backup and management tools:

*   **Export Data:** Create a complete backup ZIP file containing all your chats, mind maps, snapshots, and settings
*   **Import Data:** Restore from a previously exported ZIP file to recover all your data
*   **Clear All Data:** Reset the app to a brand new state by permanently deleting all stored data

> [!NOTE]
> Export your data regularly to prevent loss. The export includes everything: conversations, generated mind maps, screenshots, and all your settings.

## Data Storage

All data is stored locally in your browser:

*   API keys: Browser local storage
*   Chat history: Browser local storage
*   Uploaded files: Browser memory (cleared on refresh)
*   Mind maps: IndexedDB
*   Snapshots: IndexedDB

# Support & Feedback

ConstructLM is actively developed and we value your feedback. Here's how you can get help or contribute to making the app better.

## Download & Updates

> [!NOTE]
> ConstructLM is available for download at: **https://mimevents.com/**
> Check this page regularly for the latest updates and new features.

## Report a Bug

Found an issue? Help us fix it by reporting bugs:

*   Email us at: **mshk@mimevents.com**
*   Include your operating system and browser version
*   Describe the steps to reproduce the issue
*   Attach screenshots if helpful
*   Mention which AI model you were using when the issue occurred

> [!BUG]
> #### Bug Report Template
> Subject: [Bug] Brief description
> OS: Windows/Mac/Linux
> Browser: Chrome/Firefox/Safari + version
> Steps: 1. Do this, 2. Then this, 3. Bug occurs
> Expected: What should happen
> Actual: What actually happened

## Request a Feature

Have an idea for a new feature or improvement? We'd love to hear it:

*   Email us at: **mshk@mimevents.com**
*   Describe the feature and how it would help you
*   Explain your current workflow and how this would improve it
*   Include mockups or examples if you have them
*   Let us know if this is for construction/engineering use cases

> [!LIGHTBULB]
> #### Feature Request Template
> Subject: [Feature] Brief description
> Problem: What challenge are you trying to solve?
> Solution: How would this feature help?
> Use Case: Describe your workflow
> Priority: How important is this to you?

## Contact Information

> ##### Developer Contact
> For bugs, features, and general support
>
> Email: mshk@mimevents.com
> Response time: Usually within 24-48 hours

## Contributing

ConstructLM is designed specifically for construction and engineering professionals. Your feedback helps us:

*   Prioritize features that matter most to your workflow
*   Fix bugs that impact productivity
*   Improve document parsing for construction file formats
*   Enhance AI responses for technical queries
*   Add integrations with industry-standard tools

> [!NOTE]
> Thank you for using ConstructLM! Your feedback drives our development and helps us build better tools for the construction industry.