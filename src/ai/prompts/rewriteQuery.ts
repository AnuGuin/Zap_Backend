export const rewriteQueryPrompt = (query: string, history: string[]) => `
Rewrite the following search query to be more specific and optimized for vector search, taking into account the conversation history.
Return only the rewritten query.

History:
${history.join('\n')}

Query:
${query}

Rewritten Query:
`;
