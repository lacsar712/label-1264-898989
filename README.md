# 智能教学资源个性化推荐系统

## 🛠 技术栈
- Frontend: Vue 3 + Vite + Element Plus + ECharts
- Backend: Node.js (Express) + Sequelize
- Database: MySQL 8

## How to Run
- 确保 Docker Desktop 已启动
- 在本目录执行：
  - `docker compose up --build`
- 首次启动会自动初始化数据库并灌入演示数据（seed 容器）

## Services
- Frontend: http://localhost:3264
- Backend API: http://localhost:8264/api/health
- Database: localhost:33264 (user: root / pass: root)

## 🧪 测试账号
- Admin: admin / 123456
- Student: student / 123456

## Verification
- **启动完成判断**：访问健康探针接口 http://localhost:8264/api/health
  - 返回 `200` 且 `status: "pass"` 表示所有检查项均通过，启动完成
  - 返回 `503` 表示部分检查未通过，可查看 `checks` 对象逐项确认
  - `checks.database`：MySQL 连接是否可用
  - `checks.adminUser`：admin 演示账号是否已存在
  - `checks.resources`：教学资源记录数是否达到 seed 下限（48 条）
- 访问 http://localhost:3264 ，进入登录页，使用 admin/123456 登录后可看到管理员菜单
- 访问"首页/资源库/推荐分析/学习进度"，确认图表与表格均有数据展示
- 使用 student/123456 登录，确认无法进入 /admin/* 页面且普通页面数据正常展示
- 在“资源库”页面点击“收藏/移至待学/删除”，确认操作后列表刷新
- 在“系统配置”页编辑参数并保存/恢复默认，确认页面刷新后值同步更新

## 自测截图（请在验收时补齐）
- Docker compose up 成功运行（包含 ps 状态）
- 登录页（未登录状态）
- 首页（包含画像环形图、推荐趋势、推荐列表、周汇总表）
- 资源库（包含堆叠柱、词云、标签关联表、收藏/待学表）
- 推荐分析（包含雷达、桑基、效果趋势、效果明细表）
- 学习进度（包含饼图、趋势对比、漏斗、错题表、目标环形进度）

---

## 🐳 Docker 镜像源配置 (Docker Registry Configuration)

### 推荐配置（基于实际项目验证）

#### 1. Docker 镜像源
**使用官方 Docker Hub 镜像**（已验证稳定可用）

```yaml
# docker-compose.yml 示例
services:
  db:
    image: mysql:8.0

  backend:
    build: ./backend

  frontend:
    build: ./frontend
```

#### 2. npm 依赖源
**使用淘宝镜像**（国内访问快）

在 `Dockerfile` 中添加：
```dockerfile
RUN npm config set registry https://registry.npmmirror.com
```
