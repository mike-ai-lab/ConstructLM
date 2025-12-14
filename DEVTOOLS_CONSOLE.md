1. Zoom State Leakage Between Snapshots (Bug)

Problem
zoomLevel persists when switching between snapshots. Opening a new snapshot inherits the previous zoom level.

Impact
Confusing UX; users expect each image to open at 100%.

Fix (exact change)
Reset zoom whenever a new snapshot is opened.

onClick={() => {
  setZoomLevel(1);
  setViewingSnapshot(snapshot);
}}


Apply this in both places:

Thumbnail click

“View” button click

2. Modal Delete Action Leaves Stale State (Bug)

Problem
Deleting the snapshot currently being viewed does not close the modal.

Impact
Modal shows deleted data; potential runtime errors if parent state updates.

Fix

onClick={() => {
  onDelete(viewingSnapshot.id);
  setViewingSnapshot(null);
  setZoomLevel(1);
}}


Apply this to the modal footer delete button.

3. Missing Keyboard Accessibility (UX / A11y)

Problem

No Escape key handling to close modal

Zoom controls unusable via keyboard

Fix (minimal, production-safe)

Add this effect near the top of the component:

import { useEffect } from 'react';

useEffect(() => {
  if (!viewingSnapshot) return;

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setViewingSnapshot(null);
      setZoomLevel(1);
    }
    if (e.key === '+') setZoomLevel(z => Math.min(3, z + 0.25));
    if (e.key === '-') setZoomLevel(z => Math.max(0.25, z - 0.25));
  };

  window.addEventListener('keydown', handleKey);
  return () => window.removeEventListener('keydown', handleKey);
}, [viewingSnapshot]);

4. Unbounded Memory Risk with dataUrl Thumbnails

Problem
All snapshots render full dataUrl images immediately.

Impact
Large screenshots → high memory usage → browser slowdown.

Fix (low effort, high return)
Lazy-load thumbnails:

<img
  loading="lazy"
  src={snapshot.dataUrl}
  ...
/>


Optional (better): store a generated thumbnail instead of full image.

5. Absolute Positioning Collision Risk

Problem
Panel uses absolute top-full right-0 with high z-50.

Impact
Breaks in nested layouts or scroll containers.

Fix (structural, safe)
If this is a floating panel triggered by a button, it should be fixed:

<div className="fixed top-16 right-4 w-96 ... z-50">


This prevents clipping inside parents with overflow: hidden.

6. Emoji Usage Inside Metadata (Consistency Issue)

Problem
Icons use emojis (📁 💬 📐) while the rest of the UI uses lucide-react.

Impact
Visual inconsistency, poor rendering on some platforms.

Fix
Replace emojis with icons:

<FileText size={12} className="inline mr-1" />


Keep iconography consistent across the component.

7. Snapshot Count Footer Logic Edge Case

Problem
Footer shows “stored locally” even when modal is open.

Fix (minor polish)
Hide footer when viewing modal:

{snapshots.length > 0 && !viewingSnapshot && (

8. Recommended Optional Enhancements (No Refactor Required)

Add double-click to reset zoom

Add mouse wheel zoom inside image container

Clamp image max width based on viewport to reduce scroll fatigue

Summary of Required Fixes (Priority Order)

Reset zoom on snapshot change

Close modal after delete

Add Escape key handling

Lazy-load thumbnails

Fix positioning robustness