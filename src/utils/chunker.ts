export const chunkText = (text: string, chunkSize: number = 1000, overlap: number = 200): string[] => {
  if (!text) return [];
  
  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;
    
    if (endIndex < text.length) {
      // Try to find a natural break point (newline, period, space)
      const lookback = text.slice(startIndex, endIndex);
      const lastNewLine = lookback.lastIndexOf('\n');
      const lastPeriod = lookback.lastIndexOf('. ');
      const lastSpace = lookback.lastIndexOf(' ');

      if (lastNewLine !== -1 && lastNewLine > chunkSize * 0.5) {
        endIndex = startIndex + lastNewLine + 1;
      } else if (lastPeriod !== -1 && lastPeriod > chunkSize * 0.5) {
        endIndex = startIndex + lastPeriod + 1;
      } else if (lastSpace !== -1 && lastSpace > chunkSize * 0.5) {
        endIndex = startIndex + lastSpace + 1;
      }
    }

    chunks.push(text.slice(startIndex, endIndex).trim());
    startIndex = endIndex - overlap;
    
    // Prevent infinite loops if overlap >= chunkSize (shouldn't happen with defaults)
    if (startIndex >= endIndex) {
        startIndex = endIndex;
    }
  }

  return chunks;
};
