import { execFileSync } from "node:child_process";

// Check the Git index too: a global ignore or accidental force-add must not leak sources.
const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const privateFiles = tracked.filter((name) => name.startsWith("JustMe/") && name !== "JustMe/README.md");
if (privateFiles.length) {
  console.error("禁止发布：Git 中包含 JustMe 原始文件或私人密钥。请先取消这些文件的跟踪，再构建。");
  process.exit(1);
}
console.log("私人文件检查通过：Git 未跟踪 JustMe 原始文件或密钥。");
