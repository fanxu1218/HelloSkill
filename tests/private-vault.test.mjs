import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, writeFile, readFile, symlink, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { unzipSync } from "fflate";
import { randomBytes } from "node:crypto";
import { decryptVault, encryptVault, fromBase64, toBase64, parsePrivateRoute } from "../src/vault-crypto.js";
import { collectSkills, publishEncryptedVault } from "../scripts/pack-private-vault.mjs";

test("vault roundtrip, wrong password/key, tampering and randomized encryption", async () => {
  const accessKey = randomBytes(32).toString("base64url");
  const password = randomBytes(20).toString("hex");
  const payload = { version: 1, skills: [{ id: "sample", name: "Private name sentinel", markdown: "Private content sentinel", archive: "AA==", files: ["SKILL.md"] }] };
  const encrypted = await encryptVault(payload, password, accessKey);
  assert.deepEqual(await decryptVault(encrypted, password, accessKey), payload);
  for (const secret of [password, accessKey, payload.skills[0].name, payload.skills[0].markdown]) assert.ok(!JSON.stringify(encrypted).includes(secret));
  await assert.rejects(decryptVault(encrypted, "incorrect", accessKey), /解锁失败/);
  await assert.rejects(decryptVault(encrypted, password, randomBytes(32).toString("base64url")), /解锁失败/);
  const tampered = fromBase64(encrypted.ciphertext);
  tampered[0] ^= 1;
  await assert.rejects(decryptVault({ ...encrypted, ciphertext: toBase64(tampered) }, password, accessKey), /解锁失败/);
  await assert.rejects(decryptVault({ ...encrypted, iterations: 1 }, password, accessKey), /格式不受支持/);
  const another = await encryptVault(payload, password, accessKey);
  assert.notEqual(another.salt, encrypted.salt);
  assert.notEqual(another.iv, encrypted.iv);
  assert.notEqual(another.ciphertext, encrypted.ciphertext);
});

test("Skill packing includes complete ZIP resources and refuses unsafe or accidental updates", async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "skilldock-vault-test-"));
  try {
    const source = path.join(temporary, "JustMe");
    const output = path.join(temporary, "public");
    await mkdir(path.join(source, "sample", "scripts"), { recursive: true });
    const markdown = "---\nname: sample\ndescription: test only\n---\n# 我的测试 Skill\n";
    const resource = new Uint8Array([0, 255, 128, 10]);
    await writeFile(path.join(source, "sample", "SKILL.md"), markdown);
    await writeFile(path.join(source, "sample", "scripts", "resource.bin"), resource);
    const [skill] = await collectSkills(source);
    const unzipped = unzipSync(fromBase64(skill.archive));
    assert.equal(new TextDecoder().decode(unzipped["sample/SKILL.md"]), markdown);
    assert.deepEqual(unzipped["sample/scripts/resource.bin"], resource);
    assert.deepEqual(skill.files.sort(), ["SKILL.md", "scripts/resource.bin"].sort());
    const config = { id: randomBytes(16).toString("hex"), accessKey: randomBytes(32).toString("base64url") };
    const result = await publishEncryptedVault(source, output, config, "fixture-password");
    const ciphertext = await readFile(result.target, "utf8");
    assert.ok(!ciphertext.includes(markdown));
    const decoded = await decryptVault(JSON.parse(ciphertext), "fixture-password", config.accessKey);
    assert.equal(decoded.skills[0].markdown, markdown);
    await assert.rejects(publishEncryptedVault(source, output, config, "wrong-password"), /解锁失败/);
    assert.equal(await readFile(result.target, "utf8"), ciphertext);
    await symlink(path.join(source, "sample", "SKILL.md"), path.join(source, "sample", "link"));
    await assert.rejects(collectSkills(source), /符号链接/);
    await rm(path.join(source, "sample", "link"));
    await writeFile(path.join(source, "sample", ".env"), "FAKE_TEST=1");
    await assert.rejects(collectSkills(source), /环境或密钥文件/);
    await rm(path.join(source, "sample"), { recursive: true });
    await assert.rejects(publishEncryptedVault(source, output, config, "fixture-password"), /还没有 Skill/);
    await assert.rejects(publishEncryptedVault(source, output, config, "fixture-password", { allowEmpty: true }), /空内容覆盖/);
    assert.equal(await readFile(result.target, "utf8"), ciphertext);
  } finally { await rm(temporary, { recursive: true, force: true }); }
});

test("hidden route accepts only complete private links", () => {
  const id = "a".repeat(32);
  const key = randomBytes(32).toString("base64url");
  assert.deepEqual(parsePrivateRoute(`#/just-me/${id}/${key}`), { id, accessKey: key });
  for (const hash of ["", "#catalog", "#/just-me", `#/just-me/../${key}`, `#/just-me/${id}/short`]) assert.equal(parsePrivateRoute(hash), null);
});
