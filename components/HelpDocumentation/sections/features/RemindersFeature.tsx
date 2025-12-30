import React from 'react';
import { PageTitle, PageDescription, TOC, SectionTitle, SectionDivider, Paragraph, List, ListItem } from '../../SharedComponents';

export const RemindersFeature: React.FC = () => (
  <>
    <PageTitle>Reminders</PageTitle>
    <PageDescription>
      Set time-based reminders with automatic notifications to remember important deadlines, meetings, and time-sensitive tasks.
    </PageDescription>

    <TOC items={[
      'What are Reminders?',
      'Creating Reminders',
      'Reminder Notifications',
      'Managing Active Reminders',
      'Reminder States',
      'Filtering',
      'Time Display'
    ]} />

    <SectionTitle number="1">What are Reminders?</SectionTitle>
    <Paragraph>
      Reminders help you remember important deadlines, meetings, and time-sensitive tasks with automatic notifications.
    </Paragraph>

    <SectionDivider />

    <SectionTitle number="2">Creating Reminders</SectionTitle>
    <List>
      <ListItem>Enter a reminder title in the input field</ListItem>
      <ListItem>Select date and time using the datetime picker</ListItem>
      <ListItem>Click Add to create the reminder</ListItem>
      <ListItem>Reminders must be set for future times</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="3">Reminder Notifications</SectionTitle>
    <List>
      <ListItem>System checks for due reminders every 10 seconds</ListItem>
      <ListItem>Toast notification appears when reminder triggers</ListItem>
      <ListItem>Audio notification plays (if browser allows)</ListItem>
      <ListItem>Reminder card pulses and highlights in red</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="4">Managing Active Reminders</SectionTitle>
    <List>
      <ListItem>Snooze: Postpone for 5 min, 15 min, or 1 hour</ListItem>
      <ListItem>Done: Mark as completed and dismiss</ListItem>
      <ListItem>Delete: Remove reminder permanently</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="5">Reminder States</SectionTitle>
    <List>
      <ListItem>Pending: Waiting for trigger time (blue badge)</ListItem>
      <ListItem>Triggered: Time has arrived (red badge, pulsing)</ListItem>
      <ListItem>Dismissed: Marked as done (grayed out)</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="6">Filtering</SectionTitle>
    <List>
      <ListItem>All: Show all reminders regardless of status</ListItem>
      <ListItem>Pending: Only upcoming reminders</ListItem>
      <ListItem>Triggered: Only active notifications</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="7">Time Display</SectionTitle>
    <List>
      <ListItem>Shows countdown: "in 2d", "in 5h", "in 30m"</ListItem>
      <ListItem>Urgent reminders (under 1 hour) show yellow badge</ListItem>
      <ListItem>Triggered reminders show "Now!" badge</ListItem>
    </List>
  </>
);
