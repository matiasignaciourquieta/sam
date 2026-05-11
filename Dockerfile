FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /app

# Browsers already bundled in base image — skip re-download
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

CMD ["node", "dist/index.js"]
