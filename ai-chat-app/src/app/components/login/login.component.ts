import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid vh-100 d-flex align-items-center justify-content-center">
      <div class="card shadow-lg" style="max-width: 400px; width: 100%;">
        <div class="card-body p-4">
          <h2 class="text-center mb-4">AI Chat</h2>
          
          <div class="mb-3">
            <label for="email" class="form-label">Email</label>
            <input 
              type="email" 
              class="form-control" 
              id="email"
              [(ngModel)]="email"
              placeholder="Enter your email"
              (keydown.enter)="login()">
          </div>

          <div class="mb-3">
            <label for="password" class="form-label">Password</label>
            <input 
              type="password" 
              class="form-control" 
              id="password"
              [(ngModel)]="password"
              placeholder="Enter your password"
              (keydown.enter)="login()">
          </div>

          @if (errorMessage) {
            <div class="alert alert-danger" role="alert">
              {{ errorMessage }}
            </div>
          }

          <button 
            class="btn btn-primary w-100 mb-2" 
            (click)="login()"
            [disabled]="!email || !password">
            Sign In
          </button>

          <button 
            class="btn btn-outline-secondary w-100" 
            (click)="demoLogin()">
            Demo Login
          </button>

          <p class="text-center text-muted mt-3 mb-0">
            <small>Don't have an account? Contact admin</small>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  errorMessage = '';

  login(): void {
    if (!this.email || !this.password) return;

    // For now, use mock login
    this.authService.mockLogin(this.email);
    this.router.navigate(['/']);
  }

  demoLogin(): void {
    this.authService.mockLogin('demo@example.com');
    this.router.navigate(['/']);
  }
}
