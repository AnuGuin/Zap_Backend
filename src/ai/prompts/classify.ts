export const classifyPrompt = (text: string) => `
Classify the following text into one of these categories: Technical, Business, Personal, News, Other.
Return only the category name.

Text:
${text}

Category:
`;
