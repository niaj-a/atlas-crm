FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api-gateway/package.json apps/api-gateway/package.json
COPY apps/auth-service/package.json apps/auth-service/package.json
COPY apps/crm-service/package.json apps/crm-service/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/ packages/shared/
RUN npm ci --omit=dev --workspace apps/auth-service --workspace packages/shared
COPY apps/auth-service/ apps/auth-service/
EXPOSE 4001
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/auth-service/src/server.js"]
