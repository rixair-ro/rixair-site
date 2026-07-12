#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""SINCRONIZARE produse -> site. Citeste data/produse.json si aplica pret/stoc/vizibilitate
pe toate paginile. Idempotent - poate rula oricand. Ruleaza: python sync.py"""
import re, json, os, html as H

ROOT = os.path.dirname(os.path.abspath(__file__))
D = lambda *p: os.path.join(ROOT, *p)
PR  = {p["nr"]: p for p in json.load(open(D("data/produse.json"), encoding="utf-8"))}
MAP = {int(k): v for k, v in json.load(open(D("data/pagini_map.json"), encoding="utf-8")).items()}

def fmt(x):
    s = "%.2f" % float(x); a, b = s.split(".")
    return re.sub(r"(?<=\d)(?=(\d{3})+$)", ".", a) + "," + b

def vviz(p):
    """variantele afisate pe site: cele cu stoc != fara_stoc (daca toate ar fi ascunse, se afiseaza toate)"""
    vs = p.get("variante") or []
    viz = [v for v in vs if v.get("stoc") != "fara_stoc"]
    return viz if viz else vs

def pmin(p):
    vs = vviz(p)
    if vs:
        cu_pret = [v["pret"] for v in vs if v.get("pret")]
        if cu_pret: return min(cu_pret)
    return p.get("pret_de_la")

STOC_TXT = {"in_stoc": "In stoc", "la_comanda": "La comandă", "fara_stoc": "Nu este în stoc", "ascuns": "Indisponibil"}
cache = {}
def load(rel):
    if rel not in cache: cache[rel] = open(D("docs", rel), encoding="utf-8").read()
    return cache[rel]
def save(rel, h): cache[rel] = h

def card_span(h, pid):
    i = h.find('-g-product-box-%d"' % pid)
    if i < 0: return None
    j = h.rfind('<div', 0, i)
    while j >= 0 and 'product-box' not in h[j:h.find('>', j)+1]:
        j = h.rfind('<div', 0, j)
    depth = 0
    for mm in re.finditer(r'<div\b|</div>', h[j:]):
        depth += 1 if mm.group(0) == '<div' else -1
        if depth == 0: return (j, j + mm.end())
    return None

for nr, p in sorted(PR.items()):
    info = MAP.get(nr)
    if not info: continue
    stoc = p.get("stoc", "in_stoc")
    mn = pmin(p)
    card_pret = ("de la %s Lei" % fmt(mn)) if mn else "Preț la cerere"
    if vviz(p) and vviz(p)[0].get("pret"):
        det_pret = "%s Lei" % fmt(vviz(p)[0]["pret"])
    elif mn:
        det_pret = "de la %s Lei" % fmt(mn)
    else:
        det_pret = "Preț la cerere"
    # ---- pagini detaliu ----
    for rel in info["detalii"]:
        h = load(rel)
        h = re.sub(r'(class="fPrice -g-product-final-price-\d+">)\s*[^<]*', r'\g<1> %s ' % det_pret, h)
        if p.get("variante"):
            def opt(v):
                stocattr = ' data-stoc="%d"' % v["cantitate"] if v.get("cantitate") else ""
                return '<option data-pret="%s" data-prnum="%s" data-sku="%s"%s>%s</option>' % (
                    fmt(v["pret"]) if v.get("pret") else "", v["pret"] if v.get("pret") else "",
                    H.escape(v["sku"]), stocattr, H.escape(v["nume"]))
            variante_afisate = vviz(p)
            if any(v.get("grup") for v in variante_afisate):
                opts = ""; gcur = None; deschis = False
                for v in variante_afisate:
                    g = v.get("grup")
                    if g != gcur:
                        if deschis: opts += "</optgroup>"; deschis = False
                        if g: opts += '<optgroup label="%s">' % H.escape(g); deschis = True
                        gcur = g
                    opts += opt(v)
                if deschis: opts += "</optgroup>"
            else:
                opts = "".join(opt(v) for v in variante_afisate)
            sel = '<select class="input-s rxVar" style="max-width:300px">%s</select>' % opts
            if re.search(r'<select class="input-s rxVar"', h):
                h = re.sub(r'<select class="input-s rxVar"[^>]*>.*?</select>', sel, h, flags=re.S)
            else:
                h = re.sub(r'<span class="rx-note">.*?</span>', sel, h, count=1, flags=re.S)
        else:
            nota = '<span class="rx-note">Mai multe mărimi disponibile — configurația exactă se stabilește la ofertare.</span>'
            h = re.sub(r'<select class="input-s rxVar"[^>]*>.*?</select>', nota, h, flags=re.S)
        h = re.sub(r'("pret":)\s*[^,}]+', r'\g<1> %s' % (mn if mn else "null"), h, count=1)
        val = ("%.4f" % mn) if mn else "0.0000"
        h = re.sub(r'(id="productBasePrice" value=")[^"]*', r'\g<1>%s' % val, h)
        h = re.sub(r'(id="productFinalPrice" value=")[^"]*', r'\g<1>%s' % val, h)
        # eticheta de stoc de pe detaliu (primul stock-status dupa fPrice)
        i = h.find("fPrice")
        seg = h[i:i+3000]
        seg2 = re.sub(r'(stock-status[^>]*>)(\s*(?:<i[^>]*></i>)?\s*)[^<]*', r'\g<1>\g<2>%s' % STOC_TXT[stoc], seg, count=1)
        h = h[:i] + seg2 + h[i+3000:]
        # fara_stoc: ascunde cantitatea + butonul "Adauga in cos" (stil per-pagina, idempotent)
        h = re.sub(r'<style id="rx-nostock">.*?</style>', '', h, flags=re.S)
        if stoc == "fara_stoc":
            h = h.replace('</head>', '<style id="rx-nostock">.add-section{display:none!important}#wrapper [class*="-g-product-stock-status"],#wrapper [class*="-g-product-stock-status"] *{color:#c0392b!important}#wrapper [class*="-g-product-stock-status"] i{display:none!important}</style></head>', 1)
        save(rel, h)
    # ---- carduri pe listari ----
    for pid_s, files in info["listari"].items():
        pid = int(pid_s)
        for rel in files:
            h = load(rel)
            h = re.sub(r'(-g-product-box-final-price-%d"[^>]*>)\s*[^<]*' % pid, r'\g<1>%s' % card_pret, h)
            span = card_span(h, pid)
            if span:
                blk = h[span[0]:span[1]]
                blk = re.sub(r'(stock-status[^>]*>)(\s*(?:<i[^>]*></i>)?\s*)[^<]*', r'\g<1>\g<2>%s' % STOC_TXT[stoc], blk, count=1)
                # vizibilitate
                op = re.match(r'<div[^>]*>', blk).group(0)
                op2 = re.sub(r'\s*data-rx-hidden="1"', '', op).replace(' style="display:none"', '')
                op2 = re.sub(r'\s*data-rx-nostock="1"', '', op2)
                if stoc == "ascuns":
                    op2 = op2[:-1] + ' data-rx-hidden="1" style="display:none">'
                elif stoc == "fara_stoc":
                    op2 = op2[:-1] + ' data-rx-nostock="1">'
                blk = op2 + blk[len(op):]
                h = h[:span[0]] + blk + h[span[1]:]
            save(rel, h)

# ---- search data (fara produse ascunse) ----
sd = []
for nr, p in sorted(PR.items()):
    if p.get("stoc", "in_stoc") == "ascuns": continue
    info = MAP.get(nr, {})
    url = "/" + (info.get("detalii") or [""])[0]
    mn = pmin(p)
    sd.append({"n": p["nume_lung"], "u": url, "i": "/poze-rx/" + os.path.basename(p["poza"]), "p": (fmt(mn) if mn else None)})
open(D("docs", "rixair-search-data.js"), "w", encoding="utf-8").write("window.RXP=%s;" % json.dumps(sd, ensure_ascii=False))

for rel, h in cache.items():
    open(D("docs", rel), "w", encoding="utf-8").write(h)
print("SINCRONIZAT: %d produse pe %d fisiere" % (len(PR), len(cache)))
