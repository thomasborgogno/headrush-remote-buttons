FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8787 \
    HEADRUSH_CONFIG_DIR=/data
COPY package*.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY --from=build /app/dist ./dist
VOLUME /data
EXPOSE 8787
CMD ["npx", "tsx", "server/index.ts"]
