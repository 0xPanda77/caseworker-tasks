// RFC 9457 problem details (https://www.rfc-editor.org/rfc/rfc9457).
import { z } from '@hono/zod-openapi';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export const PROBLEM_CONTENT_TYPE = 'application/problem+json';

export const FieldErrorSchema = z.object({
  field: z.string().openapi({ example: 'title' }),
  message: z.string().openapi({ example: 'Too small: expected string to have >=1 characters' }),
});

export const ProblemSchema = z
  .object({
    type: z.string().openapi({ example: 'about:blank' }),
    title: z.string().openapi({ example: 'Not Found' }),
    status: z.number().int().openapi({ example: 404 }),
    detail: z.string().optional(),
    instance: z.string().optional(),
    errors: z.array(FieldErrorSchema).optional(),
  })
  .openapi('Problem');

export type Problem = z.infer<typeof ProblemSchema>;
export type FieldError = z.infer<typeof FieldErrorSchema>;

const STATUS_TITLES: Record<number, string> = {
  400: 'Bad Request',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  500: 'Internal Server Error',
  501: 'Not Implemented',
};

export function buildProblem(
  status: number,
  extra: Partial<Omit<Problem, 'status'>> = {},
): Problem {
  return {
    type: 'about:blank',
    title: STATUS_TITLES[status] ?? 'Error',
    status,
    ...extra,
  };
}

export function problemResponse<S extends ContentfulStatusCode>(
  c: Context,
  status: S,
  extra: Partial<Omit<Problem, 'status'>> = {},
) {
  return c.json(buildProblem(status, { instance: c.req.path, ...extra }), status, {
    'Content-Type': PROBLEM_CONTENT_TYPE,
  });
}

// Reusable OpenAPI response entry for a problem-details error.
export function problemDoc(description: string) {
  return {
    description,
    content: { [PROBLEM_CONTENT_TYPE]: { schema: ProblemSchema } },
  } as const;
}
