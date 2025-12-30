import React from 'react';
import { PageTitle, PageDescription, TOC, SectionTitle, SectionDivider, Paragraph, List, ListItem, InfoBox } from '../../SharedComponents';

export const DataManagement: React.FC = () => (
  <>
    <PageTitle>Data Management</PageTitle>
    <PageDescription>
      Comprehensive tools to backup, restore, and manage your application data with export/import capabilities.
    </PageDescription>

    <TOC items={[
      'Overview',
      'Export Data',
      'What Gets Exported',
      'Import Data',
      'Clear All App Data',
      'Best Practices',
      'Troubleshooting'
    ]} />

    <SectionTitle number="1">Overview</SectionTitle>
    <Paragraph>
      ConstructLM provides comprehensive tools to backup, restore, and manage your application data. All features are accessible through the Settings menu.
    </Paragraph>

    <SectionDivider />

    <SectionTitle number="2">Export Data</SectionTitle>
    <Paragraph>
      Create a complete backup of all your ConstructLM data:
    </Paragraph>
    <List>
      <ListItem>Click Settings (gear icon) in the header</ListItem>
      <ListItem>Scroll to "Data Management" section</ListItem>
      <ListItem>Click "Export Data" button</ListItem>
      <ListItem>A ZIP file will be downloaded to your default Downloads folder</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="3">What Gets Exported</SectionTitle>
    <Paragraph>
      The export includes everything you need to restore your ConstructLM experience:
    </Paragraph>
    <List>
      <ListItem><strong>All Chat Conversations:</strong> Complete message history with timestamps</ListItem>
      <ListItem><strong>Mind Maps:</strong> All generated visualizations and their data</ListItem>
      <ListItem><strong>Snapshots:</strong> Screenshots with full image data</ListItem>
      <ListItem><strong>Settings:</strong> API keys, theme preferences, default model</ListItem>
      <ListItem><strong>Metadata:</strong> Export timestamp and version information</ListItem>
    </List>

    <InfoBox>
      Export files are named with the current date (e.g., "constructlm-backup-2024-01-15.zip") and saved to your system's default Downloads folder.
    </InfoBox>

    <SectionDivider />

    <SectionTitle number="4">Import Data</SectionTitle>
    <Paragraph>
      Restore your data from a previously exported backup:
    </Paragraph>
    <List>
      <ListItem>Click Settings → Data Management → "Import Data"</ListItem>
      <ListItem>Select your backup ZIP file</ListItem>
      <ListItem>Review the import confirmation dialog</ListItem>
      <ListItem>Click "Continue" to proceed with the import</ListItem>
      <ListItem>The app will automatically refresh after import</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="5">Clear All App Data</SectionTitle>
    <Paragraph>
      Reset ConstructLM to a completely fresh state:
    </Paragraph>
    <List>
      <ListItem>Click Settings → Data Management → "Clear All App Data" (red button)</ListItem>
      <ListItem>Confirm the first warning dialog</ListItem>
      <ListItem>Confirm the second "Are you absolutely sure?" dialog</ListItem>
      <ListItem>All data will be permanently deleted</ListItem>
      <ListItem>The app will refresh to a brand new state</ListItem>
    </List>

    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-white text-xs font-bold">!</span>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">Warning: Data Loss</h4>
          <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
            Clearing app data is permanent and cannot be undone. Export your data first if you want to keep a backup.
          </p>
        </div>
      </div>
    </div>

    <SectionDivider />

    <SectionTitle number="6">Best Practices</SectionTitle>
    <List>
      <ListItem><strong>Regular Backups:</strong> Export your data weekly or after important conversations</ListItem>
      <ListItem><strong>Before Updates:</strong> Always export before updating the application</ListItem>
      <ListItem><strong>Device Changes:</strong> Export from old device, import to new device</ListItem>
      <ListItem><strong>Storage Management:</strong> Use "Clear All Data" when storage space is low</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="7">Troubleshooting</SectionTitle>
    <Paragraph>
      Common issues and solutions:
    </Paragraph>
    <List>
      <ListItem><strong>Import Failed:</strong> Ensure the ZIP file is a valid ConstructLM export</ListItem>
      <ListItem><strong>Large Export:</strong> Exports with many snapshots may take longer to generate</ListItem>
      <ListItem><strong>Browser Storage Full:</strong> Clear app data or use browser storage management</ListItem>
      <ListItem><strong>Missing Data:</strong> Check that the export was created successfully before importing</ListItem>
    </List>
  </>
);
