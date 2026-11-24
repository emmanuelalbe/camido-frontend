import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { environment } from '../../../../environments/environment';
import { VerificarEmail } from './verificar-email';
import { VerificacionEmailService } from './verificacion-email.service';

describe('VerificarEmail', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'verificar-email',
            component: VerificarEmail,
          },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        VerificacionEmailService,
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  async function navegarConToken(token: string | null): Promise<VerificarEmail> {
    const harness = await RouterTestingHarness.create();
    const url =
      token === null ? '/verificar-email' : `/verificar-email?token=${encodeURIComponent(token)}`;
    return harness.navigateByUrl(url, VerificarEmail);
  }

  it('muestra ausente cuando no hay token y no llama al backend', async () => {
    const component = await navegarConToken(null);
    expect(component['estado']()).toBe('ausente');
    httpMock.expectNone(`${environment.apiBaseUrl}/usuarios/verificacion-email`);
  });

  it('verifica un token válido, muestra ok y limpia el query param', async () => {
    const location = TestBed.inject(Location);
    const component = await navegarConToken('token-valido');

    expect(component['estado']()).toBe('verificando');
    expect(location.path()).toBe('/verificar-email');

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/usuarios/verificacion-email`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: 'token-valido' });
    req.flush({ mensaje: 'Correo verificado' });

    expect(component['estado']()).toBe('ok');
  });

  it('muestra inválido ante HTTP 400', async () => {
    const component = await navegarConToken('token-malo');

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/usuarios/verificacion-email`);
    req.flush(
      { mensaje: 'El enlace es inválido o ha vencido' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(component['estado']()).toBe('invalido');
  });

  it('muestra error de red ante status 0', async () => {
    const component = await navegarConToken('token-red');

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/usuarios/verificacion-email`);
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    expect(component['estado']()).toBe('errorRed');
  });

  it('no dispara una segunda solicitud si verificarUnaVez se llama otra vez', async () => {
    const component = await navegarConToken('token-unico');

    httpMock.expectOne(`${environment.apiBaseUrl}/usuarios/verificacion-email`);

    component['verificarUnaVez']('token-unico');
    httpMock.expectNone(`${environment.apiBaseUrl}/usuarios/verificacion-email`);
  });
});
