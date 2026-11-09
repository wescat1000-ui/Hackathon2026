# Cloud package: browser and API share an origin, so no laptop IP is embedded.
FROM node:24-alpine AS frontend
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html ./
COPY src ./src
RUN npm run build

FROM python:3.11-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    RALLY_FRONTEND_DIST=/app/dist \
    RALLY_DB_PATH=/app/backend/data/scores.sqlite3 \
    HF_HOME=/app/model-cache
WORKDIR /app
COPY backend/requirements.txt /tmp/requirements.txt
# CPU wheels avoid installing multi-gigabyte NVIDIA/CUDA dependencies.
RUN pip install --no-cache-dir torch==2.8.0 --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r /tmp/requirements.txt
COPY backend ./backend
COPY data ./data
COPY --from=frontend /build/dist ./dist
RUN useradd --uid 1000 --create-home rally \
    && mkdir -p /app/backend/data /app/model-cache \
    && chown -R 1000:1000 /app
USER 1000
EXPOSE 8080
CMD ["python", "-m", "uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8080"]
