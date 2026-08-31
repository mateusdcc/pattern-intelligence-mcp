FROM node:22-bookworm-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install raw Pi Coding Agent globally
RUN npm install -g @earendil-works/pi-coding-agent

WORKDIR /app

# Copy pattern-intelligence-mcp source
COPY package*.json tsconfig*.json biome.json ./
COPY src/ ./src/
COPY knowledge/ ./knowledge/

# Install dependencies and compile pattern-intelligence-mcp
RUN npm install && npm run build

# Setup pi-antigravity extension package
COPY benchmarks/pi-antigravity /app/pi-antigravity
RUN cd /app/pi-antigravity && npm install --package-lock-only || true

# Setup Pi configuration directory
RUN mkdir -p /root/.pi/agent

# Copy auth and configure settings with only antigravity provider and pattern-intelligence-mcp extension
COPY benchmarks/auth.json /root/.pi/agent/auth.json
RUN echo '{"defaultProvider":"antigravity","defaultModel":"gemini-3.6-flash","packages":["/app/pi-antigravity"]}' > /root/.pi/agent/settings.json

# Copy benchmarks suite
COPY benchmarks/ /app/benchmarks/

WORKDIR /app

CMD ["npx", "tsx", "benchmarks/harness/runner.ts"]
