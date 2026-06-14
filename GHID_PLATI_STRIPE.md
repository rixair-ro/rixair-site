# RIXAIR — Plăți online (Stripe) — ghid de configurare și trecere pe LIVE

Arhitectură: site static (GitHub Pages) + Supabase Edge Functions + Stripe.
Proiect Supabase: **rixair-site** (`uyynocwfvwmgttckgvzu`). Cont Stripe acum: **sandbox/test**.

## Funcții deployate
- `stripe-checkout` — flux redirect clasic (checkout.stripe.com). Rămâne ca rezervă.
- `create-payment-intent` — **checkout propriu** (pagina `/plata/`, Payment Element). Validează coșul față de `produse.json`, creează PaymentIntent, salvează comanda ca `in_asteptare`.
- `stripe-webhook` — la `payment_intent.succeeded` / `checkout.session.completed` trece comanda pe `platita`, completează datele clientului și trimite emailuri (dacă e configurat Resend).

Butonul „Plătește cu cardul" din coș duce acum la pagina proprie `/plata/`.

---

## A. Ca să MEARGĂ acum (test) — 1 secret de adăugat
Supabase → proiect **rixair-site** → **Project Settings → Edge Functions → Secrets** (sau Settings → Secrets):

1. **`STRIPE_PUBLISHABLE_KEY`** = cheia ta **pk_test_...** (Stripe → Developers → API keys, „Publishable key").
   - E necesară pentru ca pagina `/plata/` să afișeze formularul de card.
   - (Cheia `STRIPE_SECRET_KEY` și `STRIPE_WEBHOOK_SECRET` sunt deja setate — checkout-ul vechi a funcționat.)

Apoi publică site-ul (`del ".git\index.lock"` apoi `PUBLICA.bat`) și testează cu cardul de test Stripe **4242 4242 4242 4242**, dată viitoare, orice CVC.

## B. Notificări email la comandă (opțional, recomandat)
1. Cont gratuit pe **resend.com** (3000 emailuri/lună).
2. Resend → API Keys → creează cheie → o adaugi în Supabase Secrets ca **`RESEND_API_KEY`**.
3. Până verifici domeniul rixair.ro, emailurile pleacă de la `onboarding@resend.dev`. După verificarea domeniului în Resend (records DNS), setezi și **`EMAIL_FROM`** = `RIXAIR <comenzi@rixair.ro>`.
4. Opțional **`EMAIL_ADMIN`** (implicit `office@rixar.ro`) — unde primești notificarea de comandă nouă.
Dacă `RESEND_API_KEY` lipsește, sistemul funcționează normal, doar nu trimite emailuri.

---

## C. Trecere pe LIVE (plăți reale)
1. **Activează contul Stripe live** cu datele firmei: RIXAR IMOB S.R.L., CUI RO40039921, J35/3638/2018, IBAN.
2. În Supabase Secrets înlocuiește:
   - `STRIPE_SECRET_KEY` → **sk_live_...**
   - `STRIPE_PUBLISHABLE_KEY` → **pk_live_...**
3. **Webhook nou pe LIVE**: Stripe (mod live) → Developers → Webhooks → Add endpoint:
   - URL: `https://uyynocwfvwmgttckgvzu.supabase.co/functions/v1/stripe-webhook`
   - Evenimente: `payment_intent.succeeded` **și** `checkout.session.completed`
   - Copiază noul **Signing secret** → Supabase Secrets `STRIPE_WEBHOOK_SECRET` = **whsec_...** (live)
4. **`SITE_URL`** = `https://rixair.ro` (după ce DNS-ul e activ) — pentru redirect-ul de succes al checkout-ului vechi.
5. **DNS rixair.ro**: 4×A (185.199.108.153 / .109 / .110 / .111) + CNAME `www` → `rixair-ro.github.io`; apoi Enforce HTTPS în GitHub Pages.
6. Branding Stripe (opțional): Stripe → Settings → Branding: logo RIXAIR, accent #1583ab.

## D. Test final (după fiecare modificare)
- Coș → „Plătește cu cardul" → `/plata/` → completezi email + livrare + card test → „Plătește".
- Verifici: redirect la `/plata-reusita.html`, comanda apare în Supabase tabel `comenzi` ca `platita`, primești emailul (dacă Resend e activ).

---

## E. Emailuri către clienți reali (Resend — verificare domeniu) — OBLIGATORIU pentru producție
Constatat la test: cu cont Resend FĂRĂ domeniu verificat, Resend trimite **doar către adresa contului** (tucasares@gmail.com) și răspunde 403 pentru orice alt destinatar. De aceea emailurile către clienți / office@rixar.ro nu plecau.

Ca să meargă către orice client:
1. Resend → **Domains** → Add domain → `rixair.ro`
2. Adaugi la furnizorul DNS înregistrările afișate de Resend (SPF/TXT + DKIM + MX pentru bounce). Se face odată cu wire-ul DNS pentru GitHub Pages.
3. După ce domeniul e „Verified", setezi în Supabase Secrets: `EMAIL_FROM = RIXAIR <comenzi@rixair.ro>` (adresă pe domeniul verificat).
4. Gata — emailul de confirmare ajunge la client + la `office@rixar.ro` (setabil prin secretul `EMAIL_ADMIN`).

Notă: codul de trimitere e corect și testat (status 200 către adresa contului). Restricția era exclusiv pe partea Resend (domeniu neverificat).
