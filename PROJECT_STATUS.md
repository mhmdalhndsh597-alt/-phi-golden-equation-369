# الحالة التقنية — Phi - The Golden Equation

## مكتمل

- React 19 / Tailwind 4 / tRPC 11 / Drizzle / MySQL-TiDB.
- حسابات وملفات تعريف عربية وخلاصة نصوص وصور فقط.
- تفاعلات ورسائل وغرف محادثة مجانية مع moderation.
- هدايا رقمية ذرية مع Decimal وrow locking وIdempotency.
- Offline feed cache، مسودات، وطابور مزامنة.
- حسابات رسمية وتجريبية معلّمة بوضوح.
- إقرارات صريحة بإصدارات، قبول رقمي، وhash chain لسجل الشفافية.
- Verified Q&A مع منع تعديل أو حذف الإجابة المثبتة.
- خزنة وثائق AES-256-GCM مع تحقق SHA-256 وصلاحية المالك.
- اتفاقات مبدئية بنسخ وتوقيعات، وتجميد النسخة بعد توقيع الطرفين.
- تجهيز AGPLv3 وREADME وCONTRIBUTING و`.env.example`.

## يحتاج تكاملًا خارجيًا قبل الإنتاج المالي

- شحن المحافظ الفعلي.
- بوابة الدفع والـ webhooks الموقعة.
- اشتراكات VIP الفعلية؛ لا يتم منح entitlement من طلب عميل فقط.
- مراجعة قانونية محلية للاتفاقات والإقرارات.
- اختبار تزامن تكاملي على قاعدة اختبارية حقيقية.

## بنية البيانات الجديدة

`marriage_declarations`, `declaration_acceptances`, `transparency_events`, `verified_questions`, `verified_answers`, `vault_documents`, `premarital_agreements`, `agreement_terms`, `agreement_signatures`, `subscription_products`, `subscriptions`.

السجلات الموثقة append-only على مستوى إجراءات التطبيق: التصحيح يتم بإصدار جديد، وليس بتعديل أو حذف السجل القديم.

## التحقق

```bash
pnpm check
pnpm test
pnpm build
```

## ملاحظة قانونية

المنصة أداة تقنية لحفظ الإقرارات والاتفاقات بين الأطراف، وليست جهة قضائية أو محاميًا أو موثقًا رسميًا، ولا تضمن صحة البيانات أو قابلية البنود للنفاذ القانوني.
