import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service'; // Подправь путь к своему сервису, если он другой

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  onLogout() {
    // 1. Вызываем метод логаута в сервисе (он должен удалить токен из localStorage / сигналов)
    this.authService.logout(); 
    
    // 2. Редиректим на страницу логина
    this.router.navigate(['/login']);
  }
}