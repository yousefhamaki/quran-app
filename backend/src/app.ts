import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { ApiRouter } from './routes';
import { ApiRouterDeps } from './interfaces/auth.interface';
import { ErrorHandlerMiddleware } from './middleware/errorHandler.middleware';
import { SwaggerConfig } from './config/swagger';

export class App {
  readonly app: Application = express();

  constructor(
    deps: ApiRouterDeps,
    private readonly corsOrigins: string[]
  ) {
    const errorHandler = new ErrorHandlerMiddleware();

    this.app.use(helmet());
    this.app.use(cors({ origin: this.corsOrigins }));
    this.app.use(express.json());

    this.app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(SwaggerConfig.build()));
    this.app.use('/api', new ApiRouter(deps).router);

    this.app.use(errorHandler.notFound);
    this.app.use(errorHandler.handle);
  }
}
