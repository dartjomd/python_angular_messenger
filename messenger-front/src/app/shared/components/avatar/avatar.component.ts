import { Component, input } from '@angular/core';

@Component({
  selector: 'app-user-logo.component',
  imports: [],
  templateUrl: './avatar.component.html',
  styleUrl: './avatar.component.scss',
})
export class AvatarComponent {
  protected avatarText = input<string>('')
  protected isOnline = input<boolean>(false)
}
