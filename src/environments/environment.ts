/**
 * Entorno por defecto = producción.
 * El build/serve de development reemplaza este archivo por environment.development.ts.
 *
 * apiBaseUrl `/api` asume despliegue bajo el mismo origen (reverse proxy hacia Spring Boot).
 * No hay URL absoluta de producción definida todavía.
 */
export const environment = {
  production: true,
  apiBaseUrl: '/api',
};
