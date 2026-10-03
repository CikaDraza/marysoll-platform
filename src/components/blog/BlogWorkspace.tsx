"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { useContentMediaAuthoring } from "@/hooks/useContentMediaAuthoring";
import { ContentBlocksEditor } from "@/components/content-composer/editor/ContentBlocksEditor";
import { PreviewRenderer } from "@/components/content-composer/PreviewRenderer";
import { createContentBlockId } from "@/lib/content/editor/blockFactories";
import { EducationImportPanel } from "@/components/education/EducationEditorSections";
import { getContentMutationErrorMessage } from "@/lib/content/validation/contentValidationClient";
import { clearLocalDraftIfConfirmed, putLocalDraft, readLocalDraft, shouldOfferRecovery } from "@/lib/education/localDraft";
import type { BlogDraft, BlogPost } from "@/lib/blog/document";

async function blogRequest<T>(path: string, token: string | null | undefined, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`/api/blog/posts${path}`, { method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Blog zahtev nije uspeo");
  return data as T;
}
const fieldClass = "w-full rounded-xl border border-gray-300 bg-transparent p-3 dark:border-gray-700";
const buttonClass = "rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-gray-700";

export function BlogList() {
  const { token, tenantId } = useAuth();
  const { data, isPending, isError } = useQuery({ queryKey: ["blog-posts", tenantId],
    queryFn: () => blogRequest<{items: BlogPost[]}>("", token), enabled: Boolean(token && tenantId) });
  return <div className="space-y-6">
    <header className="flex items-center justify-between gap-4"><h1 className="text-2xl font-bold">Blog · Svi tekstovi</h1>
      <Link className={buttonClass} href="/education/blog/new">Novi blog</Link></header>
    {isPending ? <p>Učitavanje tekstova…</p> : isError ? <p role="alert">Tekstove nije moguće učitati.</p> : data?.items.length ?
      <ul className="divide-y rounded-2xl border border-gray-200 dark:border-gray-700">{data.items.map(post => <li key={post.id} className="p-4">
        <Link href={`/education/blog/${post.id}`} className="font-semibold text-violet-600">{post.draft.title}</Link>
        <p className="mt-1 text-sm text-gray-500">{post.published ? "Objavljeno · radna kopija" : "Nacrt"}</p>
      </li>)}</ul> : <p>Još nema blog tekstova. Izaberite „Novi blog”.</p>}
  </div>;
}

export function BlogCreationChooser() {
  return <div className="space-y-6"><Link href="/education/blog">← Svi tekstovi</Link>
    <h1 className="text-2xl font-bold">Novi blog</h1>
    <div className="grid gap-4 sm:grid-cols-2">{[
      ["article", "Napiši tekst", "Počnite od praznog teksta i uredite sekcije."],
      ["import", "Uvezi PDF / DOCX", "Pretvorite postojeći dokument u tekst koji možete urediti."],
    ].map(([mode, title, help]) => <Link key={mode} href={`/education/blog/new?start=${mode}`} className="rounded-2xl border border-gray-200 p-6 dark:border-gray-700">
      <h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm text-gray-500">{help}</p></Link>)}</div>
  </div>;
}

export function BlogEditorLoader({ id }: {id: string}) {
  const { token, tenantId } = useAuth();
  const { data, isPending, isError } = useQuery({ queryKey: ["blog-post", tenantId, id],
    queryFn: () => blogRequest<{item: BlogPost}>(`/${id}`, token), enabled: Boolean(token && tenantId) });
  if (isPending) return <p>Učitavanje teksta…</p>;
  if (isError || !data) return <p role="alert">Blog tekst nije pronađen.</p>;
  return <BlogEditor key={id} post={data.item} />;
}

export function BlogEditor({ post, start = "article" }: {post?: BlogPost; start?: "article" | "import"}) {
  const { token, tenantId } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const mediaAdapter = useContentMediaAuthoring();
  const [draft, setDraft] = useState<BlogDraft>(() => post?.draft ?? {
    title: "", slug: "", description: "", cover: "", blocks: start === "import" ? [] : [{id: createContentBlockId(), type: "ArticleBlock", priority: 1, title: "Uvod", paragraphs: [""]}],
  });
  const [saved, setSaved] = useState(draft);
  const [id, setId] = useState(post?.id);
  const [published, setPublished] = useState(post?.published ?? false);
  const [busy, setBusy] = useState(false);
  const savingRef = useRef(false);
  const [recovery, setRecovery] = useState<BlogDraft | null>(null);
  const [saveError, setSaveError] = useState(false);
  const stamp = useRef(0);
  const localId = `blog:${id ?? `new:${start}`}`;
  const [preview, setPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const patch = (change: Partial<BlogDraft>) => setDraft(current => ({ ...current, ...change }));

  const persist = async () => {
    const sent = draft;
    const confirmed = stamp.current;
    const { item } = await blogRequest<{item: BlogPost}>(id ? `/${id}` : "", token, id ? "PATCH" : "POST", sent);
    setId(item.id);
    setSaved({...sent, slug: item.draft.slug});
    setDraft(current => current.slug === sent.slug ? {...current, slug: item.draft.slug} : current);
    setPublished(item.published);
    void clearLocalDraftIfConfirmed(tenantId ?? "", localId, confirmed);
    setSaveError(false);
    if (!id) window.history.replaceState(null, "", `/education/blog/${item.id}`);
    await queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
    return item.id;
  };
  const save = async (publish: boolean, silent = false) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setBusy(true);
    try {
      const savedId = await persist();
      if (publish) { await blogRequest(`/${savedId}/publish`, token, "POST"); setPublished(true); await queryClient.invalidateQueries({queryKey: ["blog-posts"]}); }
      if (!silent) toast.success(publish ? "Blog je objavljen" : "Nacrt je sačuvan");
    } catch (error) { setSaveError(true); if (!silent) toast.error(getContentMutationErrorMessage(error, "Čuvanje nije uspelo")); }
    finally { savingRef.current = false; setBusy(false); }
  };
  const saveRef = useRef(save);
  const exitRef = useRef({draft, dirty, localId});
  useEffect(() => { saveRef.current = save; exitRef.current = {draft, dirty, localId}; });
  useEffect(() => {
    if (!dirty || busy || recovery || !draft.title.trim() || !draft.blocks.length) return;
    const timer = setTimeout(() => { if (navigator.onLine) void saveRef.current(false, true); }, 2000);
    return () => clearTimeout(timer);
  }, [draft, dirty, busy, recovery]);
  useEffect(() => {
    if (!tenantId || !dirty || recovery) return;
    const timer = setTimeout(() => {
      stamp.current = Date.now();
      void putLocalDraft({key: `${tenantId}:${localId}`, tenantId, contentId: localId, savedAt: stamp.current, state: draft});
    }, 600);
    return () => clearTimeout(timer);
  }, [draft, dirty, localId, tenantId, recovery]);
  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    void readLocalDraft<BlogDraft>(tenantId, `blog:${post?.id ?? `new:${start}`}`).then(local => {
      if (!cancelled && local && shouldOfferRecovery({draft: local, serverWorkingSavedAt: post?.savedAt})) setRecovery(local.state);
    });
    return () => { cancelled = true; };
  }, [tenantId, post?.id, post?.savedAt, start]);
  useEffect(() => {
    const flush = () => {
      const current = exitRef.current;
      if (!tenantId || !current.dirty) return;
      stamp.current = Date.now();
      void putLocalDraft({key: `${tenantId}:${current.localId}`, tenantId, contentId: current.localId, savedAt: stamp.current, state: current.draft});
    };
    const reconnect = () => { if (exitRef.current.dirty) void saveRef.current(false, true); };
    window.addEventListener("pagehide", flush);
    window.addEventListener("online", reconnect);
    return () => { window.removeEventListener("pagehide", flush); window.removeEventListener("online", reconnect); flush(); };
  }, [tenantId]);
  const importDocument = async (file: File) => {
    setImporting(true);
    try {
      const body = new FormData(); body.append("file", file);
      const response = await fetch("/api/education/import", { method: "POST", body,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Uvoz nije uspeo");
      patch({ title: data.draft.title, description: data.draft.hero?.subtitle ?? "", blocks: data.draft.blocks });
      setSummary(`Pročitano: ${data.summary.sections} sekcija, ${data.summary.lists} nabrajanja, ${data.summary.callouts} napomena.`);
    } catch (error) { toast.error(getContentMutationErrorMessage(error, "Uvoz nije uspeo")); }
    finally { setImporting(false); }
  };
  const remove = async () => {
    if (!id || !window.confirm("Trajno obrisati blog tekst?")) return;
    setBusy(true);
    try { await blogRequest(`/${id}`, token, "DELETE"); exitRef.current.dirty = false; await clearLocalDraftIfConfirmed(tenantId ?? "", localId, Infinity); await queryClient.invalidateQueries({queryKey: ["blog-posts"]}); router.push("/education/blog"); }
    catch (error) { toast.error(getContentMutationErrorMessage(error, "Brisanje nije uspelo")); setBusy(false); }
  };

  return <div className="space-y-6"><Link href="/education/blog">← Svi tekstovi</Link>
    <header className="flex flex-wrap justify-between gap-4"><div><h1 className="text-2xl font-bold">{id ? "Uredi blog" : "Novi blog"}</h1>
      <p role="status" aria-live="polite" className="mt-1 text-sm text-gray-500">{published ? "Objavljeno" : "Nacrt"} · {busy ? "Čuvanje…" : saveError ? "Nije sačuvano na serveru — pokušajte ponovo" : dirty ? "Nesačuvane izmene" : "Nacrt sačuvan"}</p></div>
      <div className="flex flex-wrap gap-2"><button className={buttonClass} disabled={busy} onClick={() => void save(false)}>Sačuvaj nacrt</button>
        <button className={buttonClass} onClick={() => setPreview(!preview)}>{preview ? "Nazad na uređivanje" : "Pregled"}</button>
        <button className={buttonClass} disabled={busy} onClick={() => void save(true)}>Objavi blog</button>
        {id && <button className={buttonClass} disabled={busy} onClick={() => void remove()}>Obriši</button>}</div></header>
    {recovery && <div role="status" className="rounded-xl border border-amber-300 p-4">Pronađen je noviji nacrt sa ovog uređaja. <button className={buttonClass} onClick={() => {setDraft(recovery); setRecovery(null);}}>Vrati izmene</button> <button className={buttonClass} onClick={() => {void clearLocalDraftIfConfirmed(tenantId ?? "", localId, Infinity); setRecovery(null);}}>Odbaci</button></div>}
    {preview ? <PreviewRenderer blocks={draft.blocks} viewports={["mobile", "desktop"]} header={<h2>{draft.title}</h2>} /> : <>
      {start === "import" && <EducationImportPanel importing={importing} summary={summary} onImport={file => void importDocument(file)} onDismissSummary={() => setSummary(null)} />}
      <label className="block space-y-2"><span>Naslov</span><input className={fieldClass} value={draft.title} onChange={e => patch({title: e.target.value})} /></label>
      <label className="block space-y-2"><span>Kratak opis</span><textarea className={fieldClass} value={draft.description} onChange={e => patch({description: e.target.value})} /></label>
      <section className="space-y-4"><h2 className="text-lg font-semibold">Sadržaj bloga</h2>
        <ContentBlocksEditor blocks={draft.blocks} mediaAdapter={mediaAdapter} onChange={blocks => patch({blocks})} /></section>
      <details className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"><summary>Adresa i slika za deljenje</summary>
        <div className="mt-4 space-y-4"><label className="block space-y-2"><span>Web adresa (automatski iz naslova)</span><input className={fieldClass} value={draft.slug} onChange={e => patch({slug: e.target.value})} /></label>
          <label className="block space-y-2"><span>URL slike za deljenje</span><input className={fieldClass} value={draft.cover} onChange={e => patch({cover: e.target.value})} /></label></div></details>
    </>}
  </div>;
}
