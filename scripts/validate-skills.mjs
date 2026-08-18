import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const libraryRoot = path.join(projectRoot, "skills");
const categoryPath = path.join(libraryRoot, "categories.json");
const requiredFields = ["id", "name", "description", "category", "categoryName", "kind", "status", "order", "updatedAt"];
const allowedKinds = new Set(["workflow", "essential"]);
const allowedStatuses = new Set(["concept", "reference", "verified"]);
const errors = [];

if (!existsSync(categoryPath)) {
  throw new Error(`Missing category registry: ${categoryPath}`);
}

const categories = JSON.parse(readFileSync(categoryPath, "utf8"));
if (!Array.isArray(categories) || categories.length === 0) {
  throw new Error("categories.json: expected a non-empty array");
}
const categoryIds = new Set(categories.map((category) => category.id));
const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
if (categoryIds.size !== categories.length) {
  errors.push("categories.json: category ids must be unique");
}
for (const category of categories) {
  if (!category.id || !category.name || !category.accent) {
    errors.push("categories.json: every category requires id, name and accent");
  }
}
const directories = readdirSync(libraryRoot)
  .map((name) => path.join(libraryRoot, name))
  .filter((entry) => statSync(entry).isDirectory())
  .sort();

const ids = new Set();
const names = new Set();
const entries = [];

for (const directory of directories) {
  const directoryName = path.basename(directory);
  const metadataPath = path.join(directory, "metadata.json");
  const skillPath = path.join(directory, "SKILL.md");

  if (!existsSync(metadataPath)) {
    errors.push(`${directoryName}: missing metadata.json`);
    continue;
  }
  if (!existsSync(skillPath)) {
    errors.push(`${directoryName}: missing SKILL.md`);
    continue;
  }

  let metadata;
  try {
    metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
  } catch (error) {
    errors.push(`${directoryName}: invalid metadata.json (${error.message})`);
    continue;
  }

  entries.push(metadata);

  for (const field of requiredFields) {
    if (metadata[field] === undefined || metadata[field] === null || metadata[field] === "") {
      errors.push(`${directoryName}: missing required field "${field}"`);
    }
  }

  if (metadata.id !== directoryName) errors.push(`${directoryName}: id must match directory name`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metadata.id)) errors.push(`${directoryName}: id must be lowercase kebab-case`);
  if (ids.has(metadata.id)) errors.push(`${directoryName}: duplicate id "${metadata.id}"`);
  if (names.has(metadata.name)) errors.push(`${directoryName}: duplicate name "${metadata.name}"`);
  ids.add(metadata.id);
  names.add(metadata.name);

  if (!categoryIds.has(metadata.category)) {
    errors.push(`${directoryName}: unknown category "${metadata.category}"`);
  } else if (metadata.categoryName !== categoryNames.get(metadata.category)) {
    errors.push(`${directoryName}: categoryName must match categories.json`);
  }
  if (!allowedKinds.has(metadata.kind)) errors.push(`${directoryName}: unsupported kind "${metadata.kind}"`);
  if (!allowedStatuses.has(metadata.status)) errors.push(`${directoryName}: unsupported status "${metadata.status}"`);
  if (!Number.isInteger(metadata.order) || metadata.order < 1) errors.push(`${directoryName}: order must be a positive integer`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(metadata.updatedAt)) errors.push(`${directoryName}: updatedAt must use YYYY-MM-DD`);
  if (metadata.status === "verified" && !metadata.repository) errors.push(`${directoryName}: verified entries require repository`);
  if (metadata.repository && !/^https:\/\/github\.com\//.test(metadata.repository)) errors.push(`${directoryName}: repository must be a GitHub HTTPS URL`);
  if (metadata.sourceImage && !existsSync(path.join(projectRoot, metadata.sourceImage))) errors.push(`${directoryName}: source image does not exist`);

  const markdown = readFileSync(skillPath, "utf8");
  const frontmatterName = markdown.match(/^---\s*[\s\S]*?^name:\s*([^\n]+)$/m)?.[1]?.trim();
  const frontmatterDescription = markdown.match(/^---\s*[\s\S]*?^description:\s*(.+)$/m)?.[1]?.trim();
  if (frontmatterName !== metadata.id) errors.push(`${directoryName}: SKILL.md name must match metadata id`);
  if (!frontmatterDescription) errors.push(`${directoryName}: SKILL.md requires a frontmatter description`);
}

for (const kind of allowedKinds) {
  const orders = entries.filter((entry) => entry.kind === kind).map((entry) => entry.order);
  const duplicateOrders = orders.filter((order, index) => orders.indexOf(order) !== index);
  if (duplicateOrders.length > 0) errors.push(`${kind}: duplicate order values ${[...new Set(duplicateOrders)].join(", ")}`);
}

if (errors.length > 0) {
  console.error(`Skill library validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const totals = Object.fromEntries(
  categories.map((category) => [category.name, entries.filter((entry) => entry.category === category.id).length]),
);

console.log(JSON.stringify({
  directories: directories.length,
  workflows: entries.filter((entry) => entry.kind === "workflow").length,
  essentials: entries.filter((entry) => entry.kind === "essential").length,
  categories: totals,
}, null, 2));
