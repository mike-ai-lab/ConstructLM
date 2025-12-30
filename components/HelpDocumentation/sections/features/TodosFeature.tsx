import React from 'react';
import { PageTitle, PageDescription, TOC, SectionTitle, SectionDivider, Paragraph, List, ListItem } from '../../SharedComponents';

export const TodosFeature: React.FC = () => (
  <>
    <PageTitle>Tasks & Todos</PageTitle>
    <PageDescription>
      Track action items, to-dos, and follow-ups from your conversations with priorities, due dates, and subtasks.
    </PageDescription>

    <TOC items={[
      'What are Tasks?',
      'Creating Tasks',
      'Task Properties',
      'Managing Tasks',
      'Filtering and Sorting',
      'Time Indicators'
    ]} />

    <SectionTitle number="1">What are Tasks?</SectionTitle>
    <Paragraph>
      The Tasks feature helps you track action items, to-dos, and follow-ups from your conversations and work.
    </Paragraph>

    <SectionDivider />

    <SectionTitle number="2">Creating Tasks</SectionTitle>
    <List>
      <ListItem>Type your task in the input field at the top</ListItem>
      <ListItem>Press Enter or click Add to create</ListItem>
      <ListItem>Tasks are automatically timestamped</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="3">Task Properties</SectionTitle>
    <List>
      <ListItem>Priority: Set as Low, Medium, or High (shown as colored dots)</ListItem>
      <ListItem>Due Date: Set deadlines for time-sensitive tasks</ListItem>
      <ListItem>Completion Status: Check off completed tasks</ListItem>
      <ListItem>Subtasks: Break down complex tasks into smaller steps</ListItem>
      <ListItem>Categories: Organize tasks by project or type</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="4">Managing Tasks</SectionTitle>
    <List>
      <ListItem>Click the checkbox to mark tasks as complete</ListItem>
      <ListItem>Completed tasks show with strikethrough text</ListItem>
      <ListItem>Delete tasks by clicking the trash icon</ListItem>
      <ListItem>Hover over tasks to reveal action buttons</ListItem>
      <ListItem>Progress bars show completion percentage for tasks with subtasks</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="5">Filtering and Sorting</SectionTitle>
    <List>
      <ListItem>Filter: All, Active, or Completed tasks</ListItem>
      <ListItem>Sort by: Created date, Due date, or Priority</ListItem>
      <ListItem>High priority tasks show red dots</ListItem>
      <ListItem>Overdue tasks are highlighted in red</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="6">Time Indicators</SectionTitle>
    <List>
      <ListItem>Tasks show time remaining (e.g., "2d", "5h", "30m")</ListItem>
      <ListItem>Overdue tasks display "Overdue" badge</ListItem>
      <ListItem>Color-coded badges for quick status recognition</ListItem>
    </List>
  </>
);
