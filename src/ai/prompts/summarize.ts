export const summarizePrompt = (text: string) => `
You are an expert summarizer. Please provide a concise summary of the following text.
Focus on the key points and main ideas.

Text:
${text}

Summary:
`;
