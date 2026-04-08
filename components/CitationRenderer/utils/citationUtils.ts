export const SPLIT_REGEX = /((?:\{\{|【)citation:[^}】]*(?:\}\}|】))/g;
export const MATCH_REGEX = /(?:\{\{|【)citation:([^|]*?)\|([^|]*?)\|([^}】]*?)(?:\}\}|】)/s;

let citationCounter = 0;

export const resetCitationCounter = () => { 
  citationCounter = 0; 
};

export const incrementCitationCounter = () => {
  citationCounter++;
  return citationCounter - 1;
};

export const getCitationCounter = () => citationCounter;

export const isUrlCitation = (source: string): boolean => {
  return source.startsWith('http://') || source.startsWith('https://');
};

export const isImageCitation = (fileName: string): boolean => {
  const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'];
  return imageExts.some(ext => fileName.toLowerCase().endsWith(ext));
};

export interface ImageRegion {
  type: 'grid' | 'bbox';
  zone?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

export const parseImageRegion = (location: string): ImageRegion | null => {
  const gridMatch = location.match(/region:([\w-]+)/);
  if (gridMatch) {
    return { type: 'grid', zone: gridMatch[1] };
  }
  
  const bboxMatch = location.match(/bbox:([\d.]+),([\d.]+),([\d.]+),([\d.]+)/);
  if (bboxMatch) {
    return {
      type: 'bbox',
      x: parseFloat(bboxMatch[1]),
      y: parseFloat(bboxMatch[2]),
      w: parseFloat(bboxMatch[3]),
      h: parseFloat(bboxMatch[4])
    };
  }
  
  return null;
};

export const gridToCoords = (zone: string): { x: number; y: number; w: number; h: number } => {
  const zones: Record<string, { x: number; y: number; w: number; h: number }> = {
    'top-left': { x: 0, y: 0, w: 33, h: 33 },
    'top': { x: 33, y: 0, w: 34, h: 33 },
    'top-right': { x: 67, y: 0, w: 33, h: 33 },
    'left': { x: 0, y: 33, w: 33, h: 34 },
    'center': { x: 33, y: 33, w: 34, h: 34 },
    'right': { x: 67, y: 33, w: 33, h: 34 },
    'bottom-left': { x: 0, y: 67, w: 33, h: 33 },
    'bottom': { x: 33, y: 67, w: 34, h: 33 },
    'bottom-right': { x: 67, y: 67, w: 33, h: 33 }
  };
  return zones[zone] || zones['center'];
};

export const extractSourceFiles = (text: string): Set<string> => {
  const citationMatches = text.match(/(?:\{\{|【)citation:[^}】]+(?:\}\}|】)/g) || [];
  const sourceFiles = new Set<string>();
  
  citationMatches.forEach((citation: string) => {
    const match = citation.match(MATCH_REGEX);
    if (match) {
      sourceFiles.add(match[1].trim());
    }
  });
  
  return sourceFiles;
};
