import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AuthFormComponent } from '../../shared/components/auth-form/auth-form.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [AuthFormComponent], // Импортируем нашу общую форму
  styleUrl: 'login.component.scss',
  template: `
    <div class="auth-container">
      <app-auth-form 
        mode="login"
        [isLoading]="isLoading()"
        [errorMessage]="errorMessage()"
        (formSubmit)="onLogin($event)">
      </app-auth-form>
    </div>
  `
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  errorMessage = signal<string | null>(null);
  isLoading = signal<boolean>(false);

  onLogin(formData: any) {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login(formData.username, formData.password).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/chats']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.detail || 'Неверный логин или пароль');
      }
    });
  }
}