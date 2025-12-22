const CITATION_REGEX = /(?:\{\{|【)citation:[^}】]+(?:\}\}|】)/g;

export const safeSplitTableLine = (line: string): string[] => {
  const placeholders: string[] = [];
  
  const maskedLine = line.replace(CITATION_REGEX, (match) => {
    placeholders.push(match);
    return `__CITATION_MASK_${placeholders.length - 1}__`;
  });

  return maskedLine
    .split('|')
    .filter(cell => cell.trim())
    .map(cell => {
      return cell.trim().replace(/__CITATION_MASK_(\d+)__/g, (_, index) => {
        return placeholders[parseInt(index, 10)];
      });
    });
};

export const parseCSVLine = (line: string, delimiter: string): string[] => {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
};
