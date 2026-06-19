import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router'; // <-- Проверь этот импорт

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet], // <-- И добавление в импорты
  templateUrl: './app.html',
  styleUrl: './app.scss' // или .css
})
export class App {
  title = 'messenger-front';
}