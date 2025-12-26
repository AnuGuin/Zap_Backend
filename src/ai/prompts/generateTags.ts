export const generateTagsPrompt = (content: string, userIntent: string) => `
You are an expert AI assistant that analyzes content and generates relevant tags.

Based on the content below and the user's intent for saving it, generate 3-7 highly relevant tags that:
1. Capture the main topics and themes
2. Reflect the user's purpose for saving this content
3. Are specific enough to be useful for searching and organization
4. Use common terminology (avoid overly technical jargon unless necessary)

User's Intent: ${userIntent}

Content:
${content.slice(0, 6000)}

Return ONLY a JSON array of strings representing the tags. Do not include markdown formatting or backticks.

Example Output:
["machine learning", "neural networks", "python tutorial", "beginner-friendly", "data science"]

Tags:
`;
