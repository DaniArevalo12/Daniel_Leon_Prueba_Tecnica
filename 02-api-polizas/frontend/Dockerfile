# ---------- Etapa 1: compilación ----------
FROM node:22-alpine AS build
WORKDIR /app

# Dependencias en una capa propia: se cachea mientras no cambie el lockfile
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Etapa 2: servidor estático + proxy ----------
FROM nginx:1.29-alpine

# La imagen oficial procesa /etc/nginx/templates/*.template con envsubst al iniciar,
# así la URL del backend se define en tiempo de ejecución (BACKEND_URL) sin recompilar.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/polizas-web/browser /usr/share/nginx/html

ENV BACKEND_URL=http://backend:8080
EXPOSE 80
