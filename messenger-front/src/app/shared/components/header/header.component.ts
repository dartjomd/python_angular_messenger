import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { HeaderService } from '../../../core/services/header.service';
import { AvatarComponent } from '../avatar/avatar.component';
import { AuthService, UserProfile } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, AvatarComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss', './chat-header.component.scss']
})
export class HeaderComponent {
  protected headerService = inject(HeaderService);
  private router = inject(Router);
  protected auth = inject(AuthService)

  protected user = signal<UserProfile | null>(this.auth.currentUser())

  goBack() {
    this.headerService.resetToDefault();
    this.router.navigate(['/chats']); // или на главную /chats
  }
}