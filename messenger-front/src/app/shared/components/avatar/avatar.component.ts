import { Component, input } from '@angular/core';

@Component({
  selector: 'app-avatar',
  imports: [],
  templateUrl: './avatar.component.html',
  styleUrl: './avatar.component.scss',
})
export class AvatarComponent {
  avatarText = input<string>('')
  isOnline = input<boolean>(false)
  isGroup = input<boolean>(false)
}
