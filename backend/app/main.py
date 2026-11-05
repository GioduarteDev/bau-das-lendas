import logging

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.routers import auth, game


def create_app():
    settings = get_settings()
    app = FastAPI(title='Baú das Lendas', version='1.0.0')

    @app.middleware('http')
    async def csrf_and_cache(request: Request, call_next):
        # Header não simples + origem explícita: bloqueia submissões CSRF, inclusive login.
        if request.method in {'POST', 'PUT', 'PATCH', 'DELETE'}:
            if (request.headers.get('origin') not in settings.allowed_origins or
                    request.headers.get('x-bau-request') != '1'):
                return JSONResponse({'detail': 'Origem ou proteção CSRF inválida.'}, status_code=403)
        response = await call_next(request)
        response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        return response

    @app.exception_handler(SQLAlchemyError)
    async def database_error(request, exc):
        logging.getLogger(__name__).error('Falha no banco: %s', type(exc).__name__)
        return JSONResponse({'detail': 'Banco indisponível. Tente novamente com a mesma chave.'}, status_code=503)

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request, exc):
        # O erro padrão inclui o input rejeitado, inclusive senhas. Não o devolva.
        return JSONResponse({'detail': 'Confira os dados informados.'}, status_code=422)

    @app.get('/api/health')
    def health(db: Session = Depends(get_db)):
        db.execute(text('SELECT 1'))
        return {'status': 'ok'}

    app.include_router(auth.router)
    app.include_router(game.router)
    app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins, allow_credentials=True,
                       allow_methods=['GET', 'POST'],
                       allow_headers=['Content-Type', 'Idempotency-Key', 'X-Bau-Request'])
    return app


app = create_app()
