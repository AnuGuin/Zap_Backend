export interface ChatRequestDto {
  message: string;
  workspaceId: string;
  documentId?: string; // Optional: if we want to chat with a specific document
  history?: { role: 'user' | 'model'; content: string }[];
}

export interface ChatResponseDto {
  response: string;
  sources: { id: string; content: string; documentId: string; similarity: number }[];
}
