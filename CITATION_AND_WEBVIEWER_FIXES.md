# Citation and WebViewer Fixes

## Issues Fixed

### 1. Cookie Prompt Issue in WebViewer
**Problem**: When navigating between links in the sidebar (e.g., Home → About Us), the iframe was reloading and repeatedly asking for cookie consent, even after accepting.

**Root Cause**: The iframe was being recreated on every tab switch, causing the website to lose the cookie consent state.

**Solution**: 
- Modified `TabbedWebViewer.tsx` to keep all iframes mounted in the DOM but hidden using CSS (`display: none`)
- Changed from a single `iframeRef` to `iframeRefs` object to track multiple iframes
- Each tab now has its own persistent iframe that maintains its state (including cookies)
- Only the active tab's iframe is visible, others remain hidden but alive

**Benefits**:
- Cookies and session state are preserved when switching tabs
- No more repeated cookie consent prompts
- Faster tab switching (no reload needed)
- Better user experience

### 2. Citation Link Opening Issue
**Problem**: When clicking on a citation chip to open its popup, then clicking on another citation chip, the second one wouldn't open unless the first popup was manually closed.

**Root Cause**: Multiple citation popups could exist simultaneously, and there was no mechanism to automatically close the previous one when opening a new one.

**Solution**:
- Implemented a global state management system using `currentOpenCitation` variable
- When a citation opens, it registers its close function globally
- Before opening a new citation, the system automatically closes any previously open citation
- This ensures only one citation popup is visible at a time

**Benefits**:
- Seamless citation navigation - click any citation to open it immediately
- No need to manually close popups before opening new ones
- Cleaner UI with only one popup visible at a time
- Better user experience when reviewing multiple citations

### 3. Additional Improvements
- Added `scrollbar-hide` utility class for cleaner tab scrolling in the web viewer
- Improved iframe reference management for better performance
- Enhanced citation popup behavior with proper state cleanup

## Technical Details

### Files Modified
1. **TabbedWebViewer.tsx**
   - Changed iframe rendering strategy from single to multiple persistent iframes
   - Updated refs from single `iframeRef` to `iframeRefs` object
   - Modified `handleTabLoad` to accept `tabId` parameter
   - Updated handler functions to use the correct iframe reference

2. **CitationChip.tsx**
   - Added global `currentOpenCitation` state variable
   - Implemented automatic closure of previous citations
   - Improved `handleToggle` logic for better state management
   - Added proper cleanup in useEffect

3. **WebViewer.tsx**
   - Added iframe ref for consistency

4. **integrated-styles.css**
   - Added `scrollbar-hide` utility class

## Testing Recommendations
1. Test cookie consent persistence across tab switches
2. Verify multiple citation clicks work without manual closure
3. Test navigation within iframes (back/forward buttons)
4. Verify tab switching performance
5. Test with different websites that use cookies
6. Test citation popups in tables and regular content

## Notes
- The X-Frame-Options error you saw is expected for some websites (like tdca.org.uk) that prevent embedding in iframes for security reasons
- This is a website-level restriction and cannot be bypassed from the client side
- Users can still open such links in an external browser using the "Open in external browser" option
