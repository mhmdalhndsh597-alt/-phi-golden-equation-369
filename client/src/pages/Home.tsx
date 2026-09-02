import {
  ArrowLeft,
  ArrowUpLeft,
  Bell,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  Heart,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

// Style note: Zawaj Pro follows the Neo-Arabic Editorial movement: warm ivory,
// olive depth, aged copper accents, RTL composition, and quiet interactions.

type Profile = {
  id: number;
  name: string;
  age: number;
  city: string;
  role: string;
  education: string;
  image: string;
  tone: string;
};

const profiles: Profile[] = [
  {
    id: 1,
    name: "سارة",
    age: 29,
    city: "الرياض",
    role: "مصممة داخلية",
    education: "ماجستير في التصميم",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=85",
    tone: "تبحث عن شريك هادئ يقدّر التفاصيل والعائلة.",
  },
  {
    id: 2,
    name: "عمر",
    age: 34,
    city: "دبي",
    role: "مهندس مدني",
    education: "بكالوريوس هندسة",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85",
    tone: "يؤمن أن الحوار الواضح هو أجمل بداية.",
  },
  {
    id: 3,
    name: "ليان",
    age: 31,
    city: "عمّان",
    role: "باحثة تربوية",
    education: "دكتوراه في التربية",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=85",
    tone: "تحب الكتب والرحلات القصيرة والبيوت المليئة بالطمأنينة.",
  },
];

const values = ["الوضوح", "التوافق", "الخصوصية", "الجدية"];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("كل المدن");
  const [saved, setSaved] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const filteredProfiles = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return profiles.filter((profile) => {
      const matchesQuery =
        !normalized ||
        `${profile.name} ${profile.role} ${profile.education}`
          .toLowerCase()
          .includes(normalized);
      const matchesCity = city === "كل المدن" || profile.city === city;
      return matchesQuery && matchesCity;
    });
  }, [city, query]);

  const toggleSaved = (id: number) => {
    setSaved((current) => {
      const alreadySaved = current.includes(id);
      toast(alreadySaved ? "أزلنا الملف من المحفوظات" : "أضفنا الملف إلى المحفوظات", {
        description: alreadySaved
          ? "يمكنك العودة إليه من قسم المحفوظات."
          : "ستجده لاحقًا في قسم المحفوظات.",
        icon: alreadySaved ? <Bookmark size={16} /> : <CheckCircle2 size={16} />,
      });
      return alreadySaved ? current.filter((item) => item !== id) : [...current, id];
    });
  };

  const handleSoon = (label: string) => {
    toast(label, { description: "هذه الواجهة جاهزة للربط ببيانات حقيقية لاحقًا." });
  };

  return (
    <div dir="rtl" className="min-h-screen overflow-x-hidden bg-[#f8f5ef] text-[#24352d]">
      <header className="absolute inset-x-0 top-0 z-30 border-b border-white/20 bg-[#20352d]/20 text-white backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-10">
          <a href="#top" className="group flex items-center gap-3" aria-label="العودة إلى الرئيسية">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d9a27a]/70 bg-[#f7efe3]/10 p-2 shadow-[0_8px_24px_rgba(18,30,24,.14)] transition-transform duration-200 group-hover:-rotate-6">
              <img
                src="/manus-storage/zawaj-mark_d13f02b1.png"
                alt=""
                className="h-full w-full object-contain"
              />
            </span>
            <span className="leading-none">
              <span className="block font-serif text-xl tracking-wide text-[#fffaf2]">وصال</span>
              <span className="mt-1 block text-[10px] tracking-[0.28em] text-[#e9c8ae]">WISAL</span>
            </span>
          </a>

          <nav className="hidden items-center gap-8 text-sm text-[#f3e9de] lg:flex" aria-label="التنقل الرئيسي">
            <a className="border-b border-[#d9a27a] pb-1 text-white" href="#discover">اكتشف</a>
            <a className="transition-colors hover:text-[#f1c5a6]" href="#values">لماذا وصال؟</a>
            <a className="transition-colors hover:text-[#f1c5a6]" href="#privacy">الخصوصية</a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="hidden rounded-full px-4 py-2 text-sm text-[#fffaf2] transition-colors hover:bg-white/10 sm:inline-flex"
              onClick={() => setAuthOpen(true)}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              className="hidden items-center gap-2 rounded-full bg-[#c3865d] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(177,112,72,.28)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#b77952] active:scale-[.97] sm:inline-flex"
              onClick={() => setAuthOpen(true)}
            >
              ابدأ رحلتك <ArrowLeft size={16} />
            </button>
            <button
              type="button"
              className="rounded-full border border-white/30 p-2 text-white lg:hidden"
              aria-label="فتح القائمة"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-white/15 bg-[#20352d]/95 px-5 py-4 lg:hidden">
            <div className="flex flex-col gap-3 text-sm text-[#fffaf2]">
              <a href="#discover" onClick={() => setMenuOpen(false)}>اكتشف</a>
              <a href="#values" onClick={() => setMenuOpen(false)}>لماذا وصال؟</a>
              <a href="#privacy" onClick={() => setMenuOpen(false)}>الخصوصية</a>
              <button type="button" className="mt-2 border-t border-white/15 pt-3 text-right text-[#e9c8ae]" onClick={() => setAuthOpen(true)}>تسجيل الدخول أو إنشاء حساب</button>
            </div>
          </div>
        )}
      </header>

      <main id="top">
        <section className="relative min-h-[720px] overflow-hidden bg-[#20352d] text-white">
          <img
            src="/manus-storage/zawaj-hero_1b1db338.jpg"
            alt="باحة عربية دافئة ترمز إلى بداية لقاء هادئ"
            onError={(event) => {
              event.currentTarget.src = "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1800&q=85";
            }}
            className="absolute inset-0 h-full w-full object-cover object-center opacity-75"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(20,38,31,.95)_0%,rgba(25,46,37,.80)_38%,rgba(25,46,37,.20)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#f8f5ef] to-transparent" />
          <div className="relative mx-auto flex min-h-[720px] max-w-7xl items-center px-5 pb-20 pt-36 lg:px-10">
            <div className="max-w-xl animate-[rise-in_.65s_cubic-bezier(.23,1,.32,1)]">
              <div className="mb-7 flex items-center gap-3 text-sm text-[#e9c8ae]">
                <span className="h-px w-12 bg-[#d9a27a]" />
                <span>لأن البدايات تستحق عناية</span>
              </div>
              <h1 className="font-serif text-5xl leading-[1.2] tracking-tight text-[#fffaf2] sm:text-6xl lg:text-[76px]">
                بداية تُشبهك
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-9 text-[#e8e6dc] sm:text-xl">
                وصال مساحة عربية جادة للتعارف باحترام، حيث تلتقي القلوب المتقاربة على ما يهم فعلًا.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => setAuthOpen(true)}
                  className="inline-flex items-center gap-3 rounded-full bg-[#c3865d] px-6 py-3.5 font-semibold text-white shadow-[0_14px_35px_rgba(12,28,21,.25)] transition-all duration-200 hover:-translate-y-1 hover:bg-[#b77952] active:scale-[.97]"
                >
                  ابدأ بخطوة واضحة <ArrowLeft size={18} />
                </button>
                <a href="#discover" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-3.5 text-sm text-[#fffaf2] transition-colors hover:bg-white/10">
                  تصفّح بهدوء <ArrowUpLeft size={16} />
                </a>
              </div>
              <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-sm text-[#d5ddd5]">
                <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-[#dfaf8b]" /> خصوصية مصممة بعناية</span>
                <span className="flex items-center gap-2"><UsersRound size={16} className="text-[#dfaf8b]" /> اختيارات أكثر وضوحًا</span>
              </div>
            </div>
          </div>
          <div className="absolute bottom-12 left-5 hidden text-xs tracking-[0.28em] text-[#f1d2ba]/70 lg:block [writing-mode:vertical-rl]">WISAL · 2026</div>
        </section>

        <section id="discover" className="relative mx-auto max-w-7xl scroll-mt-24 px-5 py-20 lg:px-10 lg:py-28">
          <div className="grid gap-8 border-b border-[#d9cfc0] pb-10 lg:grid-cols-[1fr_auto_1.1fr] lg:items-end">
            <div className="order-2 lg:order-1">
              <p className="text-sm font-semibold text-[#b77952]">مساحة الاكتشاف</p>
              <h2 className="mt-3 max-w-md font-serif text-4xl leading-tight text-[#24352d] sm:text-5xl">أشخاص يشاركونك ما يهمك</h2>
            </div>
            <div className="order-1 flex items-center gap-3 lg:order-2 lg:flex-col">
              <span className="h-px w-10 bg-[#b77952] lg:h-10 lg:w-px" />
              <img src="/manus-storage/zawaj-mark_d13f02b1.png" alt="" className="h-9 w-9 rounded-full border border-[#cf9a78] bg-[#f1d7c4] p-1" />
              <span className="hidden text-[10px] tracking-[0.2em] text-[#9a6a4d] lg:block [writing-mode:vertical-rl]">وصال</span>
            </div>
            <p className="order-3 max-w-xl text-base leading-8 text-[#637168] lg:justify-self-end">
              ابدأ من القيم، لا من الانطباع الأول. ابحث عن ملفات تعريفية توضح الاهتمامات ونمط الحياة وما يتطلع إليه كل شخص من هذه الرحلة.
            </p>
          </div>

          <div className="mt-12 rounded-[26px] border border-[#dfd8cc] bg-[#fffdf9] p-3 shadow-[0_20px_60px_rgba(42,50,39,.08)] sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <label className="flex min-h-14 flex-1 items-center gap-3 rounded-2xl bg-[#f3efe7] px-4 text-[#69776d] focus-within:ring-2 focus-within:ring-[#c3865d]/40">
                <Search size={19} className="shrink-0 text-[#b77952]" />
                <span className="sr-only">ابحث عن اسم أو اهتمام</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ابحث عن اسم أو اهتمام..."
                  className="w-full bg-transparent text-sm text-[#24352d] outline-none placeholder:text-[#99a198]"
                />
              </label>
              <label className="flex min-h-14 items-center gap-3 rounded-2xl bg-[#f3efe7] px-4 text-sm text-[#69776d] lg:w-48">
                <MapPin size={18} className="shrink-0 text-[#b77952]" />
                <span className="sr-only">المدينة</span>
                <select value={city} onChange={(event) => setCity(event.target.value)} className="w-full appearance-none bg-transparent text-sm text-[#405247] outline-none">
                  <option>كل المدن</option>
                  <option>الرياض</option>
                  <option>دبي</option>
                  <option>عمّان</option>
                </select>
                <ChevronDown size={16} className="shrink-0" />
              </label>
              <button type="button" onClick={() => setShowFilters((visible) => !visible)} className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border px-5 text-sm transition-colors ${showFilters ? "border-[#b77952] bg-[#fff7ef] text-[#a66743]" : "border-[#e3ddd3] text-[#58695e] hover:bg-[#f7f2eb]"}`}>
                <SlidersHorizontal size={18} />
                خيارات أكثر
              </button>
              <button type="button" onClick={() => document.getElementById("profiles")?.scrollIntoView({ behavior: "smooth" })} className="min-h-14 rounded-2xl bg-[#20352d] px-7 text-sm font-semibold text-white transition-all hover:bg-[#2d4a3e] active:scale-[.98]">
                عرض النتائج
              </button>
            </div>
            {showFilters && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#ece6dd] px-2 pt-4 text-sm text-[#657268]">
                <span className="ml-2 text-xs text-[#98a098]">ما يهمك:</span>
                {values.map((value) => <button key={value} type="button" onClick={() => toast(`تم اختيار ${value}`, { description: "يمكن ربط هذا الخيار بفلاتر الحساب لاحقًا." })} className="rounded-full border border-[#dfd5c8] px-3 py-1.5 transition-colors hover:border-[#b77952] hover:text-[#a66743]">{value}</button>)}
              </div>
            )}
          </div>

          <div id="profiles" className="mt-16 scroll-mt-24">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <span className="flex items-center gap-2 text-sm text-[#8b968e]"><span className="h-px w-7 bg-[#b77952]" /> ملفات استكشافية للواجهة</span>
                <h3 className="mt-1 font-serif text-2xl text-[#24352d]">اقتراحات أولى</h3>
              </div>
              <button type="button" onClick={() => handleSoon("سنضيف خيارات اكتشاف أكثر قريبًا")} className="hidden items-center gap-2 text-sm font-semibold text-[#a66743] sm:flex">استكشف الكل <ArrowLeft size={16} /></button>
            </div>
            {filteredProfiles.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#d8cfc1] bg-[#fffdf9] px-6 py-14 text-center text-[#6b786e]">لم نجد ملفًا يطابق اختياراتك بعد. جرّب مدينة أو كلمة أخرى.</div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredProfiles.map((profile, index) => (
                  <article key={profile.id} className={`group overflow-hidden rounded-[28px] border border-[#e4ddd2] bg-[#fffdf9] shadow-[0_12px_30px_rgba(42,50,39,.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(42,50,39,.12)] ${index === 0 ? "xl:-mt-8" : index === 2 ? "xl:mt-8" : ""}`} style={{ animationDelay: `${index * 70}ms` }}>
                    <div className="relative aspect-[4/5] overflow-hidden bg-[#e4ded3]">
                      <img
                        src={profile.image}
                        alt={`صورة استكشافية لملف ${profile.name}`}
                        onError={(event) => {
                          event.currentTarget.src = profile.id === 1
                            ? "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=85"
                            : "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85";
                        }}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#17281f]/70 to-transparent" />
                      <span className="absolute right-4 top-4 rounded-full border border-white/30 bg-[#21372e]/65 px-3 py-1 text-[11px] text-white backdrop-blur-sm">ملف استكشافي</span>
                      <button type="button" aria-label={saved.includes(profile.id) ? `إزالة ${profile.name} من المحفوظات` : `حفظ ${profile.name}`} onClick={() => toggleSaved(profile.id)} className={`absolute left-4 top-4 rounded-full p-2.5 backdrop-blur-sm transition-colors ${saved.includes(profile.id) ? "bg-[#f3d1b9] text-[#8c5638]" : "bg-white/20 text-white hover:bg-white/35"}`}>
                        <Bookmark size={17} fill={saved.includes(profile.id) ? "currentColor" : "none"} />
                      </button>
                      <div className="absolute inset-x-4 bottom-4 flex items-end justify-between text-white">
                        <div><h4 className="font-serif text-2xl">{profile.name}، {profile.age}</h4><span className="mt-1 flex items-center gap-1 text-xs text-[#e9e8df]"><MapPin size={13} /> {profile.city}</span></div>
                        <span className="mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#d89b75] text-white"><CheckCircle2 size={16} /></span>
                      </div>
                    </div>
                    <div className="p-5">
                      <p className="font-medium text-[#394c40]">{profile.role}</p>
                      <p className="mt-1 text-sm text-[#8a948b]">{profile.education}</p>
                      <p className="mt-4 border-t border-[#eee8df] pt-4 text-sm leading-7 text-[#66756b]">{profile.tone}</p>
                      <button type="button" onClick={() => handleSoon(`عرض تفاصيل ملف ${profile.name}`)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#f1ece3] py-3 text-sm font-semibold text-[#485a4d] transition-colors hover:bg-[#e9e0d4]">عرض الملف <ArrowLeft size={16} /></button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section id="values" className="border-y border-[#e5ddd2] bg-[#ede8de] scroll-mt-24">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[.9fr_1.1fr] lg:px-10 lg:py-24">
            <div>
              <p className="text-sm font-semibold text-[#b77952]">الفرق في التفاصيل</p>
              <div className="flex items-center gap-3 text-xs tracking-[0.18em] text-[#9a6a4d]"><img src="/manus-storage/zawaj-mark_d13f02b1.png" alt="" className="h-7 w-7 rounded-full border border-[#c99674] bg-[#f1d7c4] p-1" /> وصال / المعنى أولًا</div>
              <h2 className="mt-4 max-w-md font-serif text-4xl leading-tight text-[#24352d] sm:text-5xl">تعارف أكثر هدوءًا، ونية أكثر وضوحًا</h2>
              <p className="mt-6 max-w-md leading-8 text-[#69766d]">صممنا وصال ليكون مكانًا يخفف الضجيج حول قرار مهم. لا وعود سريعة، ولا سباق لا ينتهي؛ فقط أدوات تساعدك أن ترى الإنسان كما هو.</p>
              <button type="button" onClick={() => setAuthOpen(true)} className="mt-8 inline-flex items-center gap-3 rounded-full border border-[#b77952] px-5 py-3 text-sm font-semibold text-[#9d623f] transition-colors hover:bg-[#fffaf3]">اعرف كيف تبدأ <ArrowLeft size={16} /></button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                [ShieldCheck, "خصوصية أولًا", "تظل اختياراتك ومساحتك الشخصية تحت سيطرتك."],
                [Heart, "نية جادة", "تجربة تضع التوافق والاحترام قبل كثرة التمرير."],
                [Sparkles, "بداية إنسانية", "نصوص بسيطة تساعدك على تقديم نفسك بصدق."],
                [UsersRound, "للعائلة مكان", "مسار يمكن أن يبدأ بحوار ناضج وواضح مع من تثق بهم."],
              ].map(([Icon, title, copy]) => (
                <div key={title as string} className="rounded-[22px] border border-[#ddd5c7] bg-[#f8f5ef]/75 p-6 transition-colors hover:border-[#c89877]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e6c7b1] text-[#8f5a3d]"><Icon size={20} /></span>
                  <h3 className="mt-5 font-serif text-xl text-[#304439]">{title as string}</h3>
                  <p className="mt-2 text-sm leading-7 text-[#758078]">{copy as string}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="privacy" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 lg:px-10 lg:py-24">
          <div className="relative overflow-hidden rounded-[30px] bg-[#21382e] px-7 py-12 text-white sm:px-12 lg:px-16 lg:py-16">
            <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full border border-[#d9a27a]/20" />
            <div className="absolute -left-8 -top-12 h-40 w-40 rounded-full border border-[#d9a27a]/20" />
            <div className="relative max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#d9a27a]/35 bg-[#d9a27a]/10 px-3 py-1.5 text-xs text-[#f0cdb5]"><ShieldCheck size={14} /> مساحة تحترمك</span>
              <h2 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">البداية لا تحتاج إلى ضجيج</h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-[#d7e0d8]">أنشئ ملفك عندما تشعر أن الوقت مناسب. لا نعرض ادعاءات أو أرقامًا مصطنعة؛ ما تراه هنا هو تصور أولي لتجربة وصال.</p>
              <button type="button" onClick={() => setAuthOpen(true)} className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#d29a76] px-6 py-3.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#c3865d] active:scale-[.97]">أنشئ ملفك الأول <ArrowLeft size={17} /></button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e5ddd2] bg-[#f4efe7]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm text-[#78847b] sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <div className="flex items-center gap-3"><img src="/manus-storage/zawaj-mark_d13f02b1.png" alt="" className="h-7 w-7" /><span>وصال — بداية تُشبهك</span></div>
          <div className="flex flex-wrap gap-5"><button type="button" onClick={() => handleSoon("سياسة الخصوصية")} className="hover:text-[#a66743]">سياسة الخصوصية</button><button type="button" onClick={() => handleSoon("تواصل معنا")} className="hover:text-[#a66743]">تواصل معنا</button><span>© 2026 وصال</span></div>
        </div>
      </footer>

      {authOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15251e]/65 px-5 py-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="auth-title">
          <div className="relative w-full max-w-md rounded-[28px] bg-[#fffdf9] p-7 shadow-[0_28px_80px_rgba(10,25,18,.28)] sm:p-9">
            <button type="button" aria-label="إغلاق النافذة" onClick={() => setAuthOpen(false)} className="absolute left-5 top-5 rounded-full p-2 text-[#728077] transition-colors hover:bg-[#f1ece3]"><X size={19} /></button>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f0d4c1] text-[#98603f]"><Heart size={22} fill="currentColor" /></div>
            <h2 id="auth-title" className="mt-6 font-serif text-3xl text-[#24352d]">خطوتك الأولى تبدأ هنا</h2>
            <p className="mt-3 text-sm leading-7 text-[#748078]">هذه شاشة التسجيل الأولية. سنوصلها لاحقًا بحساب آمن وملف شخصي كامل.</p>
            <label className="mt-6 block text-sm font-medium text-[#4c5e51]">البريد الإلكتروني<input type="email" placeholder="name@example.com" className="mt-2 w-full rounded-xl border border-[#ded6ca] bg-[#faf7f1] px-4 py-3 text-left outline-none transition focus:border-[#b77952] focus:ring-2 focus:ring-[#c3865d]/20" /></label>
            <button type="button" onClick={() => { setAuthOpen(false); toast("تم حفظ اهتمامك", { description: "سنجهّز لك الخطوة التالية عند ربط الحسابات." }); }} className="mt-5 w-full rounded-xl bg-[#20352d] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#2d4a3e]">متابعة</button>
            <p className="mt-4 text-center text-xs text-[#929b93]">لا توجد حسابات حقيقية متصلة بهذه النسخة الاستعراضية.</p>
          </div>
        </div>
      )}
    </div>
  );
}
