import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { CategoriaCatalogo, IntencionIncorporacion, RegistroCuenta, RegistroService } from './registro.service';

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class Registro implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly registro = inject(RegistroService);
  private readonly auth = inject(AuthService);

  protected readonly categorias = signal<CategoriaCatalogo[]>([]);
  protected readonly cargandoCatalogo = signal(true);
  protected readonly enviando = signal(false);
  protected readonly error = signal('');
  protected readonly listo = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      apellido: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(320)]],
      fechaNacimiento: ['', [Validators.required, fechaAnteriorAHoy()]],
      intencion: [''],
      categoriaId: [''],
      password: ['', [Validators.required, Validators.minLength(8), maximo72Bytes()]],
      confirmacion: ['', [Validators.required]],
    },
    { validators: [contrasenasIguales(), intencionYCategoria()] },
  );

  ngOnInit(): void {
    this.auth.asegurarCsrf().subscribe();
    this.registro.categorias().subscribe({
      next: (categorias) => {
        this.categorias.set([...categorias].sort((a, b) => a.orden - b.orden));
        this.cargandoCatalogo.set(false);
      },
      error: () => {
        this.cargandoCatalogo.set(false);
        this.error.set('No pudimos cargar las categorías. Revisá tu conexión e intentá de nuevo.');
      },
    });
  }

  protected enviar(): void {
    if (this.form.invalid || this.enviando() || this.cargandoCatalogo()) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.error.set('');
    const datos = this.form.getRawValue();
    const cuenta: RegistroCuenta = {
      nombre: datos.nombre,
      apellido: datos.apellido,
      email: datos.email,
      password: datos.password,
      fechaNacimiento: datos.fechaNacimiento,
      intencion: datos.intencion as IntencionIncorporacion,
    };
    if (datos.categoriaId) {
      cuenta.categoriaId = datos.categoriaId;
    }
    this.registro
      .registrar(cuenta)
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.listo.set(true);
        },
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
    if (error instanceof HttpErrorResponse && error.status === 409) {
      return 'El email ya está registrado';
    }
    return 'No se pudo crear la cuenta. Revisá los datos e intentá de nuevo.';
  }
}

function fechaAnteriorAHoy(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = String(control.value ?? '');
    if (!valor) {
      return null;
    }
    const hoy = new Date();
    const fecha = valor.split('-').map(Number);
    if (fecha.length !== 3 || fecha.some((parte) => Number.isNaN(parte))) {
      return { fecha: true };
    }
    const [anio, mes, dia] = fecha;
    const ingresada = new Date(anio, mes - 1, dia);
    const limite = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    return ingresada < limite ? null : { fecha: true };
  };
}

function maximo72Bytes(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = String(control.value ?? '');
    if (!valor) {
      return null;
    }
    return new TextEncoder().encode(valor).length <= 72 ? null : { bytes: true };
  };
}

function intencionYCategoria(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const intencion = control.get('intencion')?.value;
    const categoria = control.get('categoriaId')?.value;
    if (!intencion) {
      return { intencion: true };
    }
    if ((intencion === 'ALUMNO' || intencion === 'PROFESOR') && !categoria) {
      return { categoria: true };
    }
    return null;
  };
}

function contrasenasIguales(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password')?.value;
    const confirmacion = control.get('confirmacion')?.value;
    return password === confirmacion ? null : { noCoincide: true };
  };
}
