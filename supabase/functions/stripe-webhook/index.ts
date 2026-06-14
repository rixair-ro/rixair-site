// Primeste evenimente de la Stripe.
//  - checkout.session.completed  (flux redirect Stripe Checkout)  -> insereaza comanda
//  - payment_intent.succeeded    (flux checkout propriu /plata/)   -> trece comanda pe "platita"
// La plata reusita trimite si email de notificare (Resend), daca RESEND_API_KEY e setat.
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
const whSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "RIXAIR <onboarding@resend.dev>";
const EMAIL_ADMIN = Deno.env.get("EMAIL_ADMIN") ?? "office@rixar.ro";

const lei = (n: number) =>
  new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + " Lei";

function adresaText(a: Record<string, unknown> | null): string {
  if (!a) return "—";
  const p = [a.line1, a.line2, a.city, a.state, a.postal_code, a.country].filter(Boolean);
  return p.join(", ") || "—";
}

async function trimiteEmailuri(o: {
  numar?: number | string; email: string; nume?: string | null; telefon?: string | null;
  adresa?: Record<string, unknown> | null; produse: { descriere: string; cantitate: number; suma: number }[];
  total: number;
}) {
  if (!RESEND_API_KEY) return;
  const randuri = o.produse.map((p) =>
    `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${p.descriere}</td>` +
    `<td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center">${p.cantitate}</td>` +
    `<td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${lei(p.suma)}</td></tr>`).join("");
  const tabel =
    `<table style="border-collapse:collapse;width:100%;max-width:560px;font-family:Arial,sans-serif;font-size:14px">` +
    `<tr style="background:#1583ab;color:#fff"><th style="padding:8px 10px;text-align:left">Produs</th>` +
    `<th style="padding:8px 10px">Cant.</th><th style="padding:8px 10px;text-align:right">Sumă</th></tr>` +
    randuri +
    `<tr><td colspan="2" style="padding:8px 10px;text-align:right;font-weight:700">TOTAL</td>` +
    `<td style="padding:8px 10px;text-align:right;font-weight:700">${lei(o.total)}</td></tr></table>`;

  const adminHtml =
    `<div style="font-family:Arial,sans-serif;color:#222">` +
    `<h2 style="color:#1583ab">Comandă nouă${o.numar ? " #" + o.numar : ""}</h2>` +
    `<p><b>Client:</b> ${o.nume || "—"}<br><b>Email:</b> ${o.email || "—"}<br>` +
    `<b>Telefon:</b> ${o.telefon || "—"}<br><b>Adresă:</b> ${adresaText(o.adresa)}</p>` +
    tabel + `<p style="color:#789;font-size:12px">Plată confirmată prin Stripe.</p></div>`;

  const clientHtml =
    `<div style="font-family:Arial,sans-serif;color:#222">` +
    `<h2 style="color:#1583ab">Mulțumim pentru comandă!</h2>` +
    `<p>Bună${o.nume ? " " + o.nume : ""}, am primit comanda ta și plata a fost confirmată. ` +
    `Un coleg te va contacta în curând pentru detaliile de livrare.</p>` +
    tabel +
    `<p style="margin-top:18px">RIXAR IMOB S.R.L. · 0722 975 518 · office@rixar.ro</p></div>`;

  const send = async (to: string, subject: string, html: string) => {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": "Bearer " + RESEND_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
      });
      const txt = await r.text();
      console.log("RESEND", to, "status", r.status, txt.slice(0, 400));
    } catch (e) { console.error("email fail", to, String(e)); }
  };

  const jobs = [send(EMAIL_ADMIN, `Comandă nouă${o.numar ? " #" + o.numar : ""} — ${lei(o.total)}`, adminHtml)];
  if (o.email) jobs.push(send(o.email, "Confirmare comandă RIXAIR", clientHtml));
  await Promise.all(jobs);
}

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig!, whSecret);
  } catch {
    return new Response("semnatura invalida", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    const full = await stripe.checkout.sessions.retrieve(s.id, { expand: ["line_items"] });
    const produse = (full.line_items?.data ?? []).map((li) => ({
      descriere: li.description ?? "",
      cantitate: li.quantity ?? 1,
      suma: (li.amount_total ?? 0) / 100,
    }));
    const total = (s.amount_total ?? 0) / 100;
    const rec = {
      email: s.customer_details?.email ?? s.customer_email ?? "",
      nume: s.customer_details?.name ?? null,
      telefon: s.customer_details?.phone ?? null,
      adresa: (s.customer_details?.address as Record<string, unknown>) ?? null,
      produse, total, status: "platita", stripe_session: s.id,
    };
    const { data } = await db.from("comenzi").upsert(rec, { onConflict: "stripe_session" }).select("numar").single();
    await trimiteEmailuri({ ...rec, numar: data?.numar });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = await stripe.paymentIntents.retrieve(
      (event.data.object as Stripe.PaymentIntent).id,
      { expand: ["latest_charge"] },
    );
    const ch = pi.latest_charge as Stripe.Charge | null;
    const bd = ch?.billing_details;
    const ship = ch?.shipping;
    const adresa = (ship?.address ?? bd?.address ?? null) as Record<string, unknown> | null;
    const upd: Record<string, unknown> = {
      status: "platita",
      nume: ship?.name ?? bd?.name ?? null,
      telefon: ship?.phone ?? bd?.phone ?? null,
      adresa,
    };
    if (bd?.email) upd.email = bd.email;
    const { data } = await db.from("comenzi").update(upd)
      .eq("stripe_session", pi.id).select("numar,email,produse,total").single();
    if (data) {
      await trimiteEmailuri({
        numar: data.numar,
        email: (upd.email as string) ?? data.email,
        nume: upd.nume as string | null,
        telefon: upd.telefon as string | null,
        adresa,
        produse: data.produse as { descriere: string; cantitate: number; suma: number }[],
        total: Number(data.total),
      });
    }
  }

  return new Response("ok", { headers: { "Content-Type": "text/plain" } });
});
