import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import swaggerJSDoc from 'swagger-jsdoc';
import type { SwaggerDefinition } from 'swagger-jsdoc';
import { openapiDefinition } from './openapi-spec.js';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export function buildSwaggerSpec() {
  const js = path.join(dirname, 'swagger-annotations.js');
  const ts = path.join(dirname, 'swagger-annotations.ts');
  const apis = [existsSync(js) ? js : ts];
  return swaggerJSDoc({
    definition: openapiDefinition as unknown as SwaggerDefinition,
    apis,
  });
}
