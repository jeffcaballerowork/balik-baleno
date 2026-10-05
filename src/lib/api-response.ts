export interface ApiError {
  error: {
    code: string

    message: string
  }
}

export function jsonResponse<T>(body: T, status = 200): Response {
  return Response.json(body, {
    status,

    headers: {
      "Cache-Control": "no-store",
    },
  })
}

export function errorResponse(
  status: number,

  code: string,

  message: string,
): Response {
  return jsonResponse<ApiError>({ error: { code, message } }, status)
}

export function logApiError(route: string, error: unknown): void {
  console.error(
    JSON.stringify({
      event: "api_error",

      route,

      error: error instanceof Error ? error.message : String(error),
    }),
  )
}
