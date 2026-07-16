# ============================================
# CDK 卡密验证系统 - 后端 Dockerfile
# 包含 Go 编译器，支持在线编译 Windows EXE
# ============================================

FROM node:20-slim

# 安装 Go 1.22（用于交叉编译 Windows EXE，CGO_ENABLED=0 无需 gcc）
RUN apt-get update && apt-get install -y --no-install-recommends wget && \
    wget -q https://go.dev/dl/go1.22.10.linux-amd64.tar.gz && \
    tar -C /usr/local -xzf go1.22.10.linux-amd64.tar.gz && \
    rm go1.22.10.linux-amd64.tar.gz && \
    apt-get remove -y wget && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

ENV PATH="/usr/local/go/bin:${PATH}"
ENV GOPATH="/go"
RUN mkdir -p /go
ENV PATH="${GOPATH}/bin:${PATH}"

# 安装 garble（Go 代码混淆器）
RUN go install mvdan.cc/garble@latest

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install

# 生成 Prisma Client
COPY prisma ./prisma
RUN npx prisma generate

# 复制源码并编译
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

EXPOSE 3001

# 启动：先同步数据库，再启动服务
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]