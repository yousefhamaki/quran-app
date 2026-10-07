import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';

export class SwaggerConfig {
  /** Builds the OpenAPI document from the @openapi blocks in the route files. */
  static build(): object {
    const routesGlob = path.join(__dirname, '..', 'routes', '*.route.{ts,js}').split(path.sep).join('/');
    return swaggerJsdoc({
      definition: {
        openapi: '3.0.3',
        info: { title: 'Quran App API', version: '1.0.0', description: 'Backend for the Quran web app' },
        servers: [{ url: '/' }],
        components: {
          securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } }
        }
      },
      apis: [routesGlob]
    });
  }
}
