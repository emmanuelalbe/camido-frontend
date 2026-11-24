import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface MensajeVerificacion {
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class VerificacionEmailService {
  private readonly http = inject(HttpClient);

  verificar(token: string): Observable<MensajeVerificacion> {
    return this.http.post<MensajeVerificacion>(
      `${environment.apiBaseUrl}/usuarios/verificacion-email`,
      { token },
    );
  }
}
