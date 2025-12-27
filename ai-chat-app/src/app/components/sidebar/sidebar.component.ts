import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { SessionService } from '../../services/session/session.service';
import { Conversation } from '../../models';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, ThemeToggleComponent],
  template: `
    <div class="sidebar">
      <!-- Header -->
      <div class="p-3 border-bottom">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h5 class="mb-0">AI Chat</h5>
          <app-theme-toggle />
        </div>
        <button class="btn btn-primary w-100" (click)="createNewConversation()">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="me-2">
            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
          </svg>
          New Chat
        </button>
      </div>

      <!-- Conversations List -->
      <div class="conversations-list">
        @if (conversations.length === 0) {
          <div class="text-center text-muted p-3">
            <p>No conversations yet</p>
          </div>
        } @else {
          @for (conversation of conversations; track conversation.id) {
            <div 
              class="conversation-item" 
              [class.active]="activeConversation?.id === conversation.id"
              (click)="selectConversation(conversation.id)">
              <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1 text-truncate">
                  <div class="fw-medium text-truncate">{{ conversation.title }}</div>
                  <small class="text-muted">
                    {{ conversation.messages.length }} message{{ conversation.messages.length !== 1 ? 's' : '' }}
                  </small>
                </div>
                <div class="dropdown">
                  <button 
                    class="btn btn-sm btn-link text-muted p-0"
                    type="button"
                    [id]="'dropdown-' + conversation.id"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                    (click)="$event.stopPropagation()">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                    </svg>
                  </button>
                  <ul class="dropdown-menu dropdown-menu-end" [attr.aria-labelledby]="'dropdown-' + conversation.id">
                    <li>
                      <button class="dropdown-item" (click)="renameConversation(conversation)">
                        Rename
                      </button>
                    </li>
                    <li><hr class="dropdown-divider"></li>
                    <li>
                      <button class="dropdown-item text-danger" (click)="deleteConversation(conversation.id)">
                        Delete
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          }
        }
      </div>

      <!-- Footer -->
      <div class="p-3 border-top mt-auto">
        <div class="d-flex justify-content-between align-items-center">
          <small class="text-muted">Settings</small>
          <button class="btn btn-sm btn-outline-secondary" (click)="openSettings()">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
              <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sidebar {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .conversations-list {
      flex: 1;
      overflow-y: auto;
    }
  `]
})
export class SidebarComponent implements OnInit, OnDestroy {
  private sessionService = inject(SessionService);
  private destroy$ = new Subject<void>();

  conversations: Conversation[] = [];
  activeConversation: Conversation | null = null;

  ngOnInit(): void {
    this.sessionService.conversations$
      .pipe(takeUntil(this.destroy$))
      .subscribe(conversations => {
        this.conversations = [...conversations].sort((a, b) => 
          b.updatedAt.getTime() - a.updatedAt.getTime()
        );
      });

    this.sessionService.activeConversation$
      .pipe(takeUntil(this.destroy$))
      .subscribe(conversation => {
        this.activeConversation = conversation;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  createNewConversation(): void {
    this.sessionService.createConversation();
  }

  selectConversation(id: string): void {
    this.sessionService.setActiveConversation(id);
  }

  renameConversation(conversation: Conversation): void {
    const newTitle = prompt('Enter new title:', conversation.title);
    if (newTitle && newTitle.trim()) {
      this.sessionService.renameConversation(conversation.id, newTitle.trim());
    }
  }

  deleteConversation(id: string): void {
    if (confirm('Are you sure you want to delete this conversation?')) {
      this.sessionService.deleteConversation(id);
    }
  }

  openSettings(): void {
    // Navigate to settings or open modal
    alert('Settings feature coming soon!');
  }
}
