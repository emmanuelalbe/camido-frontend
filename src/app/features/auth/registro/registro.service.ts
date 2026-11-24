import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface CategoriaCatalogo {
  id: string;
  codigo: string;
  nombre: string;
  orden: number;
}

export type IntencionIncorporacion = 'ALUMNO' | 'PROFESOR' | 'ORGANIZADOR';

export interface RegistroCuenta {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  fechaNacimiento: string;
  intencion: IntencionIncorporacion;
  categoriaId?: string;
}

@Injectable({ providedIn: 'root' })
export class RegistroService {
  private readonly http = inject(HttpClient);

  categorias(): Observable<CategoriaCatalogo[]> {
    return this.http.get<CategoriaCatalogo[]>(`${environment.apiBaseUrl}/categorias`);
  }

  registrar(datos: RegistroCuenta): Observable<string> {
    return this.http.post(`${environment.apiBaseUrl}/usuarios/registro`, datos, {
      responseType: 'text',
    });
  }
}
