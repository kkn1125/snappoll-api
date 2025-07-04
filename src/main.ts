import { CommonService } from '@common/common.service';
import {
  BadRequestResponseDto,
  CommonResponseDto,
  ErrorResponseDto,
  ForbiddenResponseDto,
  InternalServerErrorResponseDto,
  NotFoundResponseDto,
  SuccessResponseDto,
  UnauthorizedResponseDto,
} from '@common/dto/global-response.dto';
import { GlobalExceptionFilter } from '@common/filter/global-exception.filter';
import { ResponseInterceptor } from '@common/response.interceptor';
import { RunMode } from '@common/variable/enums';
import { LoggerService } from '@logger/logger.service';
import { VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { UtilService } from '@util/util.service';
import { useContainer } from 'class-validator';
import cluster from 'cluster';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { JwtGuard } from './auth/jwt.guard';

cluster.schedulingPolicy = cluster.SCHED_RR; // Round Robin

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const utilService = app.get(UtilService);
  const commonService = app.get(CommonService);
  const loggerService = app.get(LoggerService);
  const commonConfig = commonService.getConfig('common');

  /* 재시작 구분선 */
  /* 로그 파일에 적용 */
  loggerService.log('=============================================');
  loggerService.info('=============================================');
  loggerService.debug('=============================================');
  loggerService.warn('=============================================');
  loggerService.error('=============================================');

  const version = commonConfig.version;
  const port = commonConfig.port;

  app.use(cookieParser());
  app.use(compression());
  app.useLogger(loggerService);

  app.useGlobalGuards(new JwtGuard(utilService));
  app.setGlobalPrefix('api');
  app.useGlobalInterceptors(new ResponseInterceptor(loggerService));
  app.useGlobalFilters(new GlobalExceptionFilter(loggerService));

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableCors({
    // TODO: 운영일 때 호스트 적용
    origin: commonConfig.runMode === RunMode.Development ? '*' : '*',
    credentials: commonConfig.runMode === RunMode.Production,
  });

  const config = new DocumentBuilder()
    .setTitle('Snappoll API')
    .setDescription('Snappoll API Docs')
    .setVersion(version)
    .build();
  const documentFactory = () =>
    SwaggerModule.createDocument(app, config, {
      extraModels: [
        ErrorResponseDto,
        CommonResponseDto,
        SuccessResponseDto,
        NotFoundResponseDto,
        ForbiddenResponseDto,
        BadRequestResponseDto,
        UnauthorizedResponseDto,
        InternalServerErrorResponseDto,
      ],
    });
  SwaggerModule.setup('api-docs', app, documentFactory, {
    jsonDocumentUrl: 'api-docs/json',
    swaggerOptions: {
      docExpansion: 'none',
    },
  });

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  await app.listen(port);
  loggerService.log(`Server listening on http://localhost:${port}`);
}

bootstrap();
