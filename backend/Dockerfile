FROM python:3.12-slim
WORKDIR /srv/backend
COPY backend/requirements.lock.txt .
RUN pip install --no-cache-dir -r requirements.lock.txt
COPY backend/app ./app
COPY backend/alembic ./alembic
COPY backend/alembic.ini .
COPY public/lendas-ra.json /srv/public/lendas-ra.json
RUN useradd --create-home bau
USER bau
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
