import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { McpService } from '../../services/mcp/mcp.service';
import { ChatService } from '../../services/chat/chat.service';
import { McpServer } from '../../models';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container py-4">
      <h2 class="mb-4">Settings</h2>

      <!-- AI Model Configuration Section -->
      <div class="card mb-4">
        <div class="card-header">
          <h5 class="mb-0">AI Model Configuration</h5>
          <small class="text-muted">Configure AI providers and models</small>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6 mb-3">
              <label class="form-label">Default AI Provider</label>
              <select 
                class="form-select"
                [(ngModel)]="selectedProvider"
                (change)="onProviderChange()">
                @for (provider of getProvidersList(); track provider.key) {
                  <option [value]="provider.key">{{ provider.value.name }}</option>
                }
              </select>
            </div>
            
            <div class="col-md-6 mb-3">
              <label class="form-label">Default Model</label>
              <select 
                class="form-select"
                [(ngModel)]="selectedModel"
                (change)="onModelChange()">
                @for (model of getAvailableModels(); track model.id) {
                  <option [value]="model.id">{{ model.name }} - {{ model.description }}</option>
                }
              </select>
            </div>
          </div>

          <!-- API Key Configuration for providers that need it -->
          @if (requiresApiKey()) {
            <div class="mb-3">
              <label class="form-label">{{ getProviderName() }} API Key</label>
              <div class="input-group">
                <input 
                  type="password" 
                  class="form-control" 
                  [(ngModel)]="apiKey"
                  placeholder="Enter your API key">
                <button 
                  class="btn btn-outline-primary" 
                  type="button"
                  (click)="saveApiKey()">
                  Save
                </button>
              </div>
              <small class="form-text text-muted">
                Your API key is stored securely in your browser's local storage
              </small>
            </div>
          }

          <!-- Current Configuration Display -->
          <div class="alert alert-info">
            <strong>Current Configuration:</strong><br>
            Provider: {{ getProviderName() }}<br>
            Model: {{ getCurrentModelName() }}<br>
            @if (selectedProvider === 'ollama') {
              <small class="text-muted">
                Make sure Ollama is running at http://localhost:11434
              </small>
            }
          </div>
        </div>
      </div>

      <!-- MCP Servers Section -->
      <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
          <div>
            <h5 class="mb-0">MCP Servers</h5>
            <small class="text-muted">Model Context Protocol integrations</small>
          </div>
          <button class="btn btn-sm btn-primary" (click)="showAddServer = true">
            <i class="bi bi-plus-circle"></i> Add Server
          </button>
        </div>
        <div class="card-body">
          @if (showAddServer) {
            <div class="border rounded p-3 mb-3 bg-light">
              <h6 class="mb-3">Add New MCP Server</h6>
              <div class="mb-3">
                <label class="form-label">Name <span class="text-danger">*</span></label>
                <input 
                  type="text" 
                  class="form-control" 
                  [(ngModel)]="newServer.name"
                  placeholder="e.g., File System Server">
              </div>
              <div class="mb-3">
                <label class="form-label">Description</label>
                <input 
                  type="text" 
                  class="form-control" 
                  [(ngModel)]="newServer.description"
                  placeholder="Brief description of the server">
              </div>
              <div class="mb-3">
                <label class="form-label">URL/Command <span class="text-danger">*</span></label>
                <input 
                  type="text" 
                  class="form-control" 
                  [(ngModel)]="newServer.url"
                  placeholder="e.g., http://localhost:3000 or path to executable">
                <small class="form-text text-muted">
                  Enter HTTP/WebSocket URL or path to MCP server executable
                </small>
              </div>
              <div class="mb-3">
                <label class="form-label">Capabilities (comma-separated)</label>
                <input 
                  type="text" 
                  class="form-control" 
                  placeholder="e.g., search, tools, prompts"
                  #capabilitiesInput>
                <small class="form-text text-muted">
                  Optional: Specify server capabilities
                </small>
              </div>
              <div class="d-flex gap-2">
                <button 
                  class="btn btn-sm btn-primary" 
                  (click)="addServer(capabilitiesInput.value)"
                  [disabled]="!newServer.name || !newServer.url">
                  <i class="bi bi-plus-circle"></i> Add Server
                </button>
                <button class="btn btn-sm btn-secondary" (click)="cancelAddServer()">
                  Cancel
                </button>
              </div>
            </div>
          }

          @if (servers.length === 0) {
            <p class="text-muted">No MCP servers configured</p>
          } @else {
            <div class="list-group">
              @for (server of servers; track server.id) {
                <div class="list-group-item">
                  <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                      <div class="d-flex align-items-center gap-2 mb-1">
                        <h6 class="mb-0">{{ server.name }}</h6>
                        @if (server.isActive) {
                          <span class="badge bg-success">Connected</span>
                        }
                      </div>
                      <p class="mb-1 text-muted small">{{ server.description }}</p>
                      <div class="mb-2">
                        <small class="text-muted">
                          <i class="bi bi-link-45deg"></i> {{ server.url }}
                        </small>
                      </div>
                      @if (server.capabilities && server.capabilities.length > 0) {
                        <div class="d-flex gap-1 flex-wrap mb-2">
                          @for (cap of server.capabilities; track cap) {
                            <span class="badge bg-secondary">{{ cap }}</span>
                          }
                        </div>
                      }
                      
                      <!-- Tools Section -->
                      <button 
                        class="btn btn-sm btn-outline-primary mt-2" 
                        (click)="toggleServerDetails(server.id)">
                        <i class="bi" [class.bi-chevron-right]="expandedServerId !== server.id" 
                           [class.bi-chevron-down]="expandedServerId === server.id"></i>
                        {{ expandedServerId === server.id ? 'Hide' : 'View' }} Available Tools
                      </button>
                      
                      @if (expandedServerId === server.id) {
                        <div class="mt-3 p-3 bg-light rounded">
                          @if (isLoadingTools(server.id)) {
                            <div class="text-center">
                              <div class="spinner-border spinner-border-sm" role="status">
                                <span class="visually-hidden">Loading...</span>
                              </div>
                              <small class="ms-2 text-muted">Loading tools...</small>
                            </div>
                          } @else {
                            @if (getServerTools(server.id).length === 0) {
                              <p class="text-muted mb-0">
                                <i class="bi bi-info-circle"></i> No tools available or server not connected
                              </p>
                            } @else {
                              <h6 class="mb-3">Available Tools ({{ getServerTools(server.id).length }})</h6>
                              <div class="accordion accordion-flush" [id]="'accordion-' + server.id">
                                @for (tool of getServerTools(server.id); track tool.name) {
                                  <div class="accordion-item bg-transparent">
                                    <h2 class="accordion-header">
                                      <button 
                                        class="accordion-button collapsed bg-transparent" 
                                        type="button" 
                                        data-bs-toggle="collapse" 
                                        [attr.data-bs-target]="'#tool-' + server.id + '-' + tool.name">
                                        <code class="me-2">{{ tool.name }}</code>
                                        <small class="text-muted">{{ tool.description }}</small>
                                      </button>
                                    </h2>
                                    <div 
                                      [id]="'tool-' + server.id + '-' + tool.name" 
                                      class="accordion-collapse collapse" 
                                      [attr.data-bs-parent]="'#accordion-' + server.id">
                                      <div class="accordion-body">
                                        @if (tool.inputSchema) {
                                          <strong>Parameters:</strong>
                                          <pre class="mt-2 mb-0"><code>{{ tool.inputSchema | json }}</code></pre>
                                        }
                                      </div>
                                    </div>
                                  </div>
                                }
                              </div>
                            }
                          }
                        </div>
                      }
                    </div>
                    <div class="btn-group-vertical btn-group-sm ms-3">
                      <button 
                        class="btn"
                        [class.btn-outline-success]="!server.isActive"
                        [class.btn-outline-warning]="server.isActive"
                        (click)="toggleServer(server)">
                        {{ server.isActive ? 'Disconnect' : 'Connect' }}
                      </button>
                      <button 
                        class="btn btn-outline-danger" 
                        (click)="deleteServer(server.id)">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- About -->
      <div class="card">
        <div class="card-header">
          <h5 class="mb-0">About</h5>
        </div>
        <div class="card-body">
          <p><strong>AI Chat Application</strong></p>
          <p class="text-muted">A modern ChatGPT-like interface with Model Context Protocol (MCP) integration and multi-AI provider support</p>
          
          <div class="mb-3">
            <h6>Features:</h6>
            <ul class="small">
              <li>Real-time streaming chat with multiple AI providers (Ollama, Google Gemini)</li>
              <li>Support for various open-source models via Ollama</li>
              <li>Markdown and code syntax highlighting</li>
              <li>MCP server integration for extended capabilities</li>
              <li>Dark/Light theme support</li>
              <li>Conversation management</li>
            </ul>
          </div>
          
          <div class="mb-3">
            <h6>About MCP:</h6>
            <p class="small text-muted">
              Model Context Protocol (MCP) allows AI assistants to connect to external tools and data sources,
              enabling features like file system access, database queries, web search, and more.
            </p>
          </div>

          <div class="mb-3">
            <h6>Supported AI Providers:</h6>
            <ul class="small">
              <li><strong>Ollama:</strong> Run powerful open-source models locally (Llama, Mistral, CodeLlama, etc.)</li>
              <li><strong>Google Gemini:</strong> Cloud-based AI models with advanced capabilities</li>
            </ul>
          </div>
          
          <p class="mb-0">
            <small class="text-muted">Version 1.0.0 • Built with Angular 19 & TypeScript</small>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class SettingsComponent implements OnInit, OnDestroy {
  private mcpService = inject(McpService);
  private chatService = inject(ChatService);
  private destroy$ = new Subject<void>();

  servers: McpServer[] = [];
  showAddServer = false;
  newServer = {
    name: '',
    description: '',
    url: '',
    isActive: false,
    capabilities: []
  };

  // AI Model Configuration
  selectedProvider: string = '';
  selectedModel: string = '';
  apiKey = '';

  isTestingConnection = false;
  connectionTestResult: { success: boolean; message: string } | null = null;
  expandedServerId: string | null = null;
  serverTools: Map<string, any[]> = new Map();
  loadingTools: Set<string> = new Set();

  ngOnInit(): void {
    this.mcpService.servers$
      .pipe(takeUntil(this.destroy$))
      .subscribe(servers => {
        this.servers = servers;
      });

    // Load AI model configuration
    this.selectedProvider = this.chatService.getCurrentProvider();
    this.selectedModel = this.chatService.getCurrentModel();
    this.apiKey = this.chatService.getApiKey(this.selectedProvider);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // AI Model Configuration Methods
  getProvidersList(): Array<{ key: string, value: any }> {
    const providers = this.chatService.getProviders();
    return Object.keys(providers).map(key => ({ key, value: providers[key] }));
  }

  getAvailableModels() {
    return this.chatService.getAvailableModels(this.selectedProvider);
  }

  onProviderChange(): void {
    this.chatService.setProvider(this.selectedProvider);
    this.selectedModel = this.chatService.getCurrentModel();
    this.apiKey = this.chatService.getApiKey(this.selectedProvider);
  }

  onModelChange(): void {
    this.chatService.setModel(this.selectedModel);
  }

  requiresApiKey(): boolean {
    const providers = this.chatService.getProviders();
    return providers[this.selectedProvider]?.requiresApiKey || false;
  }

  getProviderName(): string {
    const providers = this.chatService.getProviders();
    return providers[this.selectedProvider]?.name || this.selectedProvider;
  }

  getCurrentModelName(): string {
    const models = this.getAvailableModels();
    const model = models.find(m => m.id === this.selectedModel);
    return model?.name || this.selectedModel;
  }

  saveApiKey(): void {
    this.chatService.setApiKey(this.selectedProvider, this.apiKey);
    alert(`${this.getProviderName()} API key saved successfully!`);
  }

  addServer(capabilitiesString: string): void {
    if (this.newServer.name && this.newServer.url) {
      // Parse capabilities from comma-separated string
      const capabilities = capabilitiesString
        ? capabilitiesString.split(',').map(c => c.trim()).filter(c => c)
        : [];
      
      this.mcpService.addServer({
        ...this.newServer,
        capabilities
      });
      this.cancelAddServer();
    }
  }

  cancelAddServer(): void {
    this.showAddServer = false;
    this.newServer = {
      name: '',
      description: '',
      url: '',
      isActive: false,
      capabilities: []
    };
  }

  async toggleServer(server: McpServer): Promise<void> {
    try {
      if (server.isActive) {
        await this.mcpService.disconnectFromServer(server.id);
      } else {
        await this.mcpService.connectToServer(server.id);
      }
    } catch (error) {
      console.error('Error toggling server:', error);
      alert(`Failed to ${server.isActive ? 'disconnect from' : 'connect to'} server: ${error}`);
    }
  }

  async testConnection(server: McpServer): Promise<void> {
    this.isTestingConnection = true;
    this.connectionTestResult = null;

    try {
      await this.mcpService.connectToServer(server.id);
      this.connectionTestResult = {
        success: true,
        message: 'Connection successful!'
      };
      
      // Disconnect after successful test
      setTimeout(async () => {
        await this.mcpService.disconnectFromServer(server.id);
      }, 1000);
    } catch (error) {
      this.connectionTestResult = {
        success: false,
        message: `Connection failed: ${error}`
      };
    } finally {
      this.isTestingConnection = false;
    }
  }

  deleteServer(id: string): void {
    if (confirm('Are you sure you want to delete this server?')) {
      this.mcpService.deleteServer(id);
    }
  }

  async toggleServerDetails(serverId: string): Promise<void> {
    if (this.expandedServerId === serverId) {
      this.expandedServerId = null;
    } else {
      this.expandedServerId = serverId;
      // Always reload tools when expanding to get fresh data
      this.serverTools.delete(serverId);
      await this.loadTools(serverId);
    }
  }

  async loadTools(serverId: string): Promise<void> {
    console.log('[Settings] loadTools called for server:', serverId);
    
    if (this.serverTools.has(serverId) && !this.loadingTools.has(serverId)) {
      console.log('[Settings] Tools already loaded for server:', serverId);
      return; // Already loaded
    }

    this.loadingTools.add(serverId);
    try {
      console.log('[Settings] Calling mcpService.listTools...');
      const tools = await this.mcpService.listTools(serverId);
      console.log('[Settings] Received tools:', tools);
      this.serverTools.set(serverId, tools);
    } catch (error) {
      console.error('[Settings] Failed to load tools:', error);
      this.serverTools.set(serverId, []);
    } finally {
      this.loadingTools.delete(serverId);
    }
  }

  getServerTools(serverId: string): any[] {
    return this.serverTools.get(serverId) || [];
  }

  isLoadingTools(serverId: string): boolean {
    return this.loadingTools.has(serverId);
  }
}
