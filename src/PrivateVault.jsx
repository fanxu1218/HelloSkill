import { useEffect, useRef, useState } from "react";
import { LockKey, DownloadSimple, ArrowLeft, FolderLock } from "@phosphor-icons/react";
import { decryptVault, fromBase64, MAX_VAULT_BYTES } from "./vault-crypto.js";
import "./private-vault.css";

export function PrivateVault({ route }) {
  const [password, setPassword] = useState("");
  const [payload, setPayload] = useState(null);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(null);
  const generation = useRef(0);
  const downloadUrls = useRef(new Set());

  function lock() {
    generation.current += 1;
    request.current?.abort();
    setPayload(null);
    setPassword("");
    setError("");
    setBusy(false);
    setSelected(0);
    for (const url of downloadUrls.current) URL.revokeObjectURL(url);
    downloadUrls.current.clear();
  }

  useEffect(() => {
    const title = document.title;
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow, noarchive";
    document.head.append(robots);
    document.title = "私人 Skill · SkillDock";
    window.addEventListener("pagehide", lock);
    return () => {
      generation.current += 1;
      request.current?.abort();
      for (const url of downloadUrls.current) URL.revokeObjectURL(url);
      downloadUrls.current.clear();
      window.removeEventListener("pagehide", lock);
      robots.remove();
      document.title = title;
    };
  }, []);

  async function unlock(event) {
    event.preventDefault();
    if (!route || !password || busy) return;
    const current = ++generation.current;
    const enteredPassword = password;
    const controller = new AbortController();
    request.current = controller;
    setPassword("");
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}vaults/${route.id}.json`, { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer", signal: controller.signal });
      if (!response.ok) throw new Error(response.status === 404 ? "这个私人区尚未发布，或链接已失效。" : "暂时无法读取私人区，请稍后重试。");
      const text = await response.text();
      if (text.length > MAX_VAULT_BYTES * 1.4) throw new Error("加密文件过大。");
      let envelope;
      try { envelope = JSON.parse(text); } catch { throw new Error("没有读到加密文件，请检查私人链接。"); }
      const data = await decryptVault(envelope, enteredPassword, route.accessKey);
      if (current === generation.current) setPayload(data);
    } catch (failure) {
      if (current === generation.current && failure.name !== "AbortError") setError(failure instanceof TypeError ? "网络连接失败，请检查网络后重试。" : failure.message);
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }

  function download(skill) {
    try {
      const bytes = fromBase64(skill.archive);
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/zip" }));
      downloadUrls.current.add(url);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${skill.id}.zip`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => { URL.revokeObjectURL(url); downloadUrls.current.delete(url); }, 1000);
    } catch { setError("下载文件生成失败，请重新解锁后重试。"); }
  }

  const activeSkill = payload?.skills[selected];
  return <div className="private-vault">
    <header className="vault-header">
      <a href="#"><ArrowLeft size={18} /> SkillDock</a>
      <span><LockKey size={18} /> 私人空间</span>
      {payload && <button type="button" onClick={lock}>锁定</button>}
    </header>
    <main className={payload?.skills.length ? "vault-workspace" : "vault-gate"}>
      {!route ? <section className="vault-panel"><LockKey size={36} /><h1>私人链接不完整</h1><p>请使用你保存的完整私人入口链接。</p></section> : !payload ?
        <section className="vault-panel">
          <div className="vault-symbol"><FolderLock size={34} /></div>
          <h1>我的 Skill</h1>
          <p>输入密码，查看和下载自己的 Skill。</p>
          <form onSubmit={unlock}>
            <label htmlFor="vault-password">访问密码</label>
            <input id="vault-password" type="password" autoComplete="off" required autoFocus value={password} disabled={busy} onChange={(event) => setPassword(event.target.value)} />
            <button className="vault-primary" disabled={busy || !password}>{busy ? "正在解锁…" : "解锁私人区"}</button>
          </form>
          <p className="vault-note">刷新或锁定页面后，需要重新输入密码。</p>
          {error && <p className="vault-error" role="alert">{error}</p>}
        </section> : payload.skills.length === 0 ?
        <section className="vault-panel"><FolderLock size={36} /><h1>私人区已解锁</h1><p>还没有添加 Skill。</p><p className="vault-note">将 Skill 文件夹放入本机 JustMe，完成加密发布后会显示在这里。</p></section> : <>
          <aside className="vault-sidebar"><h1>我的 Skill <small>{payload.skills.length}</small></h1>
            <nav aria-label="私人 Skill 列表">{payload.skills.map((skill, index) => <button type="button" key={skill.id} aria-current={selected === index ? "true" : undefined} onClick={() => { setSelected(index); setError(""); }}>{skill.name}</button>)}</nav>
          </aside>
          <section className="vault-document" aria-label="Skill 内容">
            <div className="vault-document-header"><div><h2>{activeSkill.name}</h2><p>{activeSkill.files.length} 个文件</p></div><button className="vault-primary" type="button" onClick={() => download(activeSkill)}><DownloadSimple size={18} /> 下载 Skill</button></div>
            {error && <p className="vault-error" role="alert">{error}</p>}
            <pre tabIndex={0} aria-label="SKILL.md 内容">{activeSkill.markdown}</pre>
            <details><summary>包含的文件</summary><ul>{activeSkill.files.map((file) => <li key={file}>{file}</li>)}</ul></details>
          </section>
        </>}
    </main>
  </div>;
}
