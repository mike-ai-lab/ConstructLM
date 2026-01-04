// Markdown preview now uses DocumentViewer which properly renders markdown
if (file.type === 'markdown') {
  return <DocumentViewer file={file} onClose={onClose} />;
}
