export const cleanText = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[^\w\s.,?!-]/g, '') // Remove special characters except basic punctuation
    .trim();
};
