import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ChatComponent } from '../chat/chat.component';
import { SettingsComponent } from '../settings/settings.component';

@Component({
  selector: 'app-main',
  imports: [CommonModule, SidebarComponent, ChatComponent, SettingsComponent],
  template: `
    <div class="chat-container">
      <app-sidebar (settingsClick)="toggleSettings()" />
      @if (showSettings()) {
        <div class="settings-container">
          <div class="settings-header">
            <h4>Settings</h4>
            <button class="btn btn-sm btn-close" (click)="toggleSettings()"></button>
          </div>
          <app-settings />
        </div>
      } @else {
        <app-chat />
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
    }

    .settings-container {
      flex: 1;
      overflow-y: auto;
      background: var(--bs-body-bg);
    }

    .settings-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--bs-border-color);
      position: sticky;
      top: 0;
      background: var(--bs-body-bg);
      z-index: 10;
    }

    .settings-header h4 {
      margin: 0;
    }
  `]
})
export class MainComponent {
  showSettings = signal(false);

  toggleSettings(): void {
    this.showSettings.update(v => !v);
  }
}
