# Runs from source rather than the compiled binary, so `bun run backup` and
# `bun run restore` work inside the container with the same code.
# Floats on Bun 1.x on purpose; bun.lock pins the dependencies.
FROM oven/bun:1

# mysqldump + mysql for scripts/backup.ts and scripts/restore.ts. Debian's
# default-mysql-client is MariaDB's, the same family as the db service.
# No skip-ssl (lumpy-budget needs one): mariadb:11.8 serves TLS, and
# scripts/docker-smoke.sh proves the dump works without it.
RUN apt-get update \
 && apt-get install -y --no-install-recommends default-mysql-client \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile && bun run generate-routes

ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "src/backend/index.ts"]
