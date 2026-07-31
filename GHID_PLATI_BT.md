# Plăți cu cardul prin BT iPay (Banca Transilvania) — ghid

Site-ul folosește acum **BT iPay** în locul Stripe. Fluxul: clientul completează datele pe
`/plata/` → e redirecționat pe pagina securizată a Băncii Transilvania → după plată revine pe
`/plata-reusita.html`, care verifică starea și trimite emailurile de confirmare.

## Ce e deja făcut (nu mai trebuie atins)
- Funcții pe Supabase: `btipay-create-order` (creează comanda + inițiază plata) și
  `btipay-verify` (verifică plata, marchează comanda "platita", trimite emailuri prin Resend).
- Pagina `/plata/` refăcută (formular date client + redirect la bancă).
- Pagina `/plata-reusita.html` refăcută (verificare automată + golire coș la succes).
- Validare pe server: prețuri din catalog, stoc pe model, limită de cantitate.

## Ce trebuie să faci TU (o singură dată)

### 1. Contract BT iPay e-Commerce
- Cere oferta pe https://btepos.ro (secțiunea e-Commerce → „Cere oferta") sau direct la
  sucursala BT unde are firma cont. Spune că vrei **BT iPay pentru site propriu (integrare API)**,
  tip plăți **1-phase** (debitare automată la plată).
- Vei primi **credențiale de TEST** (utilizator + parolă) pentru mediul sandbox și acces la
  consola iPay. Atenție: credențialele de test și cele de producție sunt diferite.

### 2. Setează secretele în Supabase
Supabase → proiectul **rixair-site** → Edge Functions → Secrets:

| Secret | Valoare |
|---|---|
| `BTIPAY_USER` | utilizatorul API primit de la BT |
| `BTIPAY_PASSWORD` | parola API primită de la BT |
| `BTIPAY_ENV` | `test` (la lansare schimbi în `prod`) |
| `SITE_URL` | `https://rixair.ro` (după DNS; până atunci adresa GitHub Pages) |

`RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_ADMIN` rămân cele existente (emailurile funcționează la fel).

### 3. Test
- Adaugă un produs în coș → „Plătește cu cardul" → completezi datele → ești dus pe pagina BT
  (sandbox). Cardurile de test sunt în documentația primită de la BT odată cu credențialele.
- Verifici: comanda apare în Supabase (tabelul `comenzi`) ca `platita`, primești emailurile.

### 4. La lansare (producție)
- BT activează comerciantul pe mediul live după semnarea contractului.
- În Supabase Secrets: pui credențialele de producție și `BTIPAY_ENV` = `prod`. Atât.

## Notă despre vechiul Stripe
Funcțiile Stripe (`create-payment-intent`, `stripe-checkout`, `stripe-webhook`) încă există dar
NU mai sunt folosite de site. Le putem șterge după ce BT merge în producție.

## POS fizic
POS-ul fizic pentru showroom e un contract separat cu BT (terminal fizic) — nu implică site-ul.
Se cere tot pe btepos.ro sau în sucursală.
