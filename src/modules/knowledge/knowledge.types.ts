export interface CreateDocumentDto {
  title: string;
  content: string;
  workspaceId: string;
}

export interface SearchQueryDto {
  query: string;
  workspaceId: string;
  limit?: number;
}
