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
