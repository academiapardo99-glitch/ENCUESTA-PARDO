# Build only the public student survey.
FROM node:22-alpine AS build
WORKDIR /app
COPY frontend-estudiante/package.json frontend-estudiante/package-lock.json ./frontend-estudiante/
RUN npm ci --prefix frontend-estudiante
COPY frontend-estudiante ./frontend-estudiante
# VITE_BASE=/ es obligatorio: el portal se sirve en la raíz del dominio, no
# bajo /estudiante. Sin él los assets dan 404 (MIME text/html) y la página
# queda en blanco.
ARG VITE_BASE=/
ENV VITE_BASE=${VITE_BASE}
RUN npm --prefix frontend-estudiante run build

# Serve the student portal and its restricted survey API from one service.
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV PORTAL_ESTUDIANTE_PUBLICO=true
ENV PERSISTENCIA=firestore
WORKDIR /app

COPY backend/package.json backend/package-lock.json ./backend/
RUN npm ci --omit=dev --prefix backend
COPY backend/src ./backend/src
COPY backend/data/portal-seed.json ./backend/data/portal-seed.json
COPY --from=build /app/frontend-estudiante/dist ./frontend-estudiante/dist

ENV PORT=8080
EXPOSE 8080
CMD ["node", "backend/src/server.js"]
