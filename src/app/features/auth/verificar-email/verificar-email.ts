import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { VerificacionEmailService } from './verificacion-email.service';

export type EstadoVerificacion =
  | 'verificando'
  | 'ok'
  | 'invalido'
  | 'ausente'
  | 'errorRed';

@Component({
  selector: 'app-verificar-email',
  templateUrl: './verificar-email.html',
  styleUrl: './verificar-email.css',
})
export class VerificarEmail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly verificacionEmailService = inject(VerificacionEmailService);

  private solicitudEnCurso = false;

  protected readonly estado = signal<EstadoVerificacion>('verificando');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';
    if (!token) {
      this.estado.set('ausente');
      return;
    }

    this.retirarTokenDeLaUrl();
    this.verificarUnaVez(token);
  }

  private retirarTokenDeLaUrl(): void {
    this.location.replaceState('/verificar-email');
  }

  private verificarUnaVez(token: string): void {
    if (this.solicitudEnCurso) {
      return;
    }
    this.solicitudEnCurso = true;

    this.verificacionEmailService.verificar(token).subscribe({
      next: () => this.estado.set('ok'),
      error: (error: unknown) => this.estado.set(this.mapearError(error)),
    });
  }

  private mapearError(error: unknown): EstadoVerificacion {
    if (!(error instanceof HttpErrorResponse)) {
      return 'errorRed';
    }
    if (error.status === 0 || error.status >= 500) {
      return 'errorRed';
    }
    if (error.status === 400 || error.status === 404) {
      return 'invalido';
    }
    return 'errorRed';
  }
}
