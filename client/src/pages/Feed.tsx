import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import ConnectionStatus from "@/components/ConnectionStatus";
import { cacheFeed, getCachedFeed, getDraft, getSavedItems, listQueuedActions, queueAction, removeDraft, removeQueuedAction, removeSavedItem, saveDraft, saveItem } from "@/lib/offlineStore";
import {
  BadgeCheck,
  Bookmark,
  Gift,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getGiftStoreState } from "./giftStoreState";
import PostComposer from "./PostComposer";
import { AdditionalPosts, nextFeedLimit } from "./feedView";

const imageFallback = "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=85";

type GiftOption = { id: number; giftName: string; priceEgp: string; iconUrl: string };
type GiftTarget = { type: "comment" | "message"; id: number; recipientId: number };
type FeedRow = {
  id: number;
  userId: number;
  body: string | null;
  imageUrl: string | null;
  author: { name: string | null; location: string | null; email: string | null; accountType?: "member" | "official" | "demo" | null } | null;
  comments: Array<{ comment: { id: number; userId: number; body: string }; author: { name: string | null; email: string | null } | null; gift: GiftOption | null }>;
};

function GiftStore({ gifts, target, onClose, onGift, loading, error }: { gifts: GiftOption[]; target: GiftTarget; onClose: () => void; onGift: (giftId: number) => void; loading: boolean; error: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#14231d]/45 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="gift-store-title">
      <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-[#ead8c9] bg-[#fffdf9] shadow-[0_28px_80px_rgba(20,35,29,.26)]">
        <div className="flex items-start justify-between border-b border-[#efe5da] px-6 py-5">
          <div>
            <div className="flex items-center gap-2 text-[#a66743]"><Gift size={18} /><span className="text-xs font-semibold tracking-[.14em]">MICRO STORE</span></div>
            <h2 id="gift-store-title" className="mt-2 font-serif text-2xl text-[#24352d]">لفتة صغيرة، معنى كبير</h2>
            <p className="mt-1 text-xs text-[#7c887f]">الهدايا اختيارية تمامًا، ولا تؤثر على أي تفاعل مجاني.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق متجر الهدايا" className="rounded-full p-2 text-[#78857c] transition-colors hover:bg-[#f2ece3]"><X size={18} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
          {getGiftStoreState({ loading, error, giftCount: gifts.length }) === "loading" ? <div className="col-span-full py-8 text-center text-sm text-[#7c887f]">جارٍ تحميل الهدايا...</div> : getGiftStoreState({ loading, error, giftCount: gifts.length }) === "error" ? <div className="col-span-full py-8 text-center text-sm text-[#9b6342]">تعذر تحميل الكتالوج. حاول مرة أخرى لاحقًا.</div> : getGiftStoreState({ loading, error, giftCount: gifts.length }) === "empty" ? <div className="col-span-full py-8 text-center text-sm text-[#7c887f]">لا توجد هدايا متاحة حاليًا.</div> : gifts.map((gift) => (
            <button key={gift.id} type="button" onClick={() => onGift(gift.id)} className="group rounded-2xl border border-[#e7ddd0] bg-[#fbf8f2] p-3 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c3865d] hover:bg-[#fff7ef] active:scale-[.97]">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f0d7c2] p-2 transition-transform duration-200 group-hover:rotate-6 group-hover:scale-105"><img src={gift.iconUrl} alt="" className="h-8 w-8" /></span>
              <span className="mt-3 block truncate text-xs font-medium text-[#4f6055]">{gift.giftName}</span>
              <span className="mt-1 block text-xs font-semibold text-[#a66743]">{gift.priceEgp} ج.م</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-[#efe5da] bg-[#fbf8f2] px-5 py-3 text-xs text-[#8a958d]"><Wallet size={14} className="text-[#b77952]" /> تحتاج إلى رصيد كافٍ لإتمام الإرسال بأمان.</div>
      </div>
    </div>
  );
}

export default function Feed() {
  const { user } = useAuth();
  const [feedLimit, setFeedLimit] = useState(10);
  const feedQuery = trpc.feed.list.useQuery({ limit: feedLimit });
  const messagesQuery = trpc.feed.messages.useQuery({ limit: 10 }, { enabled: Boolean(user), retry: false });
  const walletQuery = trpc.wallet.me.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const giftsQuery = trpc.gifts.catalog.useQuery();
  const likeMutation = trpc.feed.like.useMutation();
  const followMutation = trpc.feed.follow.useMutation();
  const commentMutation = trpc.feed.comment.useMutation();
  const messageMutation = trpc.feed.message.useMutation();
  const sendGiftMutation = trpc.gifts.send.useMutation();
  const trpcUtils = trpc.useUtils();
  const [liked, setLiked] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [lastMessageId, setLastMessageId] = useState<number | null>(null);
  const [giftTarget, setGiftTarget] = useState<GiftTarget | null>(null);
  const [savedPostIds, setSavedPostIds] = useState<number[]>([]);
  const [cachedFeed, setCachedFeed] = useState<FeedRow[] | null>(null);

  useEffect(() => {
    void getCachedFeed<FeedRow>().then(setCachedFeed);
  }, []);

  useEffect(() => {
    void getSavedItems().then((items) => setSavedPostIds(items.filter((item) => item.kind === "post").map((item) => item.referenceId)));
  }, []);

  useEffect(() => {
    if (feedQuery.data?.length) void cacheFeed(feedQuery.data);
  }, [feedQuery.data]);

  useEffect(() => {
    void Promise.all([getDraft("comment"), getDraft("message")]).then(([commentDraft, messageDraft]) => {
      if (commentDraft?.body) setComment(commentDraft.body);
      if (messageDraft?.body) setMessage(messageDraft.body);
    });
  }, []);

  useEffect(() => {
    const flushOfflineActions = async () => {
      if (!navigator.onLine) return;
      const actions = await listQueuedActions();
      for (const action of actions) {
        try {
          if (action.kind === "like") await likeMutation.mutateAsync({ postId: Number(action.payload.postId) });
          if (action.kind === "comment") { await commentMutation.mutateAsync({ postId: Number(action.payload.postId), body: String(action.payload.body ?? "") }); await removeDraft("comment"); }
          if (action.kind === "message") { await messageMutation.mutateAsync({ recipientId: Number(action.payload.recipientId), body: String(action.payload.body ?? "") }); await removeDraft("message"); }
          await removeQueuedAction(action.id);
        } catch {
          break;
        }
      }
    };
    void flushOfflineActions();
    const onOnline = () => { void flushOfflineActions(); };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [commentMutation, likeMutation, messageMutation]);

  const feedEntries = feedQuery.data?.length ? feedQuery.data : cachedFeed ?? [];
  const livePost = feedEntries[0];
  const showingCachedFeed = !feedQuery.data?.length && feedEntries.length > 0;
  if (feedQuery.isPending && !feedEntries.length) {
    return <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#f5f1ea] text-sm text-[#718078]">جارٍ تحميل مساحة الفاي...</div>;
  }
  if (feedQuery.isError && !feedEntries.length) {
    return <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#f5f1ea] px-6 text-center text-sm text-[#9b6342]">تعذر تحميل المنشورات. حاول مرة أخرى لاحقًا.</div>;
  }
  if (!livePost) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#f5f1ea] px-5 py-10 text-[#26382f] sm:px-8">
        <div className="mx-auto max-w-2xl space-y-5">
          <PostComposer onCreated={() => void feedQuery.refetch()} />
          <div className="rounded-[28px] border border-[#e3d9ce] bg-[#fffdf9] p-8 text-center shadow-[0_18px_48px_rgba(36,53,45,.07)]">
            <Sparkles className="mx-auto text-[#b77952]" size={28} />
            <h1 className="mt-4 font-serif text-3xl">لا توجد منشورات بعد</h1>
            <p className="mt-3 text-sm leading-7 text-[#738078]">ابدأ أول مساحة حوار في فاي. المنشور النصي أو الصورة المقبولة هما كل ما تحتاجه، والتفاعل مجاني بالكامل.</p>
          </div>
        </div>
      </div>
    );
  }
  const activePost = {
    id: livePost.id,
    name: livePost.author?.name ?? "عضو فاي",
    location: livePost.author?.location ?? "فاي",
    avatar: livePost.author?.email ? "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=85" : imageFallback,
    body: livePost.body ?? "منشور بصري من مجتمع فاي.",
    image: livePost.imageUrl ?? imageFallback,
    likes: 0,
    comments: livePost.comments.length,
    authorId: livePost.userId,
    accountType: livePost.author?.accountType ?? "member",
  };
  const commentRows = livePost.comments.map(({ comment, author, gift }) => ({
    id: comment.id,
    name: author?.name ?? "عضو فاي",
    body: comment.body,
    authorId: comment.userId,
    avatar: author?.email ? "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=85" : imageFallback,
    gift: gift ? { name: gift.giftName, icon: gift.iconUrl, price: gift.priceEgp } : null,
  }));
  const gifts: GiftOption[] = giftsQuery.data ?? [];
  const messagePreview = messagesQuery.isPending ? "جارٍ تحميل الرسائل..." : messagesQuery.isError ? "تعذر تحميل الرسائل حاليًا." : messagesQuery.data?.[0]?.message.body ?? "ابدأ حوارًا محترمًا، وستظهر رسائلك هنا.";

  const requireAuth = (action: () => void) => {
    if (!user) {
      toast("سجّل الدخول للمتابعة", { description: "التصفح متاح، أما التفاعل فيحتاج حسابًا آمنًا." });
      startLogin();
      return;
    }
    action();
  };

  const handleLike = () => requireAuth(async () => {
    setLiked((current) => !current);
    try { await likeMutation.mutateAsync({ postId: activePost.id }); } catch { setLiked((current) => !current); if (!navigator.onLine) { await queueAction({ kind: "like", payload: { postId: activePost.id } }); toast("حُفظ الإعجاب للمزامنة عند عودة الاتصال"); } else toast.error("تعذر تحديث الإعجاب"); }
  });

  const handleFollow = () => requireAuth(async () => {
    setFollowed((current) => !current);
    try { await followMutation.mutateAsync({ targetUserId: activePost.authorId }); toast(followed ? "أوقفت المتابعة" : "أصبحت تتابع هذا الملف"); } catch { setFollowed((current) => !current); toast.error("تعذر تحديث المتابعة"); }
  });

  const handleComment = () => requireAuth(async () => {
    if (!comment.trim()) return;
    try { await commentMutation.mutateAsync({ postId: activePost.id, body: comment }); await removeDraft("comment"); setComment(""); toast.success("تم نشر تعليقك مجانًا"); } catch { if (!navigator.onLine) { await saveDraft({ kind: "comment", body: comment, syncPending: true }); await queueAction({ kind: "comment", payload: { postId: activePost.id, body: comment } }); setComment(""); toast("حُفظ التعليق للمزامنة عند عودة الاتصال"); } else toast.error("تعذر نشر التعليق"); }
  });

  const handleMessage = () => requireAuth(async () => {
    if (!message.trim()) return;
    try {
      const result = await messageMutation.mutateAsync({ recipientId: activePost.authorId, body: message });
      setLastMessageId(result.id);
      await trpcUtils.feed.messages.invalidate();
      await removeDraft("message");
      setMessage("");
      toast.success("تم إرسال الرسالة مجانًا");
    } catch {
      if (!navigator.onLine) { await saveDraft({ kind: "message", body: message, syncPending: true }); await queueAction({ kind: "message", payload: { recipientId: activePost.authorId, body: message } }); setMessage(""); toast("حُفظت الرسالة للمزامنة عند عودة الاتصال"); }
      else toast.error("تعذر إرسال الرسالة");
    }
  });

  const handleGift = async (giftId: number) => {
    if (!giftTarget) return;
    if (!user) { toast("سجّل الدخول لإرسال هدية"); startLogin(); return; }
    try {
      await sendGiftMutation.mutateAsync({ recipientId: giftTarget.recipientId, giftId, ...(giftTarget.type === "comment" ? { commentId: giftTarget.id } : { messageId: giftTarget.id }), idempotencyKey: `${user.id}-${giftTarget.type}-${giftTarget.id}-${giftId}-${Date.now()}` });
      setGiftTarget(null);
      await trpcUtils.feed.list.invalidate();
      toast.success("تم إرسال الهدية بأمان", { description: "تم خصم القيمة وتسجيل العملية داخل معاملة واحدة." });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إرسال الهدية");
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f1ea] text-[#26382f]">
      <header className="sticky top-0 z-30 border-b border-[#e4dbcf] bg-[#fffdf9]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 lg:px-10">
          <a href="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d3a181] bg-[#f0d7c2] p-2"><img src="/manus-storage/zawaj-mark_d13f02b1.png" alt="" className="h-full w-full object-contain" /></span><span><span className="block font-serif text-xl">فاي</span><span className="block text-[9px] tracking-[.27em] text-[#ae7250]">PHI / FEED</span></span></a>
          <div className="hidden items-center gap-8 text-sm text-[#66756b] md:flex"><a className="font-semibold text-[#a66743]" href="#feed">الرئيسية</a><a href="#messages" className="transition-colors hover:text-[#a66743]">الرسائل</a><a href="#saved" className="transition-colors hover:text-[#a66743]">المحفوظات</a></div>
          <div className="flex items-center gap-3"><ConnectionStatus compact /><button type="button" aria-label="الإشعارات" className="rounded-full p-2 text-[#6d7a71] transition-colors hover:bg-[#f1ebe2]"><BellIcon /></button><span className="hidden text-sm text-[#6b786f] sm:inline">{user?.name ?? "زائر فاي"}</span><button type="button" onClick={() => user ? toast("ملفك الشخصي قريبًا") : startLogin()} className="h-9 w-9 overflow-hidden rounded-full border border-[#d9c8b8] bg-[#e7d8c8] p-0.5"><img src={user?.name ? "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=85" : "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=85"} alt="الملف الشخصي" className="h-full w-full rounded-full object-cover" /></button></div>
        </div>
      </header>

      <main id="feed" className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_330px] lg:px-10 lg:py-10">
        <section className="min-w-0">
          {showingCachedFeed && <div className="mb-4 rounded-2xl border border-[#e7c9ad] bg-[#fff4e8] px-4 py-3 text-xs text-[#9b6342]">نعرض آخر منشورات محفوظة على هذا الجهاز. ستتحدث الخلاصة تلقائيًا عند عودة الاتصال.</div>}
          <PostComposer onCreated={() => void feedQuery.refetch()} />
          <div className="mb-6 mt-6 flex items-end justify-between"><div><p className="text-xs font-semibold tracking-[.16em] text-[#ad7150]">مساحة الفاي</p><h1 className="mt-2 font-serif text-3xl text-[#24352d] sm:text-4xl">أخبار من يشاركونك المعنى</h1></div><button type="button" onClick={() => { const next = !savedPostIds.includes(activePost.id); setSavedPostIds((current) => next ? [...current, activePost.id] : current.filter((id) => id !== activePost.id)); void (next ? saveItem({ kind: "post", referenceId: activePost.id, label: activePost.name }) : removeSavedItem("post", activePost.id)); toast(next ? "تم حفظ المنشور على جهازك" : "أزيل المنشور من المحفوظات"); }} className={`hidden items-center gap-2 rounded-full border px-4 py-2 text-xs sm:flex ${savedPostIds.includes(activePost.id) ? "border-[#c3865d] bg-[#fff4ea] text-[#a66743]" : "border-[#e1d8ce] text-[#6b786f]"}`}><Bookmark size={15} fill={savedPostIds.includes(activePost.id) ? "currentColor" : "none"} /> محفوظات</button></div>

          <article className="overflow-hidden rounded-[28px] border border-[#e3d9ce] bg-[#fffdf9] shadow-[0_18px_48px_rgba(36,53,45,.07)]">
            <div className="flex items-center justify-between px-5 py-5 sm:px-7"><div className="flex items-center gap-3"><img src={activePost.avatar} alt="" className="h-11 w-11 rounded-full object-cover ring-2 ring-[#f0d7c2]" /><div><div className="flex flex-wrap items-center gap-1.5"><h2 className="font-semibold text-[#33483b]">{activePost.name}</h2><BadgeCheck size={15} className="text-[#b77952]" />{activePost.accountType !== "member" && <span className="rounded-full bg-[#f1d7c4] px-2 py-0.5 text-[10px] font-semibold text-[#925b3e]">{activePost.accountType === "official" ? "حساب رسمي" : "حساب تجريبي"}</span>}</div><p className="text-xs text-[#8b958d]">{activePost.location}</p></div></div><button type="button" aria-label="المزيد" className="rounded-full p-2 text-[#8a948c] hover:bg-[#f2ece3]"><MoreHorizontal size={19} /></button></div>
            <p className="px-5 text-[15px] leading-8 text-[#506157] sm:px-7">{activePost.body}</p>
            <div className="relative mt-5 aspect-[16/8.5] overflow-hidden bg-[#e5ded4]"><img src={activePost.image} onError={(event) => { event.currentTarget.src = imageFallback; }} alt="لحظة هادئة في مساحة طبيعية" className="h-full w-full object-cover" /><span className="absolute bottom-4 right-4 rounded-full border border-white/30 bg-[#21372e]/70 px-3 py-1 text-[10px] text-white backdrop-blur-sm">منشور توضيحي</span></div>
            <div className="flex items-center justify-between px-5 py-4 text-xs text-[#8a958d] sm:px-7"><span className="flex items-center gap-1.5"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#eecdb6] text-[#a66743]"><Heart size={11} fill="currentColor" /></span>{activePost.likes + (liked ? 1 : 0)} إعجاب</span><span>{activePost.comments} تعليقات</span></div>
            <div className="mx-5 border-t border-[#eee7de] sm:mx-7" />
            <div className="grid grid-cols-3 gap-2 px-5 py-3 text-sm sm:px-7"><button type="button" onClick={handleLike} className={`flex items-center justify-center gap-2 rounded-xl py-2.5 transition-colors ${liked ? "bg-[#fff0e6] font-semibold text-[#ad6846]" : "text-[#68776d] hover:bg-[#f5efe7]"}`}><Heart size={17} fill={liked ? "currentColor" : "none"} /> إعجاب</button><button type="button" onClick={() => document.getElementById("comment-box")?.focus()} className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-[#68776d] transition-colors hover:bg-[#f5efe7]"><MessageCircle size={17} /> تعليق</button><button type="button" onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success("تم نسخ رابط المنشور"); }} className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-[#68776d] transition-colors hover:bg-[#f5efe7]"><Share2 size={17} /> مشاركة</button></div>
            <div className="bg-[#fbf8f2] px-5 py-5 sm:px-7">
              <div className="mb-4 flex items-center justify-between"><p className="text-xs font-semibold tracking-[.14em] text-[#ad7150]">الحوار</p><span className="text-xs text-[#909a92]">التعليقات مجانية دائمًا</span></div>
              <div className="space-y-4">{commentRows.map((item) => <div key={item.id} className={`flex gap-3 rounded-2xl p-3 ${item.gift ? "border border-[#d6a06f] bg-[linear-gradient(110deg,#fff8ec,#fffdf9)] shadow-[0_8px_24px_rgba(190,136,83,.11)]" : ""}`}><img src={item.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-[#43564a]">{item.name}</span>{item.gift && <span className="flex items-center gap-1 text-[10px] font-semibold text-[#ad714c]"><Sparkles size={12} /> هدية خاصة</span>}</div><p className="mt-1 text-sm leading-7 text-[#718078]">{item.body}</p>{item.gift && <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#f5dfc8] px-3 py-1.5 text-xs text-[#9b6342]"><img src={item.gift.icon} alt="" className="h-4 w-4" /> {item.gift.name} · {item.gift.price} ج.م</div>}<div className="mt-2 flex items-center gap-4 text-[11px] text-[#9ba49d]"><button type="button" onClick={() => requireAuth(() => toast("تم تسجيل إعجابك بالتعليق مجانًا"))} className="hover:text-[#ad6846]">إعجاب</button><button type="button" onClick={() => setGiftTarget({ type: "comment", id: item.id, recipientId: item.authorId })} className="flex items-center gap-1 hover:text-[#ad6846]"><Gift size={12} /> أرسل هدية</button></div></div></div>)}</div>
              <div className="mt-5 flex items-end gap-3"><label className="flex min-h-12 flex-1 items-center gap-2 rounded-2xl border border-[#e5dbcf] bg-[#fffdf9] px-4 focus-within:border-[#c3865d] focus-within:ring-2 focus-within:ring-[#c3865d]/20"><span className="sr-only">اكتب تعليقًا</span><input id="comment-box" value={comment} onChange={(event) => { setComment(event.target.value); void saveDraft({ kind: "comment", body: event.target.value }); }} onKeyDown={(event) => { if (event.key === "Enter") handleComment(); }} placeholder="اكتب تعليقًا لطيفًا..." className="w-full bg-transparent text-sm outline-none placeholder:text-[#a2aaa4]" /><button type="button" aria-label="إرسال هدية داخل التعليق" onClick={() => requireAuth(async () => { if (!comment.trim()) { toast("اكتب تعليقًا أولًا", { description: "بعد نشره يمكنك إرفاق هدية اختيارية." }); return; } try { const result = await commentMutation.mutateAsync({ postId: activePost.id, body: comment }); await removeDraft("comment"); setComment(""); setGiftTarget({ type: "comment", id: result.id, recipientId: activePost.authorId }); } catch { toast.error("تعذر إنشاء التعليق"); } })} className="rounded-full p-2 text-[#b77952] transition-colors hover:bg-[#f6e8da]"><Gift size={19} /></button></label><button type="button" onClick={handleComment} aria-label="إرسال التعليق" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#20352d] text-white transition-all hover:bg-[#2e4a3d] active:scale-[.97]"><Send size={17} /></button></div>
            </div>
          </article>
          <AdditionalPosts entries={feedEntries} feedLimit={feedLimit} onLoadMore={() => setFeedLimit(nextFeedLimit)} />
        </section>

        <aside id="messages" className="space-y-5 lg:sticky lg:top-24 lg:self-start"><div className="rounded-[26px] border border-[#e3d9ce] bg-[#20352d] p-5 text-white shadow-[0_14px_35px_rgba(36,53,45,.08)]"><div className="flex items-center justify-between"><span className="text-xs tracking-[.16em] text-[#e7b28f]">محفظة الهدايا</span><Wallet size={18} className="text-[#e7b28f]" /></div><p className="mt-4 font-serif text-3xl">{!user ? "—" : walletQuery.isPending ? "..." : walletQuery.isError ? "غير متاح" : `${walletQuery.data?.balanceEgp ?? "0.00"} ج.م`}</p><p className="mt-2 text-xs text-[#c8d1ca]">الرصيد للعرض فقط. الشحن سيُضاف بعد ربط مزود دفع موثوق.</p></div>
          <div className="rounded-[26px] border border-[#e3d9ce] bg-[#fffdf9] p-5 shadow-[0_14px_35px_rgba(36,53,45,.05)]"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold tracking-[.14em] text-[#ad7150]">رسائل فاي</p><h2 className="mt-2 font-serif text-2xl text-[#26392f]">حوار هادئ</h2></div><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#edf1ea] text-[#587062]"><MessageCircle size={19} /></span></div><div className="mt-5 rounded-2xl bg-[#f4f0e8] p-4"><div className="flex items-center gap-3"><img src={activePost.avatar} alt="" className="h-10 w-10 rounded-full object-cover" /><div><p className="text-sm font-semibold text-[#45594b]">{activePost.name}</p><p className="mt-1 text-xs text-[#8d978f]">متاحة للحوار المحترم</p></div><span className="mr-auto h-2 w-2 rounded-full bg-[#83a18b]" /></div><div className="mt-4 rounded-2xl rounded-tr-md bg-[#fffdf9] p-3 text-sm leading-7 text-[#65746b]">{messagePreview}</div>{messagesQuery.data?.[0]?.gift && <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#f5dfc8] px-3 py-1.5 text-xs text-[#9b6342]"><img src={messagesQuery.data[0].gift.iconUrl} alt="" className="h-4 w-4" /> هدية مرتبطة بالرسالة · {messagesQuery.data[0].gift.priceEgp} ج.م</div>}</div><div className="mt-4 flex items-end gap-2"><label className="flex min-h-11 flex-1 items-center gap-2 rounded-xl border border-[#e5dbcf] bg-[#fffdf9] px-3"><span className="sr-only">اكتب رسالة</span><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="اكتب رسالة..." className="w-full bg-transparent text-xs outline-none" /><button type="button" aria-label="إرسال هدية في الرسالة" onClick={() => { if (!lastMessageId) { toast("أرسل رسالة أولًا", { description: "يمكنك بعدها إرفاق هدية بالرسالة نفسها." }); return; } setGiftTarget({ type: "message", id: lastMessageId, recipientId: activePost.authorId }); }} className="text-[#b77952]"><Gift size={17} /></button></label><button type="button" onClick={handleMessage} aria-label="إرسال الرسالة" className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#20352d] text-white"><Send size={15} /></button></div><p className="mt-3 text-center text-[10px] text-[#9aa29b]">الرسائل مجانية بالكامل. الهدايا اختيارية فقط.</p></div>
          <div className="rounded-[26px] border border-[#e3d9ce] bg-[#ede8de] p-5"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f1d7c4] text-[#9b6342]"><ShieldCheck size={17} /></span><div><h3 className="font-semibold text-[#3e5144]">مساحة تحترمك</h3><p className="mt-2 text-xs leading-6 text-[#758177]">الإعجاب والتعليق والمتابعة والرسائل مجانية. لا يفتح الرصيد أي صلاحية اجتماعية إضافية.</p></div></div></div>
          <div id="saved" className="rounded-[26px] border border-[#e3d9ce] bg-[#fffdf9] p-5"><div className="flex items-center gap-2 text-[#a66743]"><Sparkles size={16} /><span className="text-xs font-semibold tracking-[.14em]">مسار التعارف</span></div><h3 className="mt-3 font-serif text-2xl text-[#26392f]">لا تستعجل البداية</h3><p className="mt-2 text-sm leading-7 text-[#758177]">احفظ ما يلامس اهتمامك، ثم عد إليه عندما يكون الحوار مناسبًا.</p><button type="button" onClick={handleFollow} className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors ${followed ? "bg-[#f1d7c4] text-[#9b6342]" : "bg-[#20352d] text-white hover:bg-[#2e4a3d]"}`}><UserPlus size={16} /> {followed ? "تمت المتابعة" : "متابعة الملف"}</button></div>
        </aside>
      </main>

      {giftTarget && <GiftStore gifts={gifts} loading={giftsQuery.isPending} error={giftsQuery.isError} target={giftTarget} onClose={() => setGiftTarget(null)} onGift={handleGift} />}
    </div>
  );
}

function BellIcon() {
  return <span className="relative block"><span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[#c3865d]" /><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg></span>;
}
