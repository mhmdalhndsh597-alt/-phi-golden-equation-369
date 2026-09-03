import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { MapPin, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Profile() {
  const { user, loading } = useAuth();
  const profileQuery = trpc.profile.me.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const updateMutation = trpc.profile.update.useMutation();
  const [form, setForm] = useState({ name: "", bio: "", age: "", location: "", gender: "" });

  useEffect(() => {
    const profile = profileQuery.data;
    if (profile) setForm({ name: profile.name ?? "", bio: profile.bio ?? "", age: profile.age?.toString() ?? "", location: profile.location ?? "", gender: profile.gender ?? "" });
  }, [profileQuery.data]);

  if (loading || (user && profileQuery.isPending)) return <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#f5f1ea] text-sm text-[#718078]">جارٍ تحميل الملف...</div>;
  if (!user) return <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#f5f1ea] px-6 text-center"><div className="rounded-[28px] border border-[#e3d9ce] bg-[#fffdf9] p-8"><UserRound className="mx-auto text-[#b77952]" size={28} /><h1 className="mt-4 font-serif text-3xl text-[#26382f]">ملفك يبدأ من هنا</h1><p className="mt-3 text-sm text-[#718078]">سجّل الدخول لإكمال بيانات الزواج الخاصة بك.</p><Button onClick={startLogin} className="mt-6 bg-[#20352d]">تسجيل الدخول</Button></div></div>;
  if (profileQuery.isError) return <div dir="rtl" className="flex min-h-screen items-center justify-center bg-[#f5f1ea] text-sm text-[#9b6342]">تعذر تحميل الملف الشخصي.</div>;

  const save = async () => {
    try {
      await updateMutation.mutateAsync({ name: form.name, bio: form.bio, age: form.age ? Number(form.age) : undefined, location: form.location, gender: form.gender as "male" | "female" | "other" | undefined });
      await profileQuery.refetch();
      toast.success("تم حفظ ملفك بأمان");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ الملف");
    }
  };

  return <main dir="rtl" className="min-h-screen bg-[#f5f1ea] px-5 py-10 text-[#26382f] sm:px-8"><div className="mx-auto max-w-3xl"><div className="mb-8 flex items-end justify-between gap-4"><div><p className="text-xs font-semibold tracking-[.18em] text-[#ad7150]">ملف وصال</p><h1 className="mt-2 font-serif text-4xl">عرّف بنفسك بهدوء</h1><p className="mt-3 max-w-xl text-sm leading-7 text-[#718078]">بياناتك تساعد الآخرين على فهمك، ولا تُستخدم لفتح أي ميزة مدفوعة.</p></div><div className="hidden h-14 w-14 items-center justify-center rounded-2xl bg-[#20352d] text-white sm:flex"><ShieldCheck size={24} /></div></div><section className="rounded-[28px] border border-[#e3d9ce] bg-[#fffdf9] p-6 shadow-[0_18px_48px_rgba(36,53,45,.06)] sm:p-8"><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-semibold">الاسم<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 w-full rounded-xl border border-[#e5dbcf] bg-white px-4 py-3 font-normal outline-none focus:border-[#b77952]" maxLength={160} /></label><label className="text-sm font-semibold">العمر<input type="number" min={18} max={90} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="mt-2 w-full rounded-xl border border-[#e5dbcf] bg-white px-4 py-3 font-normal outline-none focus:border-[#b77952]" /></label><label className="text-sm font-semibold">المدينة<input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="mt-2 w-full rounded-xl border border-[#e5dbcf] bg-white px-4 py-3 font-normal outline-none focus:border-[#b77952]" maxLength={120} /></label><label className="text-sm font-semibold">النوع<select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="mt-2 w-full rounded-xl border border-[#e5dbcf] bg-white px-4 py-3 font-normal outline-none focus:border-[#b77952]"><option value="">اختر</option><option value="male">رجل</option><option value="female">امرأة</option><option value="other">أفضل عدم التحديد</option></select></label></div><label className="mt-5 block text-sm font-semibold">نبذة قصيرة<textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="mt-2 min-h-36 w-full rounded-xl border border-[#e5dbcf] bg-white px-4 py-3 font-normal leading-7 outline-none focus:border-[#b77952]" maxLength={2000} /></label><div className="mt-6 flex items-center justify-between gap-4 border-t border-[#eee7de] pt-5"><span className="flex items-center gap-2 text-xs text-[#7c887f]"><MapPin size={14} /> بياناتك تحت سيطرتك</span><Button onClick={save} disabled={updateMutation.isPending} className="bg-[#20352d] px-6">{updateMutation.isPending ? "جارٍ الحفظ..." : "حفظ الملف"}</Button></div></section></div></main>;
}
