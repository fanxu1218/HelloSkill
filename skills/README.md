# Skill 内容库

这里是 SkillDock 的公开内容源。每个 Skill 使用一个独立目录：

```text
skills/
├── categories.json
└── codex-chart/
    ├── metadata.json
    └── SKILL.md
```

## metadata.json

```json
{
  "id": "codex-chart",
  "name": "Codex-Chart",
  "description": "上传 Excel，一键生成交互式数据看板。",
  "category": "data",
  "categoryName": "数据分析",
  "kind": "workflow",
  "status": "concept",
  "sourceImage": "IMG_9625.PNG",
  "repository": null,
  "installCommand": null,
  "order": 1,
  "updatedAt": "2026-08-18"
}
```

字段说明：

- `id`：唯一 ID，同时也是目录名和 `SKILL.md` frontmatter 中的 `name`。
- `name`：网站展示名称，不能与其他条目重复。
- `description`：一句话说明 Skill 能解决什么任务。
- `category` / `categoryName`：必须与 `categories.json` 中的分类一致。
- `kind`：`workflow` 表示场景化条目，`essential` 表示核心能力参考。
- `status`：`concept`、`reference` 或 `verified`。
- `sourceImage`：原始整理图片的仓库相对路径，没有来源图片时可设为 `null`。
- `repository`：已核验的 GitHub HTTPS 地址；`verified` 状态必须填写。
- `installCommand`：真实且已核验的安装命令，没有时保持 `null`。
- `order`：同一种 `kind` 内唯一的正整数，用于稳定排序。
- `updatedAt`：内容更新时间，格式为 `YYYY-MM-DD`。

## 状态规则

- `concept`：从灵感或图片整理出的概念，尚未对应可安装仓库。
- `reference`：用于工作流参考，但不代表本站已核验其安装方式。
- `verified`：已核验仓库和内容，必须提供 `repository`。

禁止为了让卡片看起来完整而虚构仓库地址或安装命令。

## 提交前检查

```bash
pnpm run validate:skills
pnpm run build
```

校验失败时不会启动开发服务器，也不会产出可发布构建。
