FROM node:20-alpine AS builder
WORKDIR /app

COPY . .
RUN cd libs/logs-lib && npm ci && npm run build
RUN cd libs/errors-lib && npm ci && npm run build
RUN cd libs/auth-lib && npm ci && npm run build
RUN cd services/identity-service && npm ci && npm run build
RUN npm install -g pm2

FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/services/identity-service/dist ./dist
COPY --from=builder /app/services/identity-service/node_modules ./node_modules
COPY --from=builder /app/services/identity-service/package.json ./
COPY --from=builder /app/libs/auth-lib /libs/auth-lib
COPY --from=builder /app/libs/logs-lib /libs/logs-lib
COPY --from=builder /app/libs/errors-lib /libs/errors-lib
COPY --from=builder /app/libs/auth-lib ./node_modules/@move/auth-lib
COPY --from=builder /app/libs/logs-lib ./node_modules/@move/logs-lib
COPY --from=builder /app/libs/errors-lib ./node_modules/@move/errors-lib

COPY services/identity-service/ecosystem.config.js ./

RUN npm install -g pm2

EXPOSE 4001
CMD ["pm2-runtime", "start", "ecosystem.config.js", "--only", "identity-service"]
