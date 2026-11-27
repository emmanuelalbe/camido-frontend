import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { credencialesInterceptor } from '../credenciales.interceptor';
import { Registro } from './registro';

const CATEGORIAS = [
  { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', codigo: 'BLANCO', nombre: 'Blanco', orden: 1 },
  { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', codigo: 'AMARILLO', nombre: 'Amarillo', orden: 3 },
];

describe('Registro', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'registro', component: Registro }]),
        provideHttpClient(
          withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
          withInterceptors([credencialesInterceptor]),
        ),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function crear(): Promise<ComponentFixture<Registro>> {
    const fixture = TestBed.createComponent(Registro);
    fixture.detectChanges();
    http.expectOne(`${environment.apiBaseUrl}/auth/csrf`).flush('');
    http.expectOne(`${environment.apiBaseUrl}/categorias`).flush(CATEGORIAS);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  function completar(fixture: ComponentFixture<Registro>, confirmacion = 'clave-segura-1'): void {
    fixture.componentInstance['form'].setValue({
      nombre: 'Ana',
      apellido: 'Paz',
      email: 'ana@example.com',
      fechaNacimiento: '2000-01-02',
      intencion: 'ALUMNO',
      categoriaId: CATEGORIAS[0].id,
      password: 'clave-segura-1',
      confirmacion,
    });
  }

  it('no envía el registro si faltan datos', async () => {
    const fixture = await crear();
    fixture.componentInstance['enviar']();
    fixture.detectChanges();
    http.expectNone(`${environment.apiBaseUrl}/usuarios/registro`);
    expect(fixture.nativeElement.textContent).toContain('nombre es obligatorio');
  });

  it('exige que las contraseñas coincidan y que la fecha sea anterior a hoy', async () => {
    const fixture = await crear();
    completar(fixture, 'otra-clave-1');
    fixture.componentInstance['form'].controls.fechaNacimiento.setValue('2999-01-01');
    fixture.componentInstance['enviar']();
    fixture.detectChanges();
    http.expectNone(`${environment.apiBaseUrl}/usuarios/registro`);
    expect(fixture.nativeElement.textContent).toContain('no coinciden');
    expect(fixture.nativeElement.textContent).toContain('anterior a hoy');
  });

  it('muestra el catálogo y registra la categoría elegida', async () => {
    const fixture = await crear();
    expect(fixture.nativeElement.textContent).toContain('Blanco');
    expect(fixture.nativeElement.textContent).toContain('Amarillo');
    completar(fixture);
    fixture.componentInstance['enviar']();
    expect(fixture.componentInstance['enviando']()).toBe(true);
    const req = http.expectOne(`${environment.apiBaseUrl}/usuarios/registro`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body.intencion).toBe('ALUMNO');
    expect(req.request.body.categoriaId).toBe(CATEGORIAS[0].id);
    expect(req.request.body.confirmacion).toBeUndefined();
    req.flush('"11111111-1111-1111-1111-111111111111"');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Cuenta creada');
    expect(fixture.nativeElement.textContent).toContain('Si la verificación de correo está activa');
    expect(fixture.nativeElement.textContent).toContain('Iniciar sesión');
    expect(fixture.nativeElement.querySelector('a[href="/login"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('a[href="/verificar-email"]')).toBeTruthy();
  });

  it('exige categoría a alumno y profesor, y no al organizador', async () => {
    const fixture = await crear();
    completar(fixture);
    fixture.componentInstance['form'].controls.categoriaId.setValue('');

    fixture.componentInstance['form'].controls.intencion.setValue('ALUMNO');
    fixture.componentInstance['enviar']();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Elegí tu categoría actual');

    fixture.componentInstance['form'].controls.intencion.setValue('PROFESOR');
    fixture.componentInstance['enviar']();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Elegí tu categoría actual');
    http.expectNone(`${environment.apiBaseUrl}/usuarios/registro`);

    fixture.componentInstance['form'].controls.intencion.setValue('ORGANIZADOR');
    fixture.componentInstance['enviar']();
    const req = http.expectOne(`${environment.apiBaseUrl}/usuarios/registro`);
    expect(req.request.body.intencion).toBe('ORGANIZADOR');
    expect(req.request.body.categoriaId).toBeUndefined();
    req.flush('"11111111-1111-1111-1111-111111111111"');
    await fixture.whenStable();
  });

  it('impide un segundo envío mientras el primero está en curso', async () => {
    const fixture = await crear();
    completar(fixture);
    fixture.componentInstance['enviar']();
    fixture.componentInstance['enviar']();
    const req = http.expectOne(`${environment.apiBaseUrl}/usuarios/registro`);
    req.flush('"11111111-1111-1111-1111-111111111111"');
    await fixture.whenStable();
  });

  it('muestra el email duplicado y el error de conexión', async () => {
    const fixture = await crear();
    completar(fixture);
    fixture.componentInstance['enviar']();
    http
      .expectOne(`${environment.apiBaseUrl}/usuarios/registro`)
      .flush({ mensaje: 'El email ya está registrado' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('El email ya está registrado');

    fixture.componentInstance['enviar']();
    http
      .expectOne(`${environment.apiBaseUrl}/usuarios/registro`)
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No pudimos conectar');
  });

  it('informa si no puede cargar el catálogo', async () => {
    const fixture = TestBed.createComponent(Registro);
    fixture.detectChanges();
    http.expectOne(`${environment.apiBaseUrl}/auth/csrf`).flush('');
    http
      .expectOne(`${environment.apiBaseUrl}/categorias`)
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No pudimos cargar las categorías');
    fixture.componentInstance['enviar']();
    http.expectNone(`${environment.apiBaseUrl}/usuarios/registro`);
  });
});
