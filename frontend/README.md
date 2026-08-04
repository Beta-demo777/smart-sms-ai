# Smart SMS AI Frontend

React + TypeScript + Vite frontend for Smart SMS AI.

完整项目说明、后端启动方式和部署说明请查看仓库根目录的 `README.md`。

## Local Development

```bash
npm ci
npm run dev
```

默认开发服务器地址为 http://localhost:3000，并通过 Vite proxy 转发 `/api` 到 http://localhost:8080。

## Scripts

```bash
npm run build
npm test
```

前端不需要配置 AI API key。AI 请求由后端代理处理，服务端密钥请通过后端环境变量配置。
