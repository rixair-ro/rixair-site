// Verifica starea unei plati BT iPay (apelat de pagina /plata-reusita.html dupa
// intoarcerea de pe pagina bancii). Daca plata e finalizata (orderStatus=2),
// marcheaza comanda "platita" si trimite emailurile (Resend), o singura data.
import { createClient } from "npm:@supabase/supabase-js@2";

const BT_USER = Deno.env.get("BTIPAY_USER") ?? "";
const BT_PASS = Deno.env.get("BTIPAY_PASSWORD") ?? "";
const BT_ENV  = Deno.env.get("BTIPAY_ENV") ?? "test";
const BT_BASE = BT_ENV === "prod"
  ? "https://ecclients.btrl.ro/payment/rest/"
  : "https://ecclients-sandbox.btrl.ro/payment/rest/";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "RIXAIR <onboarding@resend.dev>";
const EMAIL_ADMIN = Deno.env.get("EMAIL_ADMIN") ?? "office@rixar.ro";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type" };

const lei = (n: number) =>
  new Intl.NumberFormat("ro-RO", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(n) + " Lei";

function adresaText(a: Record<string, unknown> | null): string {
  if (!a) return "—";
  return [a.adresa, a.localitate, a.judet].filter(Boolean).join(", ") || "—";
}

async function trimiteEmailuri(o: {
  numar: number | string; email: string; nume?: string | null; telefon?: string | null;
  adresa?: Record<string, unknown> | null; produse: { descriere: string; cantitate: number; suma: number }[]; total: number;
}) {
  if (!RESEND_API_KEY) return;
  const randuri = o.produse.map((p) =>
    `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${p.descriere}</td>` +
    `<td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center">${p.cantitate}</td>` +
    `<td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${lei(p.suma)}</td></tr>`).join("");
  const tabel =
    `<table style="border-collapse:collapse;width:100%;max-width:560px;font-family:Arial,sans-serif;font-size:14px">` +
    `<tr style="background:#1583ab;color:#fff"><th style="padding:8px 10px;text-align:left">Produs</th>` +
    `<th style="padding:8px 10px">Cant.</th><th style="padding:8px 10px;text-align:right">Sumă</th></tr>` + randuri +
    `<tr><td colspan="2" style="padding:8px 10px;text-align:right;font-weight:700">TOTAL</td>` +
    `<td style="padding:8px 10px;text-align:right;font-weight:700">${lei(o.total)}</td></tr></table>`;
  const adminHtml =
    `<div style="font-family:Arial,sans-serif;color:#222"><h2 style="color:#1583ab">Comandă nouă #${o.numar}</h2>` +
    `<p><b>Client:</b> ${o.nume || "—"}<br><b>Email:</b> ${o.email}<br><b>Telefon:</b> ${o.telefon || "—"}<br>` +
    `<b>Adresă:</b> ${adresaText(o.adresa ?? null)}</p>` + tabel +
    `<p style="color:#789;font-size:12px">Plată confirmată prin BT iPay.</p></div>`;
  const clientHtml =
    `<div style="font-family:Arial,sans-serif;color:#222"><h2 style="color:#1583ab">Mulțumim pentru comandă!</h2>` +
    `<p>Bună${o.nume ? " " + o.nume : ""}, am primit comanda ta #${o.numar} și plata a fost confirmată. ` +
    `Un coleg te va contacta în curând pentru detaliile de livrare.</p>` + tabel +
    `<p style="margin-top:18px">RIXAR IMOB S.R.L. · 0722 975 518 · office@rixar.ro</p></div>`;
  for (const m of [
    { to: EMAIL_ADMIN, subject: `Comandă nouă #${o.numar} — ${lei(o.total)}`, html: adminHtml },
    { to: o.email, subject: `Comanda ta RIXAIR #${o.numar} este confirmată`, html: clientHtml },
  ]) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: EMAIL_FROM, ...m }),
    }).catch(() => {});
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (!BT_USER || !BT_PASS) throw new Error("BT iPay neconfigurat");
    const { orderId } = await req.json();
    if (!orderId) throw new Error("orderId lipsa");

    const body = new URLSearchParams({ userName: BT_USER, password: BT_PASS, orderId, language: "ro" });
    const r = await (await fetch(BT_BASE + "getOrderStatusExtended.do", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    })).json();

    // orderStatus: 0=inregistrata 1=preautorizata 2=platita 3=anulata 4=rambursata 6=respinsa
    const st = Number(r.orderStatus ?? -1);
    const { data: com } = await db.from("comenzi")
      .select("numar,email,nume,telefon,adresa,produse,total,status")
      .eq("stripe_session", orderId).single();
    if (!com) throw new Error("comanda nu a fost gasita");

    if (st === 2 && com.status !== "platita") {
      await db.from("comenzi").update({ status: "platita" }).eq("stripe_session", orderId);
      await trimiteEmailuri({
        numar: com.numar, email: com.email, nume: com.nume, telefon: com.telefon,
        adresa: com.adresa, produse: com.produse, total: Number(com.total),
      });
    } else if ((st === 3 || st === 6) && com.status === "in_asteptare") {
      await db.from("comenzi").update({ status: "esuata" }).eq("stripe_session", orderId);
    }

    const status = st === 2 ? "platita" : (st === 0 || st === 5 ? "in_asteptare" : "esuata");
    return new Response(JSON.stringify({ status, numar: com.numar, total: Number(com.total), btStatus: st, btError: r.actionCodeDescription ?? r.errorMessage ?? null }),
      { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
