import { Component, input, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './auth-form.component.html',
  styleUrl: './auth-form.component.scss' // Стили забираем из твоего login.component.scss
})
export class AuthFormComponent {
  // Входной параметр: 'login' или 'register'
  mode = input.required<'login' | 'register'>();
  
  // Состояния, которые мы контролируем изнутри
  isLoading = input<boolean>(false);
  errorMessage = input<string | null>(null);

  // Событие отправки данных наружу
  formSubmit = output<any>();

  authForm: FormGroup;

  constructor(private fb: FormBuilder) {
    // Инициализируем форму сразу со всеми полями
    this.authForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]], // Для логина мы это поле отключим
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(50)]]
    });
  }

  ngOnInit() {
    // Если мы в режиме ЛОГИНА, поле email нам не нужно и не должно ломать валидацию
    if (this.mode() === 'login') {
      this.authForm.removeControl('email');
    }
  }

  onSubmit() {
    if (this.authForm.invalid) {
      this.authForm.markAllAsTouched();
      return;
    }
    // Выплевываем валидные данные родителю
    this.formSubmit.emit(this.authForm.value);
  }
}