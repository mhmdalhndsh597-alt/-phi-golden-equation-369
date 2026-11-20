import React from "react";
import { CloudOff, CloudUpload, RefreshCw, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { getConnectionState, listDrafts, listQueuedActions, setConnectionState } from "@/lib/offlineStore";

export default function ConnectionStatus({ compact = false }: { compact?: boolean }) {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const [actions, drafts, previous] = await Promise.all([listQueuedActions(), listDrafts(), getConnectionState()]);
      if (!active) return;
      const count = actions.length + drafts.filter((draft) => draft.syncPending).length;
      setPending(count);
      await setConnectionState({ online: navigator.onLine, lastChangedAt: previous?.lastChangedAt ?? Date.now(), lastSyncedAt: count === 0 ? Date.now() : previous?.lastSyncedAt, pendingCount: count });
    };
    void refresh();
    const onChange = () => { setOnline(navigator.onLine); void refresh(); };
    window.addEventListener("online", onChange);
    window.addEventListener("offline", onChange);
    window.addEventListener("zawaj-offline-change", onChange);
    const interval = window.setInterval(() => { void refresh(); }, 3000);
    return () => {
      active = false;
      window.removeEventListener("online", onChange);
      window.removeEventListener("offline", onChange);
      window.removeEventListener("zawaj-offline-change", onChange);
      window.clearInterval(interval);
    };
  }, []);

  if (online) {
    return <span role="status" aria-label={pending ? `${pending} عناصر بانتظار المزامنة` : "متصل"} className={`inline-flex items-center gap-1 ${compact ? "text-[10px]" : "rounded-full border border-[#d9e5d9] bg-[#f1f7f0] px-3 py-1.5 text-xs"} ${pending ? "text-[#9b6342]" : "text-[#70917a]"}`}>{pending ? <CloudUpload size={compact ? 12 : 14} /> : <Wifi size={compact ? 12 : 14} />} {pending ? `${pending} بانتظار المزامنة` : "متصل"}</span>;
  }

  return <div role="status" className={`inline-flex items-center gap-2 rounded-full border border-[#e7c9ad] bg-[#fff4e8] text-[#9b6342] ${compact ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-xs"}`}><CloudOff size={compact ? 12 : 14} /><span>وضع عدم الاتصال{pending ? ` · ${pending} معلقة` : " — المحفوظات والمسودات متاحة"}</span><RefreshCw size={compact ? 11 : 13} /></div>;
}
