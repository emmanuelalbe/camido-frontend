import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UsuarioSesion {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  emailVerificado: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly usuario = signal<UsuarioSesion | null | undefined>(undefined);
  private carga$: Observable<UsuarioSesion | null> | null = null;

  readonly sesion = this.usuario.asReadonly();

  asegurarCsrf(): Observable<void> {
    return this.http.get(`${environment.apiBaseUrl}/auth/csrf`, { responseType: 'text' }).pipe(
      map(() => undefined),
      catchError(() => of(undefined)),
    );
  }

  login(email: string, password: string): Observable<UsuarioSesion> {
    return this.http
      .post<UsuarioSesion>(`${environment.apiBaseUrl}/auth/login`, { email, password })
      .pipe(tap((usuario) => this.usuario.set(usuario)));
  }

  cargarSesion(forzar = false): Observable<UsuarioSesion | null> {
    if (!forzar && this.usuario() !== undefined) {
      return of(this.usuario() ?? null);
    }
    if (!forzar && this.carga$) {
      return this.carga$;
    }
    this.carga$ = this.http.get<UsuarioSesion>(`${environment.apiBaseUrl}/auth/me`).pipe(
      tap((usuario) => this.usuario.set(usuario)),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
          this.usuario.set(null);
          return of(null);
        }
        return throwError(() => error);
      }),
      shareReplay(1),
    );
    return this.carga$;
  }

  logout(): Observable<void> {
    return this.http.post(`${environment.apiBaseUrl}/auth/logout`, null, { responseType: 'text' }).pipe(
      tap(() => {
        this.usuario.set(null);
        this.carga$ = null;
      }),
      map(() => undefined),
    );
  }
}
