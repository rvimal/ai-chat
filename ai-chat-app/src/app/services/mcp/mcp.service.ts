import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { McpServer, McpConfig } from '../../models';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

@Injectable({
  providedIn: 'root'
})
export class McpService {
  private serversSubject = new BehaviorSubject<McpServer[]>([]);
  public servers$ = this.serversSubject.asObservable();

  private activeServerSubject = new BehaviorSubject<McpServer | null>(null);
  public activeServer$ = this.activeServerSubject.asObservable();

  private mcpClients: Map<string, Client> = new Map();
  private sessionIds: Map<string, string> = new Map();
  private toolsCache: Map<string, any[]> = new Map();

  constructor() {
    this.loadServers();
    this.loadSessionIds();
    this.reconnectActiveServers();
  }

  private loadServers(): void {
    const saved = localStorage.getItem('mcp-servers');
    if (saved) {
      this.serversSubject.next(JSON.parse(saved));
    } else {
      this.serversSubject.next([]);
    }
  }

  private saveServers(): void {
    localStorage.setItem('mcp-servers', JSON.stringify(this.serversSubject.value));
  }

  private loadSessionIds(): void {
    const saved = localStorage.getItem('mcp-session-ids');
    if (saved) {
      const sessionData = JSON.parse(saved);
      this.sessionIds = new Map(Object.entries(sessionData));
    }
  }

  private saveSessionIds(): void {
    const sessionData = Object.fromEntries(this.sessionIds);
    localStorage.setItem('mcp-session-ids', JSON.stringify(sessionData));
  }

  private async reconnectActiveServers(): Promise<void> {
    const activeServers = this.serversSubject.value.filter(s => s.isActive);
    console.log('[MCP Service] Reconnecting active servers:', activeServers.length);
    
    for (const server of activeServers) {
      try {
        await this.connectToServer(server.id);
        console.log(`[MCP Service] Reconnected to ${server.name}`);
      } catch (error) {
        console.error(`[MCP Service] Failed to reconnect to ${server.name}:`, error);
        // Mark as inactive if reconnection fails
        this.updateServer(server.id, { isActive: false });
      }
    }
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
      console.log('[MCP Service] Connecting to server:', server);
      
      // Reuse existing session ID or generate new one
      let sessionId = this.sessionIds.get(serverId);
      if (!sessionId) {
        sessionId = this.generateSessionId();
        this.sessionIds.set(serverId, sessionId);
        this.saveSessionIds();
      }
      console.log('[MCP Service] Using session ID:', sessionId);
      
      // Create MCP client
      const client = new Client(
        { name: 'ai-chat-app', version: '1.0.0' },
        { capabilities: {} }
      );

      // Use StreamableHTTP transport with session ID
      const transport = new StreamableHTTPClientTransport(
        new URL(server.url),
        {
          sessionId: sessionId
        }
      );
      
      console.log('[MCP Service] Initiating connection with session ID...');
      await client.connect(transport);
      
      this.mcpClients.set(serverId, client);
      console.log('[MCP Service] Connected successfully. Client stored.');

      this.updateServer(serverId, { isActive: true });
      
      // Preload tools into cache
      await this.loadToolsIntoCache(serverId);
    } catch (error) {
      console.error('[MCP Service] Failed to connect to MCP server:', error);
      this.sessionIds.delete(serverId);
      this.saveSessionIds();
      this.updateServer(serverId, { isActive: false });
      throw error;
    }
  }

  async disconnectFromServer(serverId: string): Promise<void> {
    const client = this.mcpClients.get(serverId);
    if (client) {
      await client.close();
      this.mcpClients.delete(serverId);
      this.sessionIds.delete(serverId);
      this.saveSessionIds();
      this.toolsCache.delete(serverId);
      this.updateServer(serverId, { isActive: false });
    }
  }

  getClient(serverId: string): Client | undefined {
    return this.mcpClients.get(serverId);
  }

  getSessionId(serverId: string): string | undefined {
    return this.sessionIds.get(serverId);
  }

  private async loadToolsIntoCache(serverId: string): Promise<void> {
    try {
      console.log('[MCP Service] Loading tools into cache for server:', serverId);
      const client = this.mcpClients.get(serverId);
      
      if (!client) {
        console.warn('[MCP Service] No client found for preloading tools');
        return;
      }

      const response = await client.listTools(
        {
          _meta: {
            progressToken: 1
          }
        },
        {}
      );
      
      const tools = (response as any).tools || [];
      this.toolsCache.set(serverId, tools);
      console.log(`[MCP Service] Cached ${tools.length} tools for server ${serverId}`);
    } catch (error) {
      console.error(`[MCP Service] Failed to load tools into cache:`, error);
      this.toolsCache.set(serverId, []);
    }
  }

  async listTools(serverId: string): Promise<any[]> {
    console.log('[MCP Service] listTools called for server:', serverId);
    
    const server = this.serversSubject.value.find(s => s.id === serverId);
    
    if (!server) {
      console.error('[MCP Service] Server not found:', serverId);
      throw new Error(`Server with id ${serverId} not found`);
    }
    
    console.log('[MCP Service] Server found:', server);
    console.log('[MCP Service] Server isActive:', server.isActive);
    
    if (!server.isActive) {
      console.warn('[MCP Service] Server is not connected');
      throw new Error(`Server ${server.name} is not connected`);
    }
    
    // Check cache first
    const cachedTools = this.toolsCache.get(serverId);
    if (cachedTools && cachedTools.length > 0) {
      console.log(`[MCP Service] Returning ${cachedTools.length} tools from cache`);
      return cachedTools;
    }
    
    const client = this.mcpClients.get(serverId);
    console.log('[MCP Service] Client found:', !!client);
    
    if (!client) {
      console.warn('[MCP Service] No client found for server');
      return [];
    }

    try {
      console.log('[MCP Service] Sending tools/list request...');
      
      // Use the MCP client's listTools method
      const response = await client.listTools(
        {
          _meta: {
            progressToken: 1
          }
        },
        {}
      );
      
      const tools = (response as any).tools || [];
      console.log('[MCP Service] Tools response:', tools);
      
      // Update cache
      this.toolsCache.set(serverId, tools);
      
      return tools;
    } catch (error) {
      console.error(`[MCP Service] Failed to list tools for server ${serverId}:`, error);
      // Return empty array instead of throwing to gracefully handle errors
      return [];
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
