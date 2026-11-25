FROM python:3.12-slim
WORKDIR /app

# Primero solo las dependencias: si no cambia requirements.txt, Docker reusa esta capa y el build es rápido.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 8000
# 0.0.0.0 para que se pueda entrar desde fuera del contenedor.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
