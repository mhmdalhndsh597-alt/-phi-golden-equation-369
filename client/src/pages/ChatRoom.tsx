import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import ConnectionStatus from "@/components/ConnectionStatus";
import { Button } from "@/components/ui/button";
import { getDraft, listQueuedActions, queueAction, removeDraft, removeQueuedAction, saveDraft } from "@/lib/offlineStore";
import { trpc } from "@/lib/trpc";
import { Ban, Gift, LockKeyhole, MessageCircle, MicOff, Send, ShieldCheck, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type RoomStatus = "draft" | "scheduled" | "live" | "closed" | "archived";
const labels: Record<RoomStatus, { label: string; tone: string }> = {
  draft: { label: "قيد الإنشاء", tone: "bg-[#eee9df] text-[#7e776d]" },
  scheduled: { label: "مجدولة", tone: "bg-[#f1e5c8] text-[#927036]" },
  live: { label: "جارية الآن", tone: "bg-[#dcebdd] text-[#437354]" },
  closed: { label: "مغلقة", tone: "bg-[#f1d7d1] text-[#92554b]" },
  archived: { label: "أرشيف", tone: "bg-[#e6e9e5] text-[#6f7b72]" },
};

export default function ChatRoom() {
  const { user, loading } = useAuth();
  const roomsQuery = trpc.chat.rooms.useQuery(undefined, { enabled: Boolean(user), refetchInterval: 20_000 });
  const [roomId, setRoomId] = useState<number>();
  const selected = useMemo(() => roomsQuery.data?.find((room) => room.id === roomId) ?? roomsQuery.data?.[0], [roomsQuery.data, roomId]);
  const messagesQuery = trpc.chat.messages.useQuery({ roomId: selected?.id ?? 0, limit: 50 }, { enabled: Boolean(user && selected), refetchInterval: selected?.status === "live" ? 5_000 : false });
  const membersQuery = trpc.chat.members.useQuery({ roomId: selected?.id ?? 0 }, { enabled: Boolean(user && selected), refetchInterval: selected?.status === "live" ? 15_000 : false });
  const giftsQuery = trpc.gifts.catalog.useQuery();
  const giftMutation = trpc.gifts.send.useMutation({ onSuccess: () => { setGiftTarget(null); toast.success("تم إرسال الهدية"); void messagesQuery.refetch(); }, onError: (error) => toast.error(error.message) });
  const moderationMutation = trpc.chat.moderate.useMutation({ onSuccess: () => { void membersQuery.refetch(); toast.success("تم تحديث إدارة العضو"); }, onError: (error) => toast.error(error.message) });
  const joinMutation = trpc.chat.join.useMutation({ onSuccess: () => { void messagesQuery.refetch(); void membersQuery.refetch(); toast.success("تم الانضمام إلى الغرفة"); } });
  const sendMutation = trpc.chat.send.useMutation({ onSuccess: () => { setBody(""); void removeDraft("chat-message"); void messagesQuery.refetch(); } });
  const [body, setBody] = useState("");
  const [giftTarget, setGiftTarget] = useState<{ id: number; userId: number } | null>(null);

  useEffect(() => { if (selected?.id) setRoomId(selected.id); }, [selected?.id]);
  useEffect(() => {
    let active = true;
    void getDraft("chat-message").then((draft) => { if (active && draft?.body) setBody(draft.body); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const flushRoomActions = async () => {
      if (!selected || selected.status !== "live" || !navigator.onLine || sendMutation.isPending) return;
      const actions = await listQueuedActions();
      for (const action of actions.filter((item) => item.kind === "chat-message" && Number(item.payload.roomId) === selected.id)) {
        try {
          await sendMutation.mutateAsync({ roomId: selected.id, body: String(action.payload.body ?? "") });
          await removeQueuedAction(action.id);
          await removeDraft("chat-message");
        } catch {
          break;
        }
      }
    };
    void flushRoomActions();
    const onOnline = () => { void flushRoomActions(); };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [selected?.id, selected?.status, sendMutation.isPending]);

  if (loading || (user && roomsQuery.isPending)) return <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#f5f1ea] text-sm text-[#718078]">جارٍ تحميل غرف فاي...</div>;
  if (!user) return <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#f5f1ea] px-6 text-center"><div className="rounded-[28px] border border-[#e3d9ce] bg-[#fffdf9] p-8"><MessageCircle className="mx-auto text-[#b77952]" size={28} /><h1 className="mt-4 font-serif text-3xl text-[#26382f]">غرف الحوار</h1><p className="mt-3 text-sm text-[#718078]">سجّل الدخول للمشاركة في الغرف المجانية.</p><Button onClick={startLogin} className="mt-6 bg-[#20352d]">تسجيل الدخول</Button></div></div>;
  if (roomsQuery.isError) return <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#f5f1ea] text-sm text-[#9b6342]">تعذر تحميل الغرف.</div>;

  const status = selected ? labels[selected.status as RoomStatus] : undefined;
  const closed = selected?.status === "closed" || selected?.status === "archived";
  const actorMembership = membersQuery.data?.find(({ member }) => member.userId === user.id)?.member;
  const canModerate = user.role === "admin" || actorMembership?.role === "owner" || actorMembership?.role === "moderator";
  const join = () => { if (selected && !closed && selected.status !== "draft") joinMutation.mutate({ roomId: selected.id }); };
  const send = async () => {
    if (!selected || selected.status !== "live" || !body.trim()) return;
    try {
      await sendMutation.mutateAsync({ roomId: selected.id, body: body.trim() });
    } catch (error) {
      if (!navigator.onLine) {
        await saveDraft({ kind: "chat-message", body, syncPending: true });
        await queueAction({ kind: "chat-message", payload: { roomId: selected.id, body } });
        toast("حُفظت الرسالة للمزامنة عند عودة الاتصال");
      } else toast.error(error instanceof Error ? error.message : "تعذر إرسال الرسالة");
    }
  };
  const moderate = (targetUserId: number, action: "mute" | "unmute" | "block" | "unblock") => {
    if (!selected) return;
    moderationMutation.mutate({ roomId: selected.id, targetUserId, action, durationMinutes: action === "mute" ? 60 : undefined });
  };

  return <main dir="rtl" className="min-h-screen bg-[#f5f1ea] px-5 py-10 text-[#26382f] sm:px-8"><div className="mx-auto max-w-6xl"><header className="mb-8 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold tracking-[.18em] text-[#ad7150]">مجالس فاي</p><h1 className="mt-2 font-serif text-4xl">غرف حوار هادئة</h1><p className="mt-3 text-sm text-[#718078]">كل غرفة تحمل حالة واضحة. الغرف المغلقة محفوظة للأرشيف ولا تقبل أي نشاط.</p></div><div className="hidden h-14 w-14 items-center justify-center rounded-2xl bg-[#20352d] text-white sm:flex"><UsersRound size={24} /></div></header><div className="mb-4 flex items-center justify-between"><ConnectionStatus /><span className="text-xs text-[#8a958d]">الرسائل والتفاعل الاجتماعي مجانيان</span></div><div className="grid gap-6 lg:grid-cols-[.85fr_1.4fr]"><aside className="space-y-3">{roomsQuery.data?.length ? roomsQuery.data.map((room) => { const roomStatus = labels[room.status as RoomStatus]; return <button key={room.id} type="button" onClick={() => setRoomId(room.id)} className={`w-full rounded-2xl border p-4 text-right transition ${selected?.id === room.id ? "border-[#b77952] bg-[#fff7ef]" : "border-[#e3d9ce] bg-[#fffdf9] hover:border-[#c9b39e]"}`}><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{room.name}</h2><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${roomStatus.tone}`}>{roomStatus.label}</span></div><p className="mt-2 line-clamp-2 text-xs leading-6 text-[#718078]">{room.description ?? "غرفة فاي الرسمية للحوار المحترم."}</p></button>; }) : <div className="rounded-2xl border border-dashed border-[#d5c6b6] bg-[#fffdf9] p-6 text-center text-sm text-[#718078]">لا توجد غرف منشورة بعد.</div>}</aside><section className="flex min-h-[560px] flex-col rounded-[28px] border border-[#e3d9ce] bg-[#fffdf9] shadow-[0_18px_48px_rgba(36,53,45,.06)]">{selected ? <><div className="flex items-start justify-between gap-4 border-b border-[#eee7de] p-5"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-serif text-2xl">{selected.name}</h2>{status && <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.tone}`}>{status.label}</span>}</div><p className="mt-2 text-sm leading-6 text-[#718078]">{selected.description}</p></div>{closed ? <LockKeyhole className="text-[#a96851]" size={20} /> : <ShieldCheck className="text-[#6e9576]" size={20} />}</div>{canModerate && membersQuery.data?.length ? <div className="border-b border-[#eee7de] bg-[#fbf8f2] p-4"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-semibold tracking-[.13em] text-[#ad7150]">إدارة الأعضاء</p><span className="text-[10px] text-[#8b958d]">للمالك والمشرفين فقط</span></div><div className="flex flex-wrap gap-2">{membersQuery.data.map(({ member, user: memberUser }) => { const isSelf = member.userId === user.id; const isBlocked = Boolean(member.blockedAt); const isMuted = Boolean(member.mutedUntil && new Date(member.mutedUntil).getTime() > Date.now()); return <div key={member.id} className="flex items-center gap-2 rounded-full border border-[#e3d9ce] bg-white px-3 py-1.5 text-xs"><span className="max-w-28 truncate">{memberUser?.name ?? "عضو"}</span><span className="text-[10px] text-[#9aa29b]">{member.role}</span>{!isSelf && member.role === "member" && <>{isMuted ? <button type="button" aria-label="إلغاء الكتم" onClick={() => moderate(member.userId, "unmute")} className="text-[#a66743]"><MicOff size={13} /></button> : <button type="button" aria-label="كتم العضو" onClick={() => moderate(member.userId, "mute")} className="text-[#7d8a82]"><MicOff size={13} /></button>}{isBlocked ? <button type="button" aria-label="إلغاء الحظر" onClick={() => moderate(member.userId, "unblock")} className="text-[#a66743]"><Ban size={13} /></button> : <button type="button" aria-label="حظر العضو" onClick={() => moderate(member.userId, "block")} className="text-[#7d8a82]"><Ban size={13} /></button>}</>}</div>; })}</div></div> : null}<div className="flex-1 space-y-3 overflow-y-auto p-5">{closed && <div className="rounded-2xl border border-[#e8cfc8] bg-[#fff2ee] p-4 text-sm leading-7 text-[#92554b]"><strong>هذه الغرفة مغلقة.</strong> يمكنك الاطلاع على الأرشيف، لكن لا يمكن الانضمام أو إرسال رسائل أو بدء نشاط جديد.</div>}{!closed && selected.status !== "live" && <div className="rounded-2xl border border-[#eadfbd] bg-[#fff9e9] p-4 text-sm leading-7 text-[#927036]">الغرفة ليست مباشرة الآن. يمكنك العودة عند بدء الحالة «جارية الآن».</div>}{messagesQuery.isPending ? <p className="text-sm text-[#718078]">جارٍ تحميل الرسائل...</p> : messagesQuery.isError ? <p className="text-sm text-[#9b6342]">لا يمكنك قراءة هذه الغرفة قبل الانضمام إليها.</p> : messagesQuery.data?.length ? messagesQuery.data.slice().reverse().map(({ message, author, gift }) => <div key={message.id} className="rounded-2xl bg-[#f4f0e8] p-3"><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-[#43564a]">{author?.name ?? "عضو فاي"}</span><span className="text-[10px] text-[#9aa29b]">{new Date(message.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</span></div><p className="mt-1 text-sm leading-7 text-[#65746b]">{message.body}</p>{gift && <div className="mt-2 inline-flex rounded-full border border-[#d7ac5b] bg-[#fff6d8] px-3 py-1 text-xs text-[#896522]">🎁 {gift.giftName} · هدية مرسلة</div>}{selected.status === "live" && message.userId !== user.id && <button type="button" onClick={() => setGiftTarget({ id: message.id, userId: message.userId })} className="mt-3 inline-flex items-center gap-1 rounded-full border border-[#d7c2a8] px-3 py-1 text-xs text-[#8d654b] hover:bg-[#fff8ef]"><Gift size={13} /> أرسل هدية</button>}</div>) : <p className="text-sm text-[#8b958d]">ابدأوا الحوار باحترام، وستظهر الرسائل هنا.</p>}</div>{giftTarget && !closed && selected.status === "live" && <div className="border-t border-[#eee7de] bg-[#fffaf2] p-4"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">اختر هدية لهذه الرسالة</p><button type="button" onClick={() => setGiftTarget(null)} className="text-xs text-[#92554b]">إلغاء</button></div>{giftsQuery.isPending ? <p className="text-xs text-[#718078]">جارٍ تحميل الهدايا...</p> : giftsQuery.data?.length ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{giftsQuery.data.map((gift) => <button key={gift.id} type="button" disabled={giftMutation.isPending} onClick={() => giftMutation.mutate({ recipientId: giftTarget.userId, giftId: gift.id, chatRoomId: selected.id, chatMessageId: giftTarget.id, idempotencyKey: `room-${selected.id}-${giftTarget.id}-${Date.now()}` })} className="rounded-xl border border-[#e7d7c2] bg-white p-2 text-right text-xs hover:border-[#b77952]"><span className="block truncate font-semibold">{gift.giftName}</span><span className="mt-1 block text-[#a8734f]">{gift.priceEgp} جنيه</span></button>)}</div> : <p className="text-xs text-[#9b6342]">لا توجد هدايا متاحة حاليًا.</p>}</div>}{closed ? <div className="border-t border-[#eee7de] p-5 text-center text-xs text-[#92554b]">التفاعل متوقف لأن الغرفة مغلقة.</div> : selected.status === "live" ? <div className="flex gap-2 border-t border-[#eee7de] p-4"><input value={body} onChange={(event) => { setBody(event.target.value); void saveDraft({ kind: "chat-message", body: event.target.value }); }} onKeyDown={(event) => { if (event.key === "Enter") void send(); }} placeholder="اكتب رسالة مجانية..." className="min-h-11 flex-1 rounded-xl border border-[#e5dbcf] bg-white px-4 text-sm outline-none focus:border-[#b77952]" /><Button onClick={() => void send()} disabled={sendMutation.isPending || !body.trim()} className="h-11 bg-[#20352d]"><Send size={16} /></Button></div> : <div className="border-t border-[#eee7de] p-4"><Button onClick={join} disabled={joinMutation.isPending} className="w-full bg-[#20352d]">انضم للغرفة عند فتحها</Button></div>}</> : <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-[#718078]">اختر غرفة من القائمة لعرض حالتها.</div>}</section></div></div></main>;
}
