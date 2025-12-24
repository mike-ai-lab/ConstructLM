export const renderHighlights = (
  textContent: any,
  viewport: any,
  quote: string,
  highlightLayerRef: HTMLDivElement,
  scaleFactor: number = 10
) => {
  highlightLayerRef.innerHTML = '';

  const normalize = (str: string) => str.replace(/[\s\n\r]+/g, ' ').trim().toLowerCase();
  const normQuote = normalize(quote);
  if (!normQuote || normQuote.length < 3) return;

  let fullText = "";
  const itemMap: { start: number, end: number, item: any }[] = [];
  textContent.items.forEach((item: any) => {
    const str = normalize(item.str);
    if (str) {
      const start = fullText.length;
      fullText += str + ' ';
      itemMap.push({ start, end: fullText.length - 1, item });
    }
  });

  const matchIndex = fullText.indexOf(normQuote);

  if (matchIndex !== -1) {
    const matchEnd = matchIndex + normQuote.length;
    itemMap.forEach(({ start, end, item }) => {
      if (Math.max(start, matchIndex) < Math.min(end, matchEnd)) {
        if (!window.pdfjsLib.Util) return;

        const tx = window.pdfjsLib.Util.transform(viewport.transform, item.transform);
        const fontHeight = Math.hypot(tx[2], tx[3]) / scaleFactor;
        const fontWidth = item.width * viewport.scale / scaleFactor;
        const angle = Math.atan2(tx[1], tx[0]);

        const rect = document.createElement('div');
        Object.assign(rect.style, {
          position: 'absolute',
          left: `${tx[4] / scaleFactor}px`,
          top: `${(tx[5] - Math.hypot(tx[2], tx[3])) / scaleFactor}px`,
          width: `${fontWidth}px`,
          height: `${fontHeight}px`,
          backgroundColor: 'rgba(255, 235, 59, 0.5)',
          border: '1px solid rgba(255, 193, 7, 0.8)',
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
          transform: `rotate(${angle}rad)`,
          transformOrigin: '0% 100%',
          zIndex: 10
        });
        highlightLayerRef.appendChild(rect);
      }
    });
  }
};
