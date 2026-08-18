import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowSquareOut,
  BookOpen,
  Briefcase,
  ChartLineUp,
  Check,
  Clock,
  Code,
  Command,
  Copy,
  CurrencyDollar,
  Database,
  Gear,
  GithubLogo,
  GitPullRequest,
  GlobeHemisphereWest,
  GraduationCap,
  Heart,
  Lightning,
  MagnifyingGlass,
  NotePencil,
  Palette,
  Play,
  Sparkle,
  SuitcaseRolling,
  Table,
  PresentationChart,
  X,
  ChatCircleDots,
  ClosedCaptioning,
} from "@phosphor-icons/react";
import {
  categories,
  defaultWorkflow,
  essentials,
  getCategory,
  getWorkflowItem,
  resolveWorkflow,
  skills,
  starterTasks,
} from "./skills";

const categoryIcons = {
  data: Database,
  content: Play,
  dev: Code,
  design: Palette,
  office: Briefcase,
  business: CurrencyDollar,
  social: ChatCircleDots,
  life: Heart,
  devops: Gear,
  education: BookOpen,
};

const taskIcons = [ChartLineUp, NotePencil, ClosedCaptioning, SuitcaseRolling, GitPullRequest, GraduationCap];
const stepColors = ["#2f9cff", "#19d4c0", "#35da78"];

function workflowIcon(name) {
  if (/browser|research/i.test(name)) return GlobeHemisphereWest;
  if (/spreadsheet|data|clean|chart/i.test(name)) return Table;
  if (/presentation/i.test(name)) return PresentationChart;
  if (/report|document|minutes/i.test(name)) return NotePencil;
  if (/code|debug|unit|pull/i.test(name)) return Code;
  if (/video|subtitle|hyper/i.test(name)) return Play;
  if (/study|quiz|course/i.test(name)) return GraduationCap;
  if (/itinerary|travel/i.test(name)) return SuitcaseRolling;
  return Database;
}

function workflowAction(name) {
  const actions = {
    "browser / web-extract": "收集资料",
    "spreadsheet-analysis": "归纳数据",
    "presentation-builder": "生成汇报",
    "topic-research": "调研主题",
    "document-polisher": "润色文档",
    "content-writer / video-script": "撰写脚本",
    "Codex-Transcribe": "转写录音",
    "Codex-Minutes": "整理纪要",
    "Codex-Subtitle": "生成字幕",
    "Codex-HyperFrames": "剪辑成片",
    "Codex-Debug": "定位问题",
    "Codex-CodeReview": "审查代码",
    "Codex-UnitTest": "生成测试",
    "Codex-Itinerary": "规划行程",
    "Codex-StudyPlan": "制定计划",
    "Codex-Quiz": "生成测验",
    "Codex-CleanData": "清洗数据",
    "Codex-Chart": "生成图表",
  };
  return actions[name] ?? "执行任务";
}

function copyTextFor(item) {
  return `请使用「${item.name}」这个 Skill 思路帮我完成任务：${item.description} 请先确认输入材料、输出格式和验收标准，再开始执行。`;
}

export function App() {
  const [task, setTask] = useState("做一份可汇报的竞品分析");
  const [workflow, setWorkflow] = useState(defaultWorkflow);
  const [copied, setCopied] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const taskInputRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        taskInputRef.current?.focus();
      }
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const workflowItems = workflow.steps.map(getWorkflowItem).filter(Boolean);

  const filteredSkills = useMemo(() => {
    const normalized = catalogQuery.trim().toLowerCase();
    return skills.filter((skill) => {
      const categoryMatch = activeCategory === "all" || skill.category === activeCategory;
      const queryMatch = !normalized || `${skill.name} ${skill.description}`.toLowerCase().includes(normalized);
      return categoryMatch && queryMatch;
    });
  }, [activeCategory, catalogQuery]);

  const runTask = (nextTask = task) => {
    const value = nextTask.trim();
    if (!value) {
      taskInputRef.current?.focus();
      return;
    }
    setTask(value);
    setWorkflow(resolveWorkflow(value));
    document.querySelector("#workflow")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const copyPrompt = async (item) => {
    const text = copyTextFor(item);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopied(item.name);
    window.setTimeout(() => setCopied(""), 1800);
  };

  const navigateTo = (id) => {
    setMenuOpen(false);
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <span className="brand-mark"><Lightning size={21} weight="fill" /></span>
          <span>SkillDock</span>
        </button>

        <nav className={menuOpen ? "main-nav is-open" : "main-nav"} aria-label="主导航">
          <button className="is-active" type="button" onClick={() => navigateTo("#task")}>任务</button>
          <button type="button" onClick={() => navigateTo("#catalog")}>Skill</button>
          <button type="button" onClick={() => navigateTo("#workflow")}>工作流</button>
        </nav>

        <div className="top-actions">
          <button className="shortcut" type="button" onClick={() => taskInputRef.current?.focus()}>
            <Command size={15} /> K <span>快速打开</span>
          </button>
          <a className="github-link" href="https://github.com/" target="_blank" rel="noreferrer">
            <GithubLogo size={24} weight="fill" />
            <span>GitHub</span>
            <ArrowSquareOut size={14} />
          </a>
          <button className="menu-toggle" type="button" onClick={() => setMenuOpen((value) => !value)} aria-label="切换导航">
            {menuOpen ? <X size={22} /> : <span>菜单</span>}
          </button>
        </div>
      </header>

      <main>
        <section className="task-stage" id="task">
          <div className="task-composer">
            <h1>你想完成什么？</h1>
            <p className="lead">用自然语言描述你的目标，SkillDock 会从整理后的清单中选择并编排合适的 Skill。</p>
            <label className="sr-only" htmlFor="task-input">描述你的任务</label>
            <div className="task-input-wrap">
              <textarea
                id="task-input"
                ref={taskInputRef}
                value={task}
                maxLength={300}
                onChange={(event) => setTask(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") runTask();
                }}
              />
              <span className="character-count">{task.length} / 300</span>
            </div>
            <button className="primary-button" type="button" onClick={() => runTask()}>
              <Sparkle size={18} weight="fill" />生成 Skill 组合
            </button>

            <div className="recent-tasks" aria-label="最近任务">
              <span className="section-kicker">最近任务</span>
              {["整理市场活动复盘报告", "生成产品 PRD 并导出 PDF", "制作部门周会纪要与 PPT"].map((item, index) => (
                <button key={item} type="button" onClick={() => runTask(item)}>
                  <Clock size={16} />
                  <span>{item}</span>
                  <time>{["昨天 18:42", "昨天 10:15", "周一 16:30"][index]}</time>
                </button>
              ))}
            </div>
          </div>

          <div className="workflow-panel" id="workflow">
            <div className="panel-heading">
              <div>
                <h2>推荐工作流</h2>
                <p>{workflow.title} · 建议按以下 {workflowItems.length} 步执行。</p>
              </div>
              <span className="source-badge">参考清单</span>
            </div>

            <ol className="workflow-list">
              {workflowItems.map((item, index) => {
                const Icon = workflowIcon(item.name);
                const category = getCategory(item.category);
                return (
                  <li key={`${workflow.title}-${item.name}`} style={{ "--step-color": stepColors[index] }}>
                    <span className="step-number">{index + 1}</span>
                    <span className="step-icon"><Icon size={32} weight="duotone" /></span>
                    <div className="step-copy">
                      <h3>{item.name} — {workflowAction(item.name)}</h3>
                      <p>{item.description}</p>
                      <span className="step-meta"><Clock size={15} />约 {index === 0 ? "5–10" : "10–15"} 分钟 {category ? `· ${category.name}` : ""}</span>
                    </div>
                    <button className="copy-button" type="button" onClick={() => copyPrompt(item)} aria-label={`复制 ${item.name} 任务提示`}>
                      {copied === item.name ? <Check size={17} weight="bold" /> : <Copy size={17} />}
                      <span>{copied === item.name ? "已复制" : "复制提示"}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section className="starter-section" aria-labelledby="starter-title">
          <div className="section-title-row">
            <div>
              <span className="section-kicker">快捷入口</span>
              <h2 id="starter-title">从常见任务开始</h2>
              <p>选择一个场景，快速生成对应的 Skill 组合。</p>
            </div>
            <button className="text-button" type="button" onClick={() => navigateTo("#catalog")}>浏览完整目录 <ArrowRight size={16} /></button>
          </div>
          <div className="starter-grid">
            {starterTasks.map((item, index) => {
              const Icon = taskIcons[index];
              return (
                <button key={item.label} type="button" onClick={() => runTask(item.query)}>
                  <Icon size={24} weight="duotone" />
                  <span>{item.label}</span>
                  <small>{item.category}</small>
                  <ArrowRight className="task-arrow" size={18} />
                </button>
              );
            })}
          </div>
        </section>

        <section className="essential-section" aria-labelledby="essential-title">
          <div className="section-title-row">
            <div>
              <span className="section-kicker">截图整理 · 10 项</span>
              <h2 id="essential-title">核心能力参考</h2>
              <p>来自“必装 10 个 Skill”图片，名称与可用性需以真实仓库为准。</p>
            </div>
          </div>
          <div className="essential-list">
            {essentials.map((item, index) => (
              <article key={item.id}>
                <span className="rank">{String(index + 1).padStart(2, "0")}</span>
                <div><h3>{item.name}</h3><p>{item.description}</p></div>
                <span className="essential-category">{item.categoryName}</span>
                <button type="button" onClick={() => copyPrompt(item)} aria-label={`复制 ${item.name} 任务提示`}>
                  {copied === item.name ? <Check size={17} /> : <Copy size={17} />}
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="catalog-section" id="catalog" aria-labelledby="catalog-title">
          <div className="catalog-header">
            <div>
              <span className="section-kicker">截图整理 · 100 项</span>
              <h2 id="catalog-title">Skill 灵感目录</h2>
              <p>按 10 类场景整理；当前均标记为概念条目，不代表已验证可安装。</p>
            </div>
            <div className="catalog-search">
              <MagnifyingGlass size={19} />
              <input value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder="搜索名称或用途" aria-label="搜索 Skill" />
              {catalogQuery && <button type="button" onClick={() => setCatalogQuery("")} aria-label="清空搜索"><X size={17} /></button>}
            </div>
          </div>

          <div className="category-filter" aria-label="Skill 分类">
            <button className={activeCategory === "all" ? "is-active" : ""} type="button" onClick={() => setActiveCategory("all")}>全部 <span>{skills.length}</span></button>
            {categories.map((category) => {
              const Icon = categoryIcons[category.id];
              const count = skills.filter((skill) => skill.category === category.id).length;
              return (
                <button key={category.id} className={activeCategory === category.id ? "is-active" : ""} type="button" onClick={() => setActiveCategory(category.id)} style={{ "--category-color": category.accent }}>
                  <Icon size={16} />{category.name}<span>{count}</span>
                </button>
              );
            })}
          </div>

          <div className="catalog-table" role="list">
            <div className="catalog-table-head" aria-hidden="true"><span>Skill 名称</span><span>用途</span><span>分类</span><span>状态</span><span /></div>
            {filteredSkills.map((skill) => {
              const category = getCategory(skill.category);
              const Icon = categoryIcons[skill.category];
              return (
                <article key={skill.id} className="skill-row" role="listitem">
                  <div className="skill-name"><span style={{ color: category.accent }}><Icon size={20} weight="duotone" /></span><strong>{skill.name}</strong></div>
                  <p>{skill.description}</p>
                  <span className="skill-category">{category.name}</span>
                  <span className="concept-status">概念条目</span>
                  <button type="button" onClick={() => copyPrompt(skill)}>
                    {copied === skill.name ? <Check size={17} /> : <Copy size={17} />}
                    <span>{copied === skill.name ? "已复制" : "复制提示"}</span>
                  </button>
                </article>
              );
            })}
            {filteredSkills.length === 0 && <div className="empty-state">没有匹配的条目，试试更短的关键词。</div>}
          </div>
        </section>
      </main>

      <footer>
        <div><span className="brand-mark"><Lightning size={16} weight="fill" /></span><strong>SkillDock</strong><span>把任务变成可复用工作流。</span></div>
        <p>内容根据文件夹内 7 张图片整理 · 非官方推荐或排名</p>
        <a href="https://github.com/" target="_blank" rel="noreferrer"><GithubLogo size={18} weight="fill" /> GitHub</a>
      </footer>

      <div className={copied ? "toast is-visible" : "toast"} role="status"><Check size={16} weight="bold" />任务提示已复制</div>
    </div>
  );
}
