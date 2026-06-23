import { Component, inject, signal, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap, tap, catchError, scan } from 'rxjs/operators';
import { of, combineLatest } from 'rxjs';
import { SearchService, UserSearchResult } from '../../core/services/search.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-users.component.html',
  styleUrl: './search-users.component.scss'
})
export class SearchUsersComponent implements AfterViewInit, OnDestroy {
  private searchService = inject(SearchService);
  private router = inject(Router)

  // Ссылка на невидимый элемент внизу страницы (якорь для скролла)
  @ViewChild('scrollAnchor') scrollAnchor!: ElementRef;
  private observer?: IntersectionObserver;

  searchQuery = signal<string>('');
  isLoading = signal<boolean>(false);
  hasSearched = signal<boolean>(false);

  // Состояния для ленивой загрузки
  offset = signal<number>(0);
  hasMore = signal<boolean>(true);
  loadNextPageTrigger = signal<number>(0);

  usersList = toSignal<UserSearchResult[], UserSearchResult[]>(
    combineLatest([
      toObservable(this.searchQuery).pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => {
          this.offset.set(0);      // Сбрасываем offset при новом поиске
          this.hasMore.set(true);  // Возвращаем флаг доступности данных
        })
      ),
      toObservable(this.loadNextPageTrigger)
    ]).pipe(
      switchMap(([query]) => {
        if (!query.trim()) {
          this.isLoading.set(false);
          this.hasSearched.set(false);
          return of([]);
        }

        // Если данных больше нет на сервере, игнорируем триггер скролла
        if (!this.hasMore() && this.offset() > 0) {
          return of([]);
        }

        this.isLoading.set(true);
        this.hasSearched.set(true);

        return this.searchService.searchUsers(query, this.offset(), 10).pipe(
          tap((newUsers) => {
            this.isLoading.set(false);

            // Если пришло меньше 10 — данные на бэкенде закончились
            if (newUsers.length < 10) {
              this.hasMore.set(false);
            }
            // Сдвигаем offset для следующего запроса
            this.offset.update(prev => prev + newUsers.length);
          }),
          catchError((err) => {
            console.error('Ошибка:', err);
            this.isLoading.set(false);
            return of([]);
          })
        );
      }),
      // Наш реактивный рюкзак. Идеальное условие сброса < 10
      scan((acc, next) => {
        if (this.offset() < 10) {
          return next; // Новый поиск — затираем старое
        }
        return [...acc, ...next]; // Скролл — склеиваем
      }, [] as UserSearchResult[])
    ),
    { initialValue: [] }
  );

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
  }

  // Настройка IntersectionObserver
  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(([entry]) => {
      // Если нижний элемент появился на экране, не идет загрузка и есть что грузить — запрашиваем
      if (
        entry.isIntersecting &&          // 1. Якорь РЕАЛЬНО появился на экране (а не скрылся с него)
        !this.isLoading() &&             // 2. Сейчас НЕ идет другой запрос (чтобы не спамить бэкенд)
        this.hasMore() &&                // 3. Бэкенд не говорил нам, что пользователи закончились
        this.searchQuery().trim()        // 4. Строка поиска не пустая
      ) {
        this.loadNextPageTrigger.update(v => v + 1); // Стреляем!
      }
    }, { rootMargin: '100px' }); // Начнет загрузку за 100px до того, как юзер доскроллит до конца

    this.observer.observe(this.scrollAnchor.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect(); // Защита от утечек памяти
  }

  onWriteMessage(user: UserSearchResult): void {
    // 1. Отправляем запрос на бэкенд
    this.searchService.createOrGetDialog(user.id).subscribe({
      next: (response) => {
        console.log(`Успешно! ${response.message}. ID чата: ${response.chat_id}`);

        // 2. Магия Angular Router: перенаправляем пользователя на страницу чата.
        // URL в браузере мгновенно изменится на /chats/42
        this.router.navigate(['/chats', response.chat_id]);
      },
      error: (err) => {
        console.error('Не удалось открыть чат:', err);
        alert('Ошибка при создании чата. Попробуйте позже.');
      }
    });
  }
}