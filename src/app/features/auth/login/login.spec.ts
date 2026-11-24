import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { authGuard } from '../auth.guard';
import { credencialesInterceptor } from '../credenciales.interceptor';
import { Bienvenida } from '../bienvenida/bienvenida';
import { Login } from './login';

describe('Login y sesión', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: Login },
          { path: 'bienvenida', canActivate: [authGuard], component: Bienvenida },
        ]),
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

  async function crearLogin(): Promise<ComponentFixture<Login>> {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    http.expectOne(`${environment.apiBaseUrl}/auth/csrf`).flush('');
    return fixture;
  }

  it('no envía el login si el formulario es inválido', async () => {
    const fixture = await crearLogin();
    fixture.componentInstance['enviar']();
    fixture.detectChanges();
    http.expectNone(`${environment.apiBaseUrl}/auth/login`);
    expect(fixture.nativeElement.textContent).toContain('email válido');
  });

  it('inicia sesión y deja el botón en carga hasta responder', async () => {
    const fixture = await crearLogin();
    const router = TestBed.inject(Router);
    fixture.componentInstance['form'].setValue({ email: 'ana@example.com', password: 'clave-segura-1' });
    fixture.componentInstance['enviar']();
    expect(fixture.componentInstance['enviando']()).toBe(true);
    const req = http.expectOne(`${environment.apiBaseUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush({
      id: '22222222-2222-2222-2222-222222222222',
      nombre: 'Ana',
      apellido: 'Paz',
      email: 'ana@example.com',
      emailVerificado: true,
    });
    await fixture.whenStable();
    expect(router.url).toBe('/bienvenida');
  });

  it('muestra error genérico si las credenciales fallan', async () => {
    const fixture = await crearLogin();
    fixture.componentInstance['form'].setValue({ email: 'ana@example.com', password: 'mala' });
    fixture.componentInstance['enviar']();
    http.expectOne(`${environment.apiBaseUrl}/auth/login`).flush(
      { mensaje: 'No se pudo iniciar sesión' },
      { status: 401, statusText: 'Unauthorized' },
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No se pudo iniciar sesión');
    expect(fixture.nativeElement.textContent).not.toContain('no existe');
  });

  it('muestra error de conexión', async () => {
    const fixture = await crearLogin();
    fixture.componentInstance['form'].setValue({ email: 'ana@example.com', password: 'clave-segura-1' });
    fixture.componentInstance['enviar']();
    http
      .expectOne(`${environment.apiBaseUrl}/auth/login`)
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No pudimos conectar');
  });

  it('el guard redirige a login si no hay sesión', async () => {
    const harness = await RouterTestingHarness.create();
    const pending = harness.navigateByUrl('/bienvenida');
    await new Promise((resolve) => setTimeout(resolve, 0));
    http.expectOne(`${environment.apiBaseUrl}/auth/me`).flush(null, { status: 401, statusText: 'Unauthorized' });
    await pending;
    http.expectOne(`${environment.apiBaseUrl}/auth/csrf`).flush('');
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('restaura la sesión y permite cerrarla', async () => {
    const harness = await RouterTestingHarness.create();
    const pending = harness.navigateByUrl('/bienvenida', Bienvenida);
    await new Promise((resolve) => setTimeout(resolve, 0));
    http.expectOne(`${environment.apiBaseUrl}/auth/me`).flush({
      id: '22222222-2222-2222-2222-222222222222',
      nombre: 'Ana',
      apellido: 'Paz',
      email: 'ana@example.com',
      emailVerificado: true,
    });
    const bienvenida = await pending;
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Ana');

    bienvenida['salir']();
    const logout = http.expectOne(`${environment.apiBaseUrl}/auth/logout`);
    expect(logout.request.method).toBe('POST');
    logout.flush('');
    await harness.fixture.whenStable();
    http.expectOne(`${environment.apiBaseUrl}/auth/csrf`).flush('');
    expect(TestBed.inject(Router).url).toBe('/login');
  });
});
