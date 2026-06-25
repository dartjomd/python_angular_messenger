import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { HeaderService } from '../../../core/services/header.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss', './chat-header.component.scss']
})
export class HeaderComponent {
  protected headerService = inject(HeaderService);
  private router = inject(Router);

  goBack() {
    this.headerService.resetToDefault();
    this.router.navigate(['/chats']); // или на главную /chats
  }
}