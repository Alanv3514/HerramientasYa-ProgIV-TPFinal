# Etapa 1: compila el frontend. slim (glibc) y no alpine, por los binarios nativos de Vite y TypeScript.
FROM node:24-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Vite inserta VITE_API_URL al compilar: por eso es un argumento de build y no una variable en ejecución.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Etapa 2: solo los archivos estáticos, servidos por nginx. Node no queda en la imagen final.
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
