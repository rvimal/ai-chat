import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { McpService } from '../../services/mcp/mcp.service';
import { McpServer } from '../../models';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container py-4">
      <h2 class="mb-4">Settings</h2>

      <!-- MCP Servers Section -->
      <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="mb-0">MCP Servers</h5>
          <button class="btn btn-sm btn-primary" (click)="showAddServer = true">
            Add Server
          </button>
        </div>
        <div class="card-body">
          @if (showAddServer) {
            <div class="border rounded p-3 mb-3">
              <h6>Add New MCP Server</h6>
              <div class="mb-2">
                <label class="form-label">Name</label>
                <input type="text" class="form-control" [(ngModel)]="newServer.name">
              </div>
              <div class="mb-2">
                <label class="form-label">Description</label>
                <input type="text" class="form-control" [(ngModel)]="newServer.description">
              </div>
              <div class="mb-2">
                <label class="form-label">URL</label>
                <input type="text" class="form-control" [(ngModel)]="newServer.url">
              </div>
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-primary" (click)="addServer()">Add</button>
                <button class="btn btn-sm btn-secondary" (click)="cancelAddServer()">Cancel</button>
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
                    <div>
                      <h6 class="mb-1">{{ server.name }}</h6>
                      <p class="mb-1 text-muted small">{{ server.description }}</p>
                      <small class="text-muted">{{ server.url }}</small>
                      @if (server.isActive) {
                        <span class="badge bg-success ms-2">Active</span>
                      }
                    </div>
                    <div class="btn-group">
                      <button 
                        class="btn btn-sm"
                        [class.btn-success]="!server.isActive"
                        [class.btn-warning]="server.isActive"
                        (click)="toggleServer(server)">
                        {{ server.isActive ? 'Disconnect' : 'Connect' }}
                      </button>
                      <button class="btn btn-sm btn-danger" (click)="deleteServer(server.id)">
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

      <!-- API Configuration -->
      <div class="card mb-4">
        <div class="card-header">
          <h5 class="mb-0">LLM API Configuration</h5>
        </div>
        <div class="card-body">
          <div class="mb-3">
            <label class="form-label">API Endpoint</label>
            <input 
              type="text" 
              class="form-control" 
              placeholder="https://api.example.com/chat"
              [(ngModel)]="apiEndpoint">
            <small class="text-muted">Configure your LLM API endpoint</small>
          </div>
          <div class="mb-3">
            <label class="form-label">API Key</label>
            <input 
              type="password" 
              class="form-control" 
              placeholder="Enter API key"
              [(ngModel)]="apiKey">
          </div>
          <button class="btn btn-primary" (click)="saveApiConfig()">
            Save Configuration
          </button>
        </div>
      </div>

      <!-- About -->
      <div class="card">
        <div class="card-header">
          <h5 class="mb-0">About</h5>
        </div>
        <div class="card-body">
          <p><strong>AI Chat Application</strong></p>
          <p class="text-muted">A ChatGPT-like interface with MCP integration</p>
          <p class="mb-0"><small class="text-muted">Version 1.0.0</small></p>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class SettingsComponent implements OnInit, OnDestroy {
  private mcpService = inject(McpService);
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

  apiEndpoint = '';
  apiKey = '';

  ngOnInit(): void {
    this.mcpService.servers$
      .pipe(takeUntil(this.destroy$))
      .subscribe(servers => {
        this.servers = servers;
      });

    // Load saved API config
    this.apiEndpoint = localStorage.getItem('api-endpoint') || '';
    this.apiKey = localStorage.getItem('api-key') || '';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  addServer(): void {
    if (this.newServer.name && this.newServer.url) {
      this.mcpService.addServer(this.newServer);
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
      alert('Failed to toggle server connection');
    }
  }

  deleteServer(id: string): void {
    if (confirm('Are you sure you want to delete this server?')) {
      this.mcpService.deleteServer(id);
    }
  }

  saveApiConfig(): void {
    localStorage.setItem('api-endpoint', this.apiEndpoint);
    localStorage.setItem('api-key', this.apiKey);
    alert('API configuration saved!');
  }
}
