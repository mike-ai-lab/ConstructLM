import React from 'react';
import { Bug, Lightbulb, Mail } from 'lucide-react';
import { PageTitle, PageDescription, TOC, SectionTitle, SectionDivider, Paragraph, List, ListItem, InfoBox } from '../../SharedComponents';

export const SupportFeedback: React.FC = () => (
  <>
    <PageTitle>Support & Feedback</PageTitle>
    <PageDescription>
      Get help, report bugs, request features, and contribute to making ConstructLM better.
    </PageDescription>

    <TOC items={[
      'Download & Updates',
      'Report a Bug',
      'Request a Feature',
      'Contact Information',
      'Contributing'
    ]} />

    <Paragraph>
      ConstructLM is actively developed and we value your feedback. Here's how you can get help or contribute to making the app better.
    </Paragraph>

    <SectionTitle number="1">Download & Updates</SectionTitle>
    <InfoBox>
      ConstructLM is available for download at: <strong>https://mimevents.com/</strong>
      <br />Check this page regularly for the latest updates and new features.
    </InfoBox>

    <SectionDivider />

    <SectionTitle number="2">Report a Bug</SectionTitle>
    <Paragraph>
      Found an issue? Help us fix it by reporting bugs:
    </Paragraph>
    <List>
      <ListItem>Email us at: <strong>mshk@mimevents.com</strong></ListItem>
      <ListItem>Include your operating system and browser version</ListItem>
      <ListItem>Describe the steps to reproduce the issue</ListItem>
      <ListItem>Attach screenshots if helpful</ListItem>
      <ListItem>Mention which AI model you were using when the issue occurred</ListItem>
    </List>

    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <Bug size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">Bug Report Template</h4>
          <p className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
            Subject: [Bug] Brief description<br />
            OS: Windows/Mac/Linux<br />
            Browser: Chrome/Firefox/Safari + version<br />
            Steps: 1. Do this, 2. Then this, 3. Bug occurs<br />
            Expected: What should happen<br />
            Actual: What actually happened
          </p>
        </div>
      </div>
    </div>

    <SectionDivider />

    <SectionTitle number="3">Request a Feature</SectionTitle>
    <Paragraph>
      Have an idea for a new feature or improvement? We'd love to hear it:
    </Paragraph>
    <List>
      <ListItem>Email us at: <strong>mshk@mimevents.com</strong></ListItem>
      <ListItem>Describe the feature and how it would help you</ListItem>
      <ListItem>Explain your current workflow and how this would improve it</ListItem>
      <ListItem>Include mockups or examples if you have them</ListItem>
      <ListItem>Let us know if this is for construction/engineering use cases</ListItem>
    </List>

    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <Lightbulb size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">Feature Request Template</h4>
          <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
            Subject: [Feature] Brief description<br />
            Problem: What challenge are you trying to solve?<br />
            Solution: How would this feature help?<br />
            Use Case: Describe your workflow<br />
            Priority: How important is this to you?
          </p>
        </div>
      </div>
    </div>

    <SectionDivider />

    <SectionTitle number="4">Contact Information</SectionTitle>
    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-3 mb-3">
        <Mail size={20} className="text-gray-600 dark:text-gray-400" />
        <div>
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Developer Contact</h4>
          <p className="text-xs text-gray-600 dark:text-gray-400">For bugs, features, and general support</p>
        </div>
      </div>
      <div className="text-sm">
        <p className="text-gray-800 dark:text-gray-200 font-medium">Email: mshk@mimevents.com</p>
        <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">Response time: Usually within 24-48 hours</p>
      </div>
    </div>

    <SectionDivider />

    <SectionTitle number="5">Contributing</SectionTitle>
    <Paragraph>
      ConstructLM is designed specifically for construction and engineering professionals. Your feedback helps us:
    </Paragraph>
    <List>
      <ListItem>Prioritize features that matter most to your workflow</ListItem>
      <ListItem>Fix bugs that impact productivity</ListItem>
      <ListItem>Improve document parsing for construction file formats</ListItem>
      <ListItem>Enhance AI responses for technical queries</ListItem>
      <ListItem>Add integrations with industry-standard tools</ListItem>
    </List>

    <InfoBox>
      Thank you for using ConstructLM! Your feedback drives our development and helps us build better tools for the construction industry.
    </InfoBox>
  </>
);
