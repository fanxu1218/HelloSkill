import { lstat, mkdir, readFile, readdir, writeFile, rename, chmod } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { zipSync } from "fflate";
import { encryptVault, decryptVault, toBase64 } from "../src/vault-crypto.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "JustMe");
const configFile = path.join(source, ".vault-local.json");
const outputDir = path.join(root, "public/vaults");
const siteUrl = "https://fanxu1218.github.io/HelloSkill/";
const ignoredNames = new Set([".git", "node_modules", ".DS_Store"]);
const localNames = new Set(["README.md", ".vault-local.json", "PRIVATE-ENTRY.txt"]);
const maxSourceBytes = 24 * 1024 * 1024;

function isSensitiveName(name) {
  return /^\.env(?:\.|$)/i.test(name) || /^(?:id_rsa|id_ed25519|credentials(?:\.json)?|\.npmrc)$/i.test(name) || /\.(?:pem|p12|pfx|key)$/i.test(name);
}

export async function collectSkills(directory) {
  const skills = [];
  let bytes = 0;
  const entries = (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (localNames.has(entry.name) || ignoredNames.has(entry.name)) continue;
    if (!entry.isDirectory() || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(entry.name)) {
      throw new Error("JustMe 中的 Skill 必须是独立目录，目录名仅使用英文、数字、短横线或下划线。");
    }
    const files = Object.create(null);
    const names = [];
    let markdown;
    async function walk(relative) {
      for (const item of (await readdir(path.join(directory, relative), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
        if (ignoredNames.has(item.name)) continue;
        if (isSensitiveName(item.name)) throw new Error("发现环境或密钥文件，请移出 Skill 目录再打包。");
        if (item.name.includes("\\") || /[\x00-\x1f]/.test(item.name)) throw new Error("Skill 文件名包含不支持的字符。");
        const child = `${relative}/${item.name}`;
        const stat = await lstat(path.join(directory, child));
        if (stat.isSymbolicLink()) throw new Error("不允许打包符号链接，请使用目录内的真实文件。");
        if (stat.isDirectory()) { await walk(child); continue; }
        if (!stat.isFile()) throw new Error("Skill 目录含不支持的文件类型。");
        bytes += stat.size;
        if (bytes > maxSourceBytes) throw new Error("原始文件总大小超过 24 MiB，请减少资源体积。");
        const content = await readFile(path.join(directory, child));
        files[child] = [content, { os: 3, attrs: (stat.mode & 0xffff) << 16 }];
        names.push(child.slice(entry.name.length + 1));
        if (child === `${entry.name}/SKILL.md`) markdown = new TextDecoder("utf-8", { fatal: true }).decode(content);
      }
    }
    await walk(entry.name);
    if (!markdown?.trim()) throw new Error("每个 Skill 目录都必须包含非空 UTF-8 SKILL.md。");
    skills.push({ id: entry.name, name: entry.name, markdown, files: names, archive: toBase64(zipSync(files, { level: 6 })) });
  }
  return skills;
}

export async function publishEncryptedVault(directory, output, config, password, { allowEmpty = false } = {}) {
  if (!/^[a-f0-9]{32}$/.test(config.id) || !/^[A-Za-z0-9_-]{43}$/.test(config.accessKey)) throw new Error("本机私人区配置损坏，请从备份恢复。");
  const skills = await collectSkills(directory);
  if (!skills.length && !allowEmpty) throw new Error("JustMe 还没有 Skill，未更改现有加密包。");
  const target = path.join(output, `${config.id}.json`);
  let previous;
  try { previous = await readFile(target, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
  // Verify the old envelope before replacing it, preventing accidental rekeying.
  if (previous) {
    const old = await decryptVault(JSON.parse(previous), password, config.accessKey);
    if (old.skills.length && !skills.length) throw new Error("不能用空内容覆盖已有私人 Skill。");
  }
  const payload = { version: 1, updatedAt: new Date().toISOString(), skills };
  const encrypted = await encryptVault(payload, password, config.accessKey);
  const verified = await decryptVault(encrypted, password, config.accessKey);
  if (JSON.stringify(verified) !== JSON.stringify(payload)) throw new Error("加密回读校验失败。");
  await mkdir(output, { recursive: true });
  const temporary = `${target}.tmp`;
  await writeFile(temporary, JSON.stringify(encrypted) + "\n", { mode: 0o600 });
  await rename(temporary, target);
  await chmod(target, 0o644);
  return { count: skills.length, target };
}

function readPassword(prompt) {
  if (!process.stdin.isTTY) throw new Error("请在交互终端运行；密码不能作为命令行参数传入。");
  return new Promise((resolve, reject) => {
    let value = "";
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    const done = (error) => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      if (error) reject(error); else resolve(value);
    };
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\u0003") { done(new Error("操作已取消。")); return; }
        if (char === "\r" || char === "\n") { done(); return; }
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else if (char >= " ") value += char;
      }
    };
    process.stdin.on("data", onData);
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--init")) throw new Error("支持的参数仅有 --init；请勿将密码放入命令行。");
  await mkdir(source, { recursive: true });
  let config;
  try { config = JSON.parse(await readFile(configFile, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
  if (!config) {
    if (!args.includes("--init")) throw new Error("缺少本机私人区密钥。请从备份恢复 .vault-local.json；首次使用运行 pnpm run vault:init。");
    // Never silently create a new key when an existing encrypted vault is present.
    const existing = await readdir(outputDir).catch((error) => { if (error.code === "ENOENT") return []; throw error; });
    if (existing.some((name) => name.endsWith(".json"))) throw new Error("仓库已有私人区，请从原电脑或备份恢复 .vault-local.json。");
    config = { version: 1, id: randomBytes(16).toString("hex"), accessKey: randomBytes(32).toString("base64url") };
  }
  let password = await readPassword("请输入私人区密码（不会显示）：");
  if (!password) throw new Error("密码不能为空。");
  let confirm = await readPassword("请再次输入密码：");
  if (password !== confirm) throw new Error("两次输入不一致，未更新私人区。");
  // Persist the non-password key before publication so an interruption cannot lose it.
  await writeFile(configFile, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
  await chmod(configFile, 0o600);
  const result = await publishEncryptedVault(source, outputDir, config, password, { allowEmpty: args.includes("--init") });
  password = "";
  confirm = "";
  const link = `${siteUrl}#/just-me/${config.id}/${config.accessKey}`;
  await writeFile(path.join(source, "PRIVATE-ENTRY.txt"), `私人入口（请保管，勿公开或提交 Git）：\n${link}\n\n换电脑后使用此链接及密码查看、下载 Skill。\n更新加密包时，请把 .vault-local.json 也安全转移到新电脑的 JustMe 目录。\n`, { mode: 0o600 });
  console.log(`已加密 ${result.count} 个 Skill；私人链接保存在 JustMe/PRIVATE-ENTRY.txt，密码未保存。`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
