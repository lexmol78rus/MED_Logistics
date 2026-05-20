## syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS build
WORKDIR /app
ARG VITE_API_URL=/api/v1
ARG VITE_APP_ENV=production
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_APP_ENV=${VITE_APP_ENV}
COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ .
# Fresh dist only (no stale hashed bundles from host or prior layers).
RUN rm -rf dist && npm run build

FROM nginx:1.27-alpine AS runner
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
