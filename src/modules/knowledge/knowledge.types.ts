export interface CreateDocumentDto {
  url: string;
  intent: string;
  workspaceId: string;
}

export interface SearchQueryDto {
  query: string;
  workspaceId: string;
  limit?: number;
}
