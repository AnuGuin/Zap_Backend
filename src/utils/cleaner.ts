export const cleanText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ') 
    .replace(/[^\w\s.,?!-]/g, '') 
    .trim();
};
