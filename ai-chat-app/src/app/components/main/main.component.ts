import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { ChatComponent } from '../chat/chat.component';

@Component({
  selector: 'app-main',
  imports: [CommonModule, SidebarComponent, ChatComponent],
  template: `
    <div class="chat-container">
      <app-sidebar />
      <app-chat />
    </div>
  `,
  styles: []
})
export class MainComponent {}
