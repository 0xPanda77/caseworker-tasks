import { createRoute, z, type OpenAPIHono } from '@hono/zod-openapi';

const HealthSchema = z.object({ status: z.literal('ok') }).openapi('Health');

const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  tags: ['System'],
  summary: 'Liveness check',
  responses: {
    200: {
      description: 'Service is up',
      content: { 'application/json': { schema: HealthSchema } },
    },
  },
});

export function registerHealthRoutes(app: OpenAPIHono) {
  app.openapi(healthRoute, (c) => c.json({ status: 'ok' as const }, 200));
}
