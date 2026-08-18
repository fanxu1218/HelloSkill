import categoryRegistry from "../skills/categories.json";

const metadataModules = import.meta.glob("../skills/*/metadata.json", {
  eager: true,
  import: "default",
});

const allEntries = Object.values(metadataModules);

export const categories = categoryRegistry;
export const skills = allEntries
  .filter((entry) => entry.kind === "workflow")
  .sort((left, right) => left.order - right.order);
export const essentials = allEntries
  .filter((entry) => entry.kind === "essential")
  .sort((left, right) => left.order - right.order);

export const starterTasks = [
  { label: "分析 Excel 数据", category: "数据分析", query: "分析 Excel 数据并生成可视化结论" },
  { label: "整理会议纪要", category: "办公效率", query: "整理会议录音并生成待办清单" },
  { label: "生成双语字幕", category: "内容媒体", query: "为视频生成中英双语字幕" },
  { label: "制定旅行攻略", category: "生活个人", query: "制定一份三天旅行攻略" },
  { label: "审查 Pull Request", category: "开发编程", query: "审查 Pull Request 并给出修改建议" },
  { label: "生成复习计划", category: "教育学习", query: "根据考试时间生成复习计划" },
];

export const workflowRules = [
  {
    keywords: ["excel", "表格", "数据", "分析", "趋势"],
    title: "数据分析工作流",
    steps: ["spreadsheet-analysis", "Codex-CleanData", "Codex-Chart"],
  },
  {
    keywords: ["会议", "纪要", "录音", "待办"],
    title: "会议整理工作流",
    steps: ["Codex-Transcribe", "Codex-Minutes", "document-polisher"],
  },
  {
    keywords: ["视频", "字幕", "口播", "短视频"],
    title: "视频内容工作流",
    steps: ["content-writer / video-script", "Codex-Subtitle", "Codex-HyperFrames"],
  },
  {
    keywords: ["代码", "报错", "pull request", "pr", "审查"],
    title: "代码质量工作流",
    steps: ["Codex-Debug", "Codex-CodeReview", "Codex-UnitTest"],
  },
  {
    keywords: ["旅行", "攻略", "行程"],
    title: "旅行规划工作流",
    steps: ["topic-research", "Codex-Itinerary", "document-polisher"],
  },
  {
    keywords: ["学习", "复习", "考试", "课程"],
    title: "学习计划工作流",
    steps: ["topic-research", "Codex-StudyPlan", "Codex-Quiz"],
  },
  {
    keywords: ["ppt", "汇报", "演示"],
    title: "演示文稿工作流",
    steps: ["topic-research", "document-polisher", "presentation-builder"],
  },
];

export const defaultWorkflow = {
  title: "竞品分析工作流",
  steps: ["browser / web-extract", "spreadsheet-analysis", "presentation-builder"],
};

export function resolveWorkflow(query) {
  const normalized = query.trim().toLowerCase();
  return workflowRules.find((rule) => rule.keywords.some((keyword) => normalized.includes(keyword))) ?? defaultWorkflow;
}

export function getWorkflowItem(name) {
  return essentials.find((item) => item.name === name) ?? skills.find((item) => item.name === name);
}

export function getCategory(id) {
  return categories.find((category) => category.id === id);
}
