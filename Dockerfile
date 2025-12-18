# syntax=docker/dockerfile:1

# Dev-focused image for running BOTH: API (3001) + Vite app (3000)
# (Keeps your existing Vite proxy to http://localhost:3001 working inside the container.)

ARG NODE_VERSION=22.17.0
FROM node:${NODE_VERSION}-alpine

WORKDIR /usr/src/app

# Install dependencies (include dev deps because we run tsx/vite/concurrently in-container)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# App (Vite) + API (Express)
EXPOSE 3000 3001

# Default command (docker-compose overrides this to add --host for Vite)
CMD ["npm", "run", "dev"]
