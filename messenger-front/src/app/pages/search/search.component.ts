import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap, tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { UserService, UserSearchResult } from '../../core/services/user.service';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss'
})
export class SearchComponent {
  private userService = inject(UserService);

  // 1. Делаем строку поиска сигналом
  searchQuery = signal<string>('');
  
  // 2. Дополнительные состояния тоже переводим на сигналы
  isLoading = signal<boolean>(false);
  hasSearched = signal<boolean>(false);

  // 3. Магия декларативного поиска через Сигналы и RxJS
  usersList = toSignal<UserSearchResult[], UserSearchResult[]>(
    // Превращаем сигнал searchQuery в Observable поток
    toObservable(this.searchQuery).pipe(
      debounceTime(300), // Ждем 300мс после ввода
      distinctUntilChanged(), // Стреляем, только если текст реально изменился
      tap((query) => {
        // Управляем состояниями лоадера прямо в потоке
        if (!query.trim()) {
          this.isLoading.set(false);
          this.hasSearched.set(false);
        } else {
          this.isLoading.set(true);
          this.hasSearched.set(true);
        }
      }),
      switchMap((query) => {
        if (!query.trim()) return of([]);
        return this.userService.searchUsers(query).pipe(
          tap(() => this.isLoading.set(false)), // Выключаем лоадер при успехе
          catchError((err) => {
            console.error('Ошибка при поиске пользователей:', err);
            this.isLoading.set(false);
            return of([]); // Гасим ошибку и возвращаем пустой массив
          })
        );
      })
    ),
    { initialValue: [] } // Начальное значение для сигнала usersList
  );

  // Метод вызывается при каждом нажатии клавиши в инпуте
  onSearchChange(value: string): void {
    this.searchQuery.set(value); // Просто обновляем значение сигнала
  }

  onWriteMessage(user: UserSearchResult): void {
    console.log(`Нажата кнопка "Написать" для пользователя: ${user.username} (ID: ${user.id})`);
  }
}