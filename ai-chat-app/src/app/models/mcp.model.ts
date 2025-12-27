export interface McpServer {
  id: string;
  name: string;
  description: string;
  url: string;
  isActive: boolean;
  capabilities?: string[];
}

export interface McpConfig {
  serverId: string;
  settings: Record<string, any>;
}
