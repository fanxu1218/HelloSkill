# SkillDock

一个面向中文用户的 Skill 发现与工作流网站。输入真实任务，站点会从整理后的 Skill 清单中推荐组合；同时提供 10 项核心能力参考和 100 项场景化 Skill 灵感目录。

项目采用 **Git 仓库即内容库** 的方式：每个 Skill 都是一个独立目录，构建时由 Vite 自动读取，不需要额外数据库或后台服务。提交记录就是内容版本历史，Pull Request 就是内容审核流程。

> 当前截图没有提供各条目的真实仓库地址，因此所有图片来源条目都明确标记为“参考”或“概念”，不会伪造安装命令。

## 本地运行

```bash
pnpm install
pnpm run validate:skills
pnpm run dev
```

`dev` 和 `build` 执行前都会自动校验 Skill 数据。缺少必填字段、重复 ID、无效分类或不完整的 `SKILL.md` 会直接阻止启动或发布。

## 发布到 GitHub Pages

1. 将项目推送到 GitHub 仓库的 `main` 分支。
2. 在仓库 **Settings → Pages → Build and deployment** 中选择 **GitHub Actions**。
3. `Deploy SkillDock to GitHub Pages` 工作流会构建并发布 `dist/client`。

站点资源使用相对路径，因此仓库站点与用户主页站点都可正常加载。

## 内容结构

- `skills/categories.json`：网站分类注册表。
- `skills/<skill-id>/metadata.json`：供网站展示、筛选和排序的结构化元数据。
- `skills/<skill-id>/SKILL.md`：Skill 的说明与未来可安装内容。
- `src/skills.js`：构建时扫描所有 `metadata.json`，不再维护重复的手写清单。
- `src/App.jsx`：任务编排、复制提示、分类筛选与目录搜索。
- `src/styles.css`：响应式视觉系统。
- `scripts/validate-skills.mjs`：发布前的内容质量门禁。

完整字段与贡献方式见 [`skills/README.md`](skills/README.md)。

## 新增一个 Skill

1. 复制一个现有 Skill 目录，并把目录名改成唯一的英文小写 kebab-case ID。
2. 修改 `metadata.json` 和 `SKILL.md`，两处的 ID 必须一致。
3. 执行 `pnpm run validate:skills` 和 `pnpm run build`。
4. 提交 Pull Request；合并到 `main` 后由 GitHub Actions 自动发布。

当前从图片整理出的条目使用 `concept` 或 `reference` 状态，因为图片没有提供可核验的真实仓库地址。只有补充 GitHub 仓库并确认内容后，才能标记为 `verified`。

## 什么时候再接数据库

只读发现、搜索、分类和安装说明都不需要数据库。以后如果加入用户账号、跨设备收藏、评论评分、下载统计或在线投稿审核，再接入 Supabase、Neon 等服务即可；现有 `skills/` 内容结构仍可继续作为公开、可版本化的主数据源。
