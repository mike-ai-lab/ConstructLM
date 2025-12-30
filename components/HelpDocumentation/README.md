# Help Documentation - Modular Structure

This directory contains the refactored Help Documentation system, organized into modular, maintainable components.

## Directory Structure

```
HelpDocumentation/
├── index.tsx                    # Main component with navigation and AI assistant
├── SharedComponents.tsx         # Reusable UI components (PageTitle, List, etc.)
└── sections/
    ├── basics/
    │   ├── index.ts            # Exports all basics components
    │   ├── GettingStarted.tsx
    │   └── HowItWorks.tsx
    ├── sources/
    │   ├── index.ts            # Exports all sources components
    │   ├── DocumentSources.tsx
    │   └── WebSources.tsx
    ├── features/
    │   ├── index.ts            # Exports all features components
    │   ├── ChatFeatures.tsx
    │   ├── NotebookFeature.tsx
    │   ├── TodosFeature.tsx
    │   ├── RemindersFeature.tsx
    │   ├── MindMaps.tsx
    │   ├── WebIntegration.tsx
    │   ├── LiveMode.tsx
    │   └── GraphicsLibrary.tsx
    └── advanced/
        ├── index.ts            # Exports all advanced components
        ├── DataManagement.tsx
        ├── KeyboardShortcuts.tsx
        ├── Configuration.tsx
        └── SupportFeedback.tsx
```

## How to Add a New Section

### 1. Create the Component File

Create a new file in the appropriate category folder (basics/sources/features/advanced):

```tsx
// Example: sections/features/NewFeature.tsx
import React from 'react';
import { PageTitle, PageDescription, TOC, SectionTitle, SectionDivider, Paragraph, List, ListItem, InfoBox } from '../../SharedComponents';

export const NewFeature: React.FC = () => (
  <>
    <PageTitle>New Feature</PageTitle>
    <PageDescription>
      Description of the new feature.
    </PageDescription>

    <TOC items={[
      'Section 1',
      'Section 2',
      'Section 3'
    ]} />

    <SectionTitle number="1">Section 1</SectionTitle>
    <Paragraph>
      Content here...
    </Paragraph>
    <List>
      <ListItem>Item 1</ListItem>
      <ListItem>Item 2</ListItem>
    </List>

    <SectionDivider />

    <SectionTitle number="2">Section 2</SectionTitle>
    <Paragraph>
      More content...
    </Paragraph>
  </>
);
```

### 2. Export from Category Index

Add the export to the category's `index.ts` file:

```typescript
// sections/features/index.ts
export { ChatFeatures } from './ChatFeatures';
export { NotebookFeature } from './NotebookFeature';
export { NewFeature } from './NewFeature';  // Add this line
```

### 3. Import in Main Component

Update `HelpDocumentation/index.tsx`:

```typescript
// Add to imports
import { ChatFeatures, NotebookFeature, NewFeature } from './sections/features';

// Add to sections array
const sections = [
  // ... existing sections
  { id: 'new-feature', title: 'New Feature', icon: YourIcon, category: 'Features' },
];

// Add to render section
{activeSection === 'new-feature' && <NewFeature />}
```

## Available Shared Components

All components are imported from `SharedComponents.tsx`:

- **PageTitle**: Main page heading
- **PageDescription**: Subtitle/description below title
- **TOC**: Table of contents with numbered items
- **SectionTitle**: Section heading with optional number
- **SectionDivider**: Horizontal divider between sections
- **SubTitle**: Subsection heading
- **FeatureTitle**: Feature-specific heading
- **Paragraph**: Standard paragraph text
- **List**: Unordered list container
- **ListItem**: List item with chevron icon
- **CodeBlock**: Code snippet container
- **InfoBox**: Highlighted information box

## Styling Guidelines

- Use semantic component names (PageTitle, not H1)
- Maintain consistent spacing with SectionDivider
- Use InfoBox for important notes and warnings
- Keep sections focused and scannable
- Use numbered SectionTitles for main sections
- Use TOC at the top of each page

## Benefits of This Structure

1. **Maintainability**: Each section is isolated in its own file
2. **Scalability**: Easy to add new sections without touching existing code
3. **Reusability**: Shared components ensure consistent styling
4. **Organization**: Clear category-based folder structure
5. **Performance**: Components can be lazy-loaded if needed
6. **Collaboration**: Multiple developers can work on different sections simultaneously

## Migration Notes

The original 2000-line `HelpDocumentation.tsx` has been split into:
- 1 main component (navigation + AI assistant)
- 1 shared components file
- 16 section components across 4 categories
- 5 index files for clean exports

Total: ~23 files, each focused and manageable (50-200 lines each)
