// Mesmo cliente para React e scripts estáticos; tokens ficam apenas no cookie HttpOnly.
// Em produção encaminhe /api ao FastAPI no mesmo domínio.
export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

export async function api(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`/api${path}`, {
      ...options, credentials: 'include', signal: controller.signal,
      headers: { 'X-Bau-Request': '1', ...options.headers },
    });
    if (response.status === 204) return null;
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const message = typeof body?.detail === 'string' ? body.detail
        : response.status === 422 ? 'Confira os dados informados.' : 'Serviço indisponível. Tente novamente.';
      throw new ApiError(message, response.status);
    }
    if (!body) throw new ApiError('Resposta inválida da API.', 503);
    return body;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Não foi possível acessar a API. Confira a conexão e tente novamente.', 0);
  } finally { clearTimeout(timer); }
}
