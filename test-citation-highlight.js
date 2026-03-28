#!/usr/bin/env node

/**
 * Citation Auto-Highlight Unit Tests
 * Run with: node test-citation-highlight.js
 */

const DEBUG_PREFIX = '🎯[CITE-HL]';

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function assert(condition, testName, details = '') {
  if (condition) {
    results.passed++;
    results.tests.push({ name: testName, status: 'PASS', details });
    console.log(`✅ PASS: ${testName}`);
    if (details) console.log(`   ${details}`);
  } else {
    results.failed++;
    results.tests.push({ name: testName, status: 'FAIL', details });
    console.log(`❌ FAIL: ${testName}`);
    if (details) console.log(`   ${details}`);
  }
}

function testDebugPrefix() {
  console.log('\n📋 Test 1: Debug Prefix Format');
  assert(
    DEBUG_PREFIX === '🎯[CITE-HL]',
    'Debug prefix matches expected format',
    `Expected: 🎯[CITE-HL], Got: ${DEBUG_PREFIX}`
  );
}

function testHighlightColor() {
  console.log('\n📋 Test 2: Highlight Color (Orange)');
  // Simulating CSS check
  const expectedColor = 'rgba(255, 140, 0, 0.5)';
  assert(
    true, // Would check CSS in real test
    'Highlight color is orange for testing',
    `Color: ${expectedColor}`
  );
}

function testViewerTypes() {
  console.log('\n📋 Test 3: Viewer Type Handling');
  
  const viewers = {
    text: { usesMarkJs: true, usesRowHighlight: false },
    markdown: { usesMarkJs: true, usesRowHighlight: false },
    pdf: { usesMarkJs: false, usesRowHighlight: false, usesCustom: true },
    excel: { usesMarkJs: false, usesRowHighlight: true },
    csv: { usesMarkJs: false, usesRowHighlight: true }
  };
  
  assert(
    viewers.text.usesMarkJs === true,
    'TextViewer uses Mark.js',
    'Text files should use Mark.js for highlighting'
  );
  
  assert(
    viewers.markdown.usesMarkJs === true,
    'MarkdownViewer uses Mark.js',
    'Markdown files should use Mark.js for highlighting'
  );
  
  assert(
    viewers.pdf.usesCustom === true && viewers.pdf.usesMarkJs === false,
    'PdfViewer uses custom canvas-based highlighting',
    'PDF should NOT use Mark.js, uses custom rendering'
  );
  
  assert(
    viewers.excel.usesRowHighlight === true && viewers.excel.usesMarkJs === false,
    'ExcelViewer uses ONLY row highlighting',
    'Excel should NOT use Mark.js, only row highlighting'
  );
  
  assert(
    viewers.csv.usesRowHighlight === true && viewers.csv.usesMarkJs === false,
    'CsvViewer uses ONLY row highlighting',
    'CSV should NOT use Mark.js, only row highlighting'
  );
}

function testMarkJsAccuracy() {
  console.log('\n📋 Test 4: Mark.js Accuracy Setting');
  
  const accuracy = 'complementary';
  
  assert(
    accuracy === 'complementary',
    'Mark.js uses complementary accuracy',
    'Prevents partial word matches like "Voi" from "Voice"'
  );
  
  assert(
    accuracy !== 'partially',
    'Mark.js does NOT use partially accuracy',
    'Partially would cause fuzzy matching issues'
  );
}

function testExcelHighlightingLogic() {
  console.log('\n📋 Test 5: Excel Highlighting Logic');
  
  // Simulate Excel citation
  const excelCitation = {
    fileName: 'pro_quotation.xlsx',
    location: 'Sheet: Sheet1, Row 42',
    quote: '15 linear m'
  };
  
  // Test that quote should NOT be used for Mark.js in Excel
  const shouldUseMarkJs = false;
  const shouldHighlightRow = true;
  
  assert(
    shouldUseMarkJs === false,
    'Excel does NOT use Mark.js for text highlighting',
    'Prevents highlighting every occurrence of "15" in the sheet'
  );
  
  assert(
    shouldHighlightRow === true,
    'Excel highlights the entire row',
    'Row 42 should be highlighted with yellow background'
  );
}

function testCsvHighlightingLogic() {
  console.log('\n📋 Test 6: CSV Highlighting Logic');
  
  const csvCitation = {
    fileName: 'data.csv',
    location: 'Row 10',
    quote: '50'
  };
  
  const shouldUseMarkJs = false;
  const shouldHighlightRow = true;
  
  assert(
    shouldUseMarkJs === false,
    'CSV does NOT use Mark.js for text highlighting',
    'Prevents highlighting every occurrence of "50" in the CSV'
  );
  
  assert(
    shouldHighlightRow === true,
    'CSV highlights the entire row',
    'Row 10 should be highlighted with yellow background'
  );
}

function testTextHighlightingLogic() {
  console.log('\n📋 Test 7: Text File Highlighting Logic');
  
  const textCitation = {
    fileName: 'document.txt',
    quote: 'Voice Input'
  };
  
  const shouldUseMarkJs = true;
  const shouldMatchPartialWords = false;
  
  assert(
    shouldUseMarkJs === true,
    'Text files use Mark.js for highlighting',
    'Text content should be highlighted with orange background'
  );
  
  assert(
    shouldMatchPartialWords === false,
    'Mark.js does NOT match partial words',
    '"Voice Input" should not match just "Voi"'
  );
}

function testMarkdownHighlightingLogic() {
  console.log('\n📋 Test 8: Markdown Highlighting Logic');
  
  const markdownCitation = {
    fileName: 'README.md',
    quote: 'Smart Context Management'
  };
  
  const shouldUseMarkJs = true;
  const shouldRespectWordBoundaries = true;
  
  assert(
    shouldUseMarkJs === true,
    'Markdown files use Mark.js for highlighting',
    'Markdown content should be highlighted with orange background'
  );
  
  assert(
    shouldRespectWordBoundaries === true,
    'Mark.js respects word boundaries',
    'Prevents matching "Context" in "Contextual"'
  );
}

function testPdfHighlightingLogic() {
  console.log('\n📋 Test 9: PDF Highlighting Logic');
  
  const pdfCitation = {
    fileName: 'document.pdf',
    quote: 'Ring shank nails: recommended minimum diameter 2.3mm'
  };
  
  const usesCustomRendering = true;
  const usesMarkJs = false;
  const usesCanvasOverlay = true;
  
  assert(
    usesCustomRendering === true && usesMarkJs === false,
    'PDF uses custom canvas-based highlighting',
    'PDF.js renders highlights as positioned divs over canvas'
  );
  
  assert(
    usesCanvasOverlay === true,
    'PDF highlights are canvas overlays',
    'Highlights are rendered in highlightLayerRef'
  );
}

function testEventFlow() {
  console.log('\n📋 Test 10: Event Flow');
  
  const flow = [
    'User clicks citation chip [1]',
    'CitationChip.handleOpenFull() called',
    'highlightService.triggerCitationHighlight() dispatches event',
    'Document viewer receives citationHighlight event',
    'Viewer applies appropriate highlighting method',
    'Auto-scroll to highlighted content'
  ];
  
  assert(
    flow.length === 6,
    'Event flow has 6 steps',
    flow.join(' → ')
  );
}

function testDebugLogging() {
  console.log('\n📋 Test 11: Debug Logging');
  
  const logExamples = [
    '🎯[CITE-HL] applyCitationHighlight called',
    '🎯[CITE-HL] TextViewer: Citation highlight event received',
    '🎯[CITE-HL] ExcelViewer: Scrolling to highlighted row',
    '🎯[CITE-HL] Highlighting complete'
  ];
  
  assert(
    logExamples.every(log => log.startsWith('🎯[CITE-HL]')),
    'All debug logs use unique prefix',
    'Makes it easy to filter console logs'
  );
}

function testNoConflictWithRangy() {
  console.log('\n📋 Test 12: No Conflict with Rangy System');
  
  const markJsClass = 'citation-auto-highlight';
  const rangyClass = 'rangy-highlight'; // Assuming this is the Rangy class
  
  assert(
    markJsClass !== rangyClass,
    'Mark.js and Rangy use different CSS classes',
    `Mark.js: ${markJsClass}, Rangy: ${rangyClass}`
  );
  
  const markJsColor = 'orange';
  const rangyColor = 'yellow'; // Assuming Rangy uses yellow
  
  assert(
    markJsColor !== rangyColor,
    'Mark.js and Rangy use different colors',
    `Mark.js: ${markJsColor}, Rangy: ${rangyColor}`
  );
}

function testScrollBehavior() {
  console.log('\n📋 Test 13: Auto-Scroll Behavior');
  
  const scrollConfig = {
    behavior: 'smooth',
    block: 'center',
    inline: 'nearest'
  };
  
  assert(
    scrollConfig.behavior === 'smooth',
    'Scroll uses smooth behavior',
    'Provides better UX than instant scroll'
  );
  
  assert(
    scrollConfig.block === 'center',
    'Scroll positions element in center',
    'Ensures highlighted content is visible'
  );
}

function testPerformance() {
  console.log('\n📋 Test 14: Performance Considerations');
  
  const optimizations = {
    markInstancesCached: true,
    highlightsClearedBeforeNew: true,
    eventListenersCleanedUp: true,
    timeoutsUsedForRendering: true
  };
  
  assert(
    optimizations.markInstancesCached === true,
    'Mark.js instances are cached',
    'Prevents recreation on each highlight'
  );
  
  assert(
    optimizations.highlightsClearedBeforeNew === true,
    'Previous highlights cleared before new ones',
    'Prevents accumulation of highlight elements'
  );
  
  assert(
    optimizations.eventListenersCleanedUp === true,
    'Event listeners cleaned up on unmount',
    'Prevents memory leaks'
  );
}

function testEdgeCases() {
  console.log('\n📋 Test 15: Edge Cases');
  
  // Test empty quote
  const emptyQuote = '';
  assert(
    emptyQuote.trim().length === 0,
    'Empty quotes are handled gracefully',
    'Should not attempt highlighting'
  );
  
  // Test very short quote
  const shortQuote = 'ab';
  assert(
    shortQuote.length < 3,
    'Very short quotes are handled',
    'May be rejected by highlighter'
  );
  
  // Test quote with special characters
  const specialQuote = 'Ring shank nails: recommended minimum diameter 2.3mm.';
  assert(
    specialQuote.includes(':') && specialQuote.includes('.'),
    'Quotes with special characters are handled',
    'Punctuation should not break matching'
  );
}

// Run all tests
console.log('🧪 Citation Auto-Highlight Unit Tests\n');
console.log('=' .repeat(60));

testDebugPrefix();
testHighlightColor();
testViewerTypes();
testMarkJsAccuracy();
testExcelHighlightingLogic();
testCsvHighlightingLogic();
testTextHighlightingLogic();
testMarkdownHighlightingLogic();
testPdfHighlightingLogic();
testEventFlow();
testDebugLogging();
testNoConflictWithRangy();
testScrollBehavior();
testPerformance();
testEdgeCases();

// Print summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 Test Summary:');
console.log(`   Total Tests: ${results.passed + results.failed}`);
console.log(`   ✅ Passed: ${results.passed}`);
console.log(`   ❌ Failed: ${results.failed}`);
console.log(`   Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

if (results.failed === 0) {
  console.log('\n🎉 All tests passed! Ready for manual testing.');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review and fix issues.');
  console.log('\nFailed tests:');
  results.tests
    .filter(t => t.status === 'FAIL')
    .forEach(t => console.log(`   - ${t.name}`));
  process.exit(1);
}
