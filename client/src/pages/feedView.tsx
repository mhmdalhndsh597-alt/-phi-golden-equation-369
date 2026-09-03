import React from "react";

const imageFallback = "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=85";

export type FeedEntry = { id: number; body: string | null; imageUrl: string | null; author: { name: string | null; location: string | null; email: string | null } | null };

export function nextFeedLimit(current: number) {
  return Math.min(current + 10, 100);
}

export function handleLoadMore(onLoadMore: () => void) {
  onLoadMore();
}

export function AdditionalPosts({ entries, feedLimit, onLoadMore }: { entries: FeedEntry[]; feedLimit: number; onLoadMore: () => void }) {
  return <>
    {entries.slice(1).map((entry) => <article key={entry.id} data-testid="feed-post" className="mt-5 rounded-[24px] border border-[#e3d9ce] bg-[#fffdf9] p-5 shadow-[0_12px_30px_rgba(36,53,45,.05)]"><div className="flex items-center gap-3"><img src={entry.author?.email ? "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80" : imageFallback} alt="" className="h-10 w-10 rounded-full object-cover" /><div><p className="text-sm font-semibold text-[#43564a]">{entry.author?.name ?? "عضو وصال"}</p><p className="text-xs text-[#8b958d]">{entry.author?.location ?? "وصال"}</p></div></div>{entry.body && <p className="mt-4 text-sm leading-7 text-[#5d6d63]">{entry.body}</p>}{entry.imageUrl && <img src={entry.imageUrl} alt="صورة المنشور" className="mt-4 max-h-80 w-full rounded-2xl object-cover" />}</article>)}
    {entries.length >= feedLimit && <button data-testid="load-more" type="button" onClick={() => handleLoadMore(onLoadMore)} className="mt-5 w-full rounded-2xl border border-[#d8c8b8] bg-[#fffdf9] py-3 text-sm font-semibold text-[#a66743] hover:bg-[#fff7ef]">تحميل منشورات أقدم</button>}
  </>;
}
