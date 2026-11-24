import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly enviando = signal(false);
  protected readonly error = signal('');

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.auth.asegurarCsrf().subscribe();
  }

  protected enviar(): void {
    if (this.form.invalid || this.enviando()) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.error.set('');
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => void this.router.navigateByUrl('/bienvenida'),
      error: (error: unknown) => {
        this.enviando.set(false);
        this.error.set(this.mensaje(error));
      },
    });
  }

  private mensaje(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return 'No pudimos conectar. Revisá tu conexión e intentá de nuevo.';
    }
    if (error instanceof HttpErrorResponse && error.status === 429) {
      return 'Demasiados intentos. Probá más tarde.';
    }
    return 'No se pudo iniciar sesión';
  }
}
