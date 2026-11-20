# فاي — المعادلة الذهبية

**Phi - The Golden Equation**

> توازن مثالي بين الوضوح والخصوصية، وإثبات الحقوق دون ادعاء سلطة قضائية.

فاي منصة عربية مفتوحة المصدر للتعارف الجاد، مبنية حول الشفافية والاختيار الواعي وحفظ أثر الإقرارات والاتفاقات بين الأطراف. التفاعل الاجتماعي والرسائل والإعجاب والتعليقات مجانية، بينما الهدايا الرقمية اختيارية، ولا تمنح أي امتياز اجتماعي.

## المزايا

- ملفات زواج عربية RTL مع تفضيلات ونسبة توافق قابلة للتفسير.
- خلاصة اجتماعية للنصوص والصور فقط، مع تخزين Offline للمحتوى المحفوظ والمسودات.
- غرف محادثة بمراحل حياة واضحة وصلاحيات كتم وحظر وإبلاغ.
- إقرارات صريحة للحالة الاجتماعية والأطفال والالتزامات، مع إصدارات غير قابلة للتعديل.
- أسئلة وأجوبة موثقة داخل المحادثات مع سجل hash متسلسل.
- حوكمة مجتمع للأسئلة: اقتراح وتصويت وفئات، كشف تكرار، فلترة أولية، تصنيف إلى مكتبة أو شائع أو مرفوض، ومراجعة إدارية بسبب محفوظ.
- خزنة وثائق تستخدم AES-256-GCM قبل التخزين.
- مسودات اتفاقات ما قبل الزواج وتوقيع نسخ محددة وتجميدها بعد توقيع الطرفين.
- هدايا رقمية بمعاملة مالية ذرية وIdempotency، مع عدم تفعيل شحن المحافظ أو VIP دون مزود دفع موثوق.
- إشعارات لا تُنشأ إلا بعد تفاعل حقيقي مثل إعجاب أو تعليق أو متابعة، ولا توجد إشعارات ترحيبية وهمية.

## التقنية

React 19، TypeScript، Tailwind CSS 4، tRPC 11، Drizzle ORM، MySQL/TiDB، Vitest، IndexedDB، Service Worker، وتخزين S3 متوافق مع Manus Forge.

## التشغيل المحلي

```bash
pnpm install
cp .env.example .env
# املأ المتغيرات محليًا فقط
pnpm check
pnpm test
pnpm build
pnpm dev
```

طبّق هجرات قاعدة البيانات عبر بيئة تطوير مخصصة:

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

## الأمان

لا تضع `.env` أو مفاتيح الدفع أو مفاتيح الخزنة في Git. استخدم Secret Manager في بيئة الإنتاج. خزنة الوثائق ليست بديلًا عن التوثيق القانوني، والمنصة لا تتحقق من صدق الوقائع بشكل مستقل ولا تمثل جهة قضائية أو محاميًا أو موثقًا.

## المساهمة والترخيص

راجع [CONTRIBUTING.md](./CONTRIBUTING.md). المشروع مرخص تحت GNU AGPLv3؛ راجع [LICENSE](./LICENSE).

---

## English summary

**Phi - The Golden Equation** is an Arabic RTL open-source serious matchmaking platform centered on transparent declarations, privacy, auditable agreement versions, and rights-preserving communication.

It provides a free social layer, optional virtual gifts, offline drafts, moderated chat rooms, immutable declaration and verified Q&A events, encrypted vault storage, and versioned premarital agreement workflows.

Run locally with `pnpm install`, `cp .env.example .env`, `pnpm check`, `pnpm test`, and `pnpm build`. Never commit `.env`, production credentials, payment secrets, or real user data.
