FROM node:22-bookworm-slim AS web

WORKDIR /build
COPY app/package.json app/package-lock.json ./app/
RUN cd app && npm ci --no-audit --no-fund --ignore-scripts
COPY app ./app
RUN cd app && npm run build


FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      git ca-certificates curl ripgrep less procps openssh-client python3 \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=61777 \
    HOST=0.0.0.0 \
    CLAUDE_CONFIG_DIR=/home/node/.claude

WORKDIR /srv

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
    && rm -rf node_modules/@anthropic-ai/claude-agent-sdk-*-musl \
              node_modules/@anthropic-ai/claude-agent-sdk-darwin-* \
              node_modules/@anthropic-ai/claude-agent-sdk-win32-* \
    && npm cache clean --force

COPY server.js ./
COPY lib ./lib
COPY public ./public
COPY --from=web /build/app/dist ./app/dist

RUN mkdir -p /home/node/.claude-remote/uploads /home/node/.claude-remote/logs \
    && chown -R node:node /srv /home/node

USER node
EXPOSE 61777

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||61777)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
