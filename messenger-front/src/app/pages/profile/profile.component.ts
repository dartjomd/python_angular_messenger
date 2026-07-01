import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, AvatarComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Создаем readonly-ссылку на сигнал из сервиса для шаблона
  // Благодаря этому, если сигнал в сервисе изменится — шаблон перерисуется сам
  user = this.authService.currentUser;

  onLogout() {
    this.authService.logout().subscribe({
      next: () => this.redirectToLogin(),
      error: () => this.redirectToLogin()
    });
  }

  onLogoutAllDevices() {
    if (confirm('Вы уверены, что хотите завершить все сессии на других устройствах?')) {
      this.authService.logoutAllDevices().subscribe({
        next: () => {
          alert('Все сессии успешно завершены!');
          this.redirectToLogin();
        },
        error: (err) => {
          alert('Ошибка при завершении сессий');
          console.error(err);
        }
      });
    }
  }

  private redirectToLogin() {
    this.router.navigate(['/login']);
  }
}