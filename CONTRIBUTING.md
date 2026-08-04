# 贡献指南

感谢你对 Smart SMS AI 的关注！欢迎提交 issue、文档改进、bug 修复和功能增强。请先阅读本指南，以便协作更顺畅。

## 行为准则

参与本项目即表示你同意营造友好、尊重、开放的技术社区氛围。请文明交流，尊重不同意见。

## 项目概览

- 后端：Java 21 + Spring Boot 3.2，Maven 构建（`./mvnw`）
- 前端：React 19 + TypeScript + Vite，Vitest 测试
- 数据库：PostgreSQL 16（本地开发可直接用 `backend/docker` 下的 Compose 启动）
- CI：GitHub Actions，push 到 `main`/`master` 和 Pull Request 时自动运行

## 如何报告问题

### Bug

1. 先搜索现有 issue，确认是否已有人报告过。
2. 新建 issue，标题简明扼要，正文尽量包含：
   - 复现步骤（详细到可以一步步跟着做）
   - 期望行为与实际行为
   - 运行环境（操作系统、Java/Node 版本、配置文件）
   - 相关报错日志（注意脱敏，不要贴密钥）
   - 如能提供最小复现示例更好

### 功能建议

1. 说明你想解决什么问题、期望的行为。
2. 说明它如何与现有功能配合。
3. 如有可能，给出大致的实现思路。

### 安全问题

**不要**在 issue 中公开披露漏洞细节。请按 `SECURITY.md` 中的方式私下报告。

## 开发流程

### 1. 环境准备

- Java 21
- Node.js 18+（CI 使用 Node.js 20）
- Docker Desktop 或兼容的 Docker Compose 环境

### 2. 启动本地环境

```bash
# 启动数据库
cd backend/docker
docker compose -f docker-compose.dev.yml up -d

# 启动后端（新终端）
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# 启动前端（新终端）
cd frontend
npm ci
npm run dev
```

详细说明见 `README.md` 的「快速开始」章节。

### 3. 创建分支

```bash
git checkout -b feat/your-feature
# 或
git checkout -b fix/your-fix
```

建议分支命名：`feat/`、`fix/`、`docs/`、`refactor/`、`test/` 前缀。

### 4. 编写与提交代码

- 保持改动聚焦，一个提交只做一件事。
- 提交信息使用清晰的中文或英文描述，说明「做了什么」和「为什么」。
- 不要提交任何真实密钥、`.env` 文件、日志、数据库导出或构建产物。
- 不要提交 `.env`、`node_modules/`、`dist/`、`target/` 等被 `.gitignore` 忽略的内容。

### 5. 测试

改动完成后，确保相关测试通过：

```bash
# 后端
cd backend
./mvnw test

# 前端
cd frontend
npm run build
npm test -- --run
```

- 新增功能或修复 bug 时，尽量补充对应测试。
- 后端测试用 H2，前端测试用 Vitest + Testing Library。

### 6. 提交 Pull Request

1. 确保基于最新的 `main`/`master`。
2. 创建 PR，标题简明，正文说明改动内容、动机和测试情况。
3. 如关联某个 issue，在 PR 描述中写 `Closes #123`。
4. 等待 CI 通过。CI 会自动运行后端测试和前端构建/测试。

## 代码规范

- 后端遵循 Spring Boot 惯例：`controller` / `service` / `repository` / `entity` / `dto` 分层清晰。
- 前端遵循现有组件的风格和命名，类型定义集中在 `frontend/types.ts`。
- 后端代码尽量有基础注释说明职责；前端组件保持简洁可读。
- 不在代码中硬编码环境相关的地址、密钥或账号。

## 分支与发布

- 主分支为 `main`（兼容 `master`），直接 push 会触发 CI。
- 新功能和修复通过 Pull Request 合并。
- 版本发布使用 GitHub Release，遵循语义化版本（SemVer）。

## 文档

- 文档改动同样欢迎。修改 `README.md` 时，注意保持项目结构图和配置表格与实际一致。

再次感谢你的贡献！
