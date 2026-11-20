import { Button } from "@/components/ui/button";
import { getDraft, removeDraft, saveDraft } from "@/lib/offlineStore";
import { trpc } from "@/lib/trpc";
import { ImagePlus, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("تعذر قراءة الصورة"));
    reader.readAsDataURL(file);
  });
}

export default function PostComposer({ onCreated }: { onCreated?: () => void }) {
  const uploadMutation = trpc.feed.uploadImage.useMutation();
  const createMutation = trpc.feed.createPost.useMutation();
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [draftReady, setDraftReady] = useState(false);
  const busy = uploadMutation.isPending || createMutation.isPending;

  useEffect(() => {
    let active = true;
    void getDraft("post").then((draft) => {
      if (active && draft?.body) setBody(draft.body);
      if (active) setDraftReady(true);
    });
    return () => { active = false; };
  }, []);

  const submit = async () => {
    if (!body.trim() && !file) return toast("اكتب شيئًا أو اختر صورة أولًا");
    try {
      let imageUrl: string | undefined;
      let imageMimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" | undefined;
      if (file) {
        const uploaded = await uploadMutation.mutateAsync({ base64Data: await readAsDataUrl(file) });
        imageUrl = uploaded.url;
        imageMimeType = uploaded.mime;
      }
      await createMutation.mutateAsync({ body: body.trim() || undefined, imageUrl, imageMimeType, mediaType: imageUrl ? "image" : undefined });
      await removeDraft("post");
      setBody("");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      toast.success("تم نشر المشاركة");
      onCreated?.();
    } catch (error) {
      if (!navigator.onLine) {
        await saveDraft({ kind: "post", body, attachmentName: file?.name, syncPending: true });
        toast("حُفظت المسودة للمزامنة عند عودة الاتصال");
        return;
      }
      toast.error(error instanceof Error ? error.message : "تعذر نشر المشاركة");
    }
  };

  useEffect(() => {
    const syncDraft = async () => {
      if (!draftReady || !navigator.onLine || busy) return;
      const draft = await getDraft("post");
      if (!draft?.syncPending || !draft.body.trim()) return;
      try {
        await createMutation.mutateAsync({ body: draft.body.trim() });
        await removeDraft("post");
        setBody("");
        toast.success("تمت مزامنة المسودة ونشرها");
        onCreated?.();
      } catch {
        // Keep the draft for the next online event.
      }
    };
    void syncDraft();
    const onOnline = () => { void syncDraft(); };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [busy, createMutation, draftReady, onCreated]);

  return <section dir="rtl" className="rounded-[26px] border border-[#e3d9ce] bg-[#fffdf9] p-5 shadow-[0_14px_35px_rgba(36,53,45,.05)]"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#edf1ea] text-[#587062]"><Send size={17} /></span><div><h2 className="font-serif text-xl text-[#26392f]">ابدأ مساحة حوار</h2><p className="mt-1 text-xs text-[#7c887f]">النص والصورة مسموحان، والفيديو غير متاح. تُحفظ المسودة على جهازك عند انقطاع الاتصال.</p></div></div><textarea value={body} onChange={(event) => { setBody(event.target.value); void saveDraft({ kind: "post", body: event.target.value, attachmentName: file?.name }); }} maxLength={10000} placeholder="اكتب شيئًا صادقًا..." className="mt-4 min-h-28 w-full resize-none rounded-2xl border border-[#e5dbcf] bg-[#fbf8f2] p-4 text-sm leading-7 outline-none focus:border-[#b77952]" /><div className="mt-3 flex items-center justify-between gap-3"><label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#a66743]"><ImagePlus size={17} /> إضافة صورة<input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => { const selected = event.target.files?.[0] ?? null; setFile(selected); void saveDraft({ kind: "post", body, attachmentName: selected?.name }); }} /></label><div className="flex items-center gap-3"><span className="text-xs text-[#8b968e]">{file?.name ?? "بدون صورة"}</span><Button type="button" onClick={submit} disabled={busy} className="bg-[#20352d]">{busy ? "جارٍ النشر..." : "نشر"}</Button></div></div></section>;
}
