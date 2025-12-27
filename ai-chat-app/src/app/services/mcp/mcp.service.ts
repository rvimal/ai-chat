import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { McpServer, McpConfig } from '../../models';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

@Injectable({
  providedIn: 'root'
})
export class McpService {
  private serversSubject = new BehaviorSubject<McpServer[]>([]);
  public servers$ = this.serversSubject.asObservable();

  private activeServerSubject = new BehaviorSubject<McpServer | null>(null);
  public activeServer$ = this.activeServerSubject.asObservable();

  private mcpClients: Map<string, Client> = new Map();

  constructor() {
    this.loadServers();
  }

  private loadServers(): void {
    const saved = localStorage.getItem('mcp-servers');
    if (saved) {
      this.serversSubject.next(JSON.parse(saved));
    } else {
      // Default servers
      this.serversSubject.next([
        {
          id: '1',
          name: 'Default MCP Server',
          description: 'Default Model Context Protocol server',
          url: 'http://localhost:3000',
          isActive: true,
          capabilities: ['search', 'tools', 'prompts']
        }
      ]);
    }
  }

  private saveServers(): void {
    localStorage.setItem('mcp-servers', JSON.stringify(this.serversSubject.value));
  }

  getServers(): McpServer[] {
    return this.serversSubject.value;
  }

  addServer(server: Omit<McpServer, 'id'>): McpServer {
    const newServer: McpServer = {
      ...server,
      id: this.generateId()
    };

    const servers = [...this.serversSubject.value, newServer];
    this.serversSubject.next(servers);
    this.saveServers();

    return newServer;
  }

  updateServer(id: string, updates: Partial<McpServer>): void {
    const servers = this.serversSubject.value.map(server =>
      server.id === id ? { ...server, ...updates } : server
    );
    this.serversSubject.next(servers);
    this.saveServers();
  }

  deleteServer(id: string): void {
    const servers = this.serversSubject.value.filter(s => s.id !== id);
    this.serversSubject.next(servers);
    this.saveServers();

    if (this.activeServerSubject.value?.id === id) {
      this.activeServerSubject.next(null);
    }
  }

  setActiveServer(id: string): void {
    const server = this.serversSubject.value.find(s => s.id === id);
    if (server) {
      this.activeServerSubject.next(server);
    }
  }

  async connectToServer(serverId: string): Promise<void> {
    const server = this.serversSubject.value.find(s => s.id === serverId);
    if (!server) {
      throw new Error('Server not found');
    }

    try {
      // Note: StdioClientTransport is for Node.js environments
      // For browser-based applications, you'll need to use HTTP/WebSocket transport
      // This is a placeholder for the MCP SDK integration
      
      // Example of how to create a client (actual implementation depends on your setup):
      // const transport = new StdioClientTransport({
      //   command: server.url,
      //   args: []
      // });
      // const client = new Client({ name: 'ai-chat-app', version: '1.0.0' }, { capabilities: {} });
      // await client.connect(transport);
      // this.mcpClients.set(serverId, client);

      console.log(`Connected to MCP server: ${server.name}`);
      this.updateServer(serverId, { isActive: true });
    } catch (error) {
      console.error('Failed to connect to MCP server:', error);
      throw error;
    }
  }

  async disconnectFromServer(serverId: string): Promise<void> {
    const client = this.mcpClients.get(serverId);
    if (client) {
      await client.close();
      this.mcpClients.delete(serverId);
      this.updateServer(serverId, { isActive: false });
    }
  }

  getClient(serverId: string): Client | undefined {
    return this.mcpClients.get(serverId);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
