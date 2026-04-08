FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

# Fix Next.js 15 chunk naming: ensure numeric chunk IDs match webpack manifest
RUN cd /app/.next/static/chunks && \
    for f in *.*.js; do \
      case "$f" in [0-9]*) continue ;; esac; \
      chunk_id=$(head -c 500 "$f" | sed -n 's/.*push(\[\[\([0-9]*\)\].*/\1/p'); \
      if [ -n "$chunk_id" ]; then \
        hash=$(echo "$f" | sed 's/^[^.]*\.\([a-f0-9]*\)\.js$/\1/'); \
        target="${chunk_id}.${hash}.js"; \
        if [ ! -f "$target" ]; then \
          cp "$f" "$target"; \
          echo "Fixed: $f -> $target"; \
        fi; \
      fi; \
    done

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
