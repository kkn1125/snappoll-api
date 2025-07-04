import commonConfig from './common.config';
import secretConfig from './secret.config';
import { typeormConfig } from './typeorm.config';

export const config = {
  common: commonConfig,
  database: typeormConfig,
  secret: secretConfig,
} as const;
