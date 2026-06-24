# AYRA Agent — Next.js + Python runtime + background worker

FROM node:20-bookworm
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npx prisma generate \
    && npm run build \
    && pip3 install --break-system-packages -e ./python

ENV NODE_ENV=production \
    AYRA_REPO_ROOT=/app \
    AYRA_SKILLS_DIR=/app/skills \
    AYRA_PYTHON_REQUIRED=true \
    AYRA_TELEGRAM_PYTHON=true \
    TELEGRAM_POLLING=true \
    PORT=3000

EXPOSE 3000 8765 8790

CMD ["bash", "docker/ayra-start.sh"]
