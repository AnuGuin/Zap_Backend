export const extractEntitiesPrompt = (text: string) => `
You are an expert Knowledge Graph engineer.
Identify the top 3-5 most important unique entities (People, Organizations, Technologies, Locations) in the text below.
Ignore generic terms. Focus on specific proper nouns that would have a Wikipedia page.

Return ONLY a JSON array of strings. Do not include markdown formatting or backticks.

Example Output:
["Elon Musk", "SpaceX", "Mars"]

Text:
${text.slice(0, 5000)}
`;