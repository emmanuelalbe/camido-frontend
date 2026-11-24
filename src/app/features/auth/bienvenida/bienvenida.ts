import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-bienvenida',
  templateUrl: './bienvenida.html',
  styleUrl: './bienvenida.css',
})
export class Bienvenida {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly sesion = this.auth.sesion;

  protected salir(): void {
    this.auth.logout().subscribe({
      next: () => void this.router.navigateByUrl('/login'),
    });
  }
}
