import { Component, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { AuthFormComponent } from "../../shared/components/auth-form/auth-form.component";

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [AuthFormComponent],
  styleUrl: 'register.component.scss',
  template: `
    <div class="auth-container">
      <app-auth-form 
        mode="register"
        [isLoading]="isLoading()"
        [errorMessage]="errorMessage()"
        (formSubmit)="onRegister($event)">
      </app-auth-form>
    </div>
  `
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  errorMessage = signal<string | null>(null);
  isLoading = signal<boolean>(false);

  onRegister(formData: any) {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Шлем в сервис полный пак: username, email, password
    this.authService.register(formData).subscribe({
      next: () => {
        this.isLoading.set(false);
        // После успешной регистрации можно сразу редиректить на логин или авто-логинить
        this.router.navigate(['/login']); 
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.detail || 'Ошибка при регистрации');
      }
    });
  }
}