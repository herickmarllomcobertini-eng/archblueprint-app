#!/usr/bin/env python3
"""Reconstroi cada pagina a partir dos JSON (mesmos renderizadores que os componentes
React usam) e compara com o HTML original, bloco a bloco."""
import json, re, sys
from html import escape
from pathlib import Path
from bs4 import BeautifulSoup, Comment, NavigableString
sys.path.insert(0, str(Path(__file__).parent))
import extract as ex

ROOT = ex.ROOT
SEED = ex.SEED
D = {p.stem: json.loads(p.read_text(encoding="utf-8")) for p in SEED.glob("*.json")}


def A(attrs):
    if not attrs:
        return ""
    return "".join(f' {k}="{escape(str(v), quote=True)}"' for k, v in attrs.items())


def E(t):
    return escape(t or "", quote=False)


def by(rows, key, val):
    return [r for r in rows if r.get(key) == val]


R = {}
CLOSE = D["uiStrings"][0]["html"]


def ep_item(e):
    sub = f'<div class="ep-sub">{E(e["subtitle"])}</div>' if e["subtitle"] else ""
    return (f'<div{A(e["itemAttrs"])}><span class="ep-num">{E(e["numLabel"])}</span>'
            f'<div><div class="ep-title">{E(e["title"])}</div>{sub}</div><span class="ep-arrow">→</span></div>')


def ep_reader(e):
    close = CLOSE.replace("{slug}", e["slug"])
    return (f'<div{A(e["readerAttrs"])}><div class="ep-reader-header"><div class="ep-reader-tag">{E(e["readerTag"])}</div>'
            f'<div class="ep-reader-title">{E(e["readerTitle"])}</div></div><div{A(e["bodyAttrs"])}>{e["bodyHtml"]}</div>{e["afterHtml"]}'
            + close + '</div>')


def char_card(c):
    badge = f'<span{A(c["badgeAttrs"])}>{E(c["badgeText"])}</span>' if c["badgeText"] is not None else ""
    parts = ""
    for p in c["parts"]:
        if p["kind"] == "gallery":
            parts += f'<div{A(p["attrs"])}>' + "".join(f'<img{A(i["attrs"])}/>' for i in p["images"]) + "</div>"
        elif p["kind"] == "field":
            inner_ = ""
            for fp in p["fieldParts"]:
                if fp["t"] == "label":
                    inner_ += f'<span{A(fp["attrs"])}>{E(fp["text"])}</span>'
                elif fp["t"] == "value":
                    inner_ += f'<div{A(fp["attrs"])}>{fp["html"]}</div>'
                else:
                    inner_ += fp["html"]
            parts += f'<div{A(p["attrs"])}>{inner_}</div>'
        else:
            parts += p["html"]
    return (f'<div{A(c["attrs"])}><div{A(c["headerAttrs"])}><div><div class="char-name">{E(c["name"])}</div>'
            f'<div class="char-title">{E(c["title"])}</div></div>{badge}</div>'
            f'<div class="char-toggle">{E(c["toggleText"])}</div><div{A(c["bodyAttrs"])}>{parts}</div></div>')


def entity(e):
    out = {"entity-rank": f'<div class="entity-rank">{E(e["rank"])}</div>',
           "entity-name": f'<div class="entity-name">{E(e["name"])}</div>',
           "img": f'<img{A(e["imgAttrs"])}/>' if e["imgAttrs"] else "",
           "entity-desc": f'<div{A(e["descAttrs"])}>{e["descHtml"]}</div>',
           "entity-tags": f'<div{A(e["tagsAttrs"])}>' + "".join(f'<span{A(t["attrs"])}>{E(t["text"])}</span>' for t in e["tags"]) + "</div>"}
    return f'<div{A(e["attrs"])}>' + "".join(out[k] for k in e["order"]) + "</div>"


def rank(r):
    return (f'<div{A(r["attrs"])}><div{A(r["labelAttrs"])}>{E(r["label"])}</div><div{A(r["midAttrs"])}>'
            f'<div{A(r["nameAttrs"])}>{E(r["name"])}</div><div{A(r["descAttrs"])}>{r["descHtml"]}</div>{r["extraHtml"]}</div></div>')


def gloss(g):
    return f'<div{A(g["attrs"])}><div{A(g["termAttrs"])}>{E(g["term"])}</div><div{A(g["defAttrs"])}>{g["defHtml"]}</div></div>'


def faq(f):
    return (f'<details{A(f["attrs"])}><summary{A(f["questionAttrs"])}>{E(f["question"])}</summary>'
            f'<div{A(f["answerAttrs"])}>{f["answerHtml"]}</div></details>')


def camada(c):
    return c["beforeHtml"] + (f'<div{A(c["attrs"])}><span{A(c["codeAttrs"])}>{E(c["code"])}</span><div{A(c["midAttrs"])}>'
            f'<div{A(c["nameAttrs"])}>{E(c["name"])}</div><div{A(c["descAttrs"])}>{c["descHtml"]}</div></div></div>')


def layer(L):
    return L["beforeHtml"] + (f'<div{A(L["attrs"])}>{L["numHtml"]}<div{A(L["midAttrs"])}>{L["preNameHtml"]}'
            f'<div{A(L["nameAttrs"])}>{E(L["name"])}</div>{L["bodyHtml"]}</div>'
            f'<span{A(L["badgeAttrs"])}>{E(L["badgeText"])}</span></div>')


def render_marker(kind, arg):
    if kind == "ep-items":
        rows = [e for e in D["episodes"] if (e["seasonNumber"] is not None) == (arg == "season")]
        return "".join(ep_item(e) for e in rows)
    if kind == "ep-readers":
        return "".join(ep_reader(e) for e in sorted(D["episodes"], key=lambda x: x["readerOrder"]))
    if kind == "spinoff-tabs":
        return "".join(f'<button{A(s["attrs"])}>{E(s["label"])}</button>' for s in D["spinoffs"])
    if kind == "characters":
        g = [g for g in D["characterGroups"] if g["id"] == arg][0]
        return f'<div{A(g["attrs"])}>' + "".join(char_card(c) for c in by(D["characters"], "groupId", arg)) + "</div>"
    if kind == "entities":
        g = [g for g in D["entityGroups"] if g["id"] == arg][0]
        return f'<div{A(g["attrs"])}>' + "".join(entity(e) for e in by(D["entities"], "groupId", arg)) + "</div>"
    if kind == "ranks":
        g = [g for g in D["rankGroups"] if g["id"] == arg][0]
        return f'<div{A(g["attrs"])}>' + "".join(rank(r) for r in by(D["ranks"], "groupId", arg)) + "</div>"
    if kind == "glossary":
        return "".join(gloss(g) for g in by(D["glossary"], "page", arg))
    if kind == "faq":
        return "".join(faq(f) for f in D["faq"])
    if kind == "camadas":
        g = [g for g in D["camadaGroups"] if g["id"] == arg][0]
        return f'<div{A(g["attrs"])}>' + "".join(camada(c) for c in by(D["camadas"], "groupId", arg)) + g["trailingHtml"] + "</div>"
    if kind == "layers":
        g = [g for g in D["layerGroups"] if g["id"] == arg][0]
        return f'<div{A(g["attrs"])}>' + "".join(layer(l) for l in by(D["layers"], "groupId", arg)) + g.get("trailingHtml", "") + "</div>"
    raise KeyError(kind)


MARK = re.compile(r"<!--@([a-z-]+)(?::([^>]*?))?-->")


def expand(html):
    while MARK.search(html):
        html = MARK.sub(lambda m: render_marker(m.group(1), m.group(2)), html)
    return html


def canon(html):
    s = BeautifulSoup(html, "html.parser")
    for c in s.find_all(string=lambda x: isinstance(x, Comment)):
        c.extract()
    out = str(s)
    out = re.sub(r">\s+<", "><", out)
    out = re.sub(r"\s+", " ", out).strip()
    return out


def main():
    # botao de fechar: descobre o texto padrao no original
    close = {}
    ok_all = True
    for page, fname in ex.PAGES.items():
        raw = (ex.BACKUP / fname).read_text(encoding="utf-8")
        html = ex.convert_images(raw)
        soup = BeautifulSoup(html, "html.parser")
        for s in soup.find_all("style"):
            s.decompose()
        originals = [n for n in soup.body.children if not isinstance(n, NavigableString) and n.name != "script"]
        if page == "home":
            btn = soup.select_one(".ep-reader .close-reader")
            close["html"] = str(btn)
        blocks = sorted(by(D["blocks"], "page", page), key=lambda b: b["sortOrder"])
        blocks = [b for b in blocks if b["kind"] != "comment"]
        assert len(blocks) == len(originals), (page, len(blocks), len(originals))
        bad = 0
        for b, o in zip(blocks, originals):
            rebuilt = expand(b["html"])
            if canon(rebuilt) != canon(str(o)):
                bad += 1
                a, c = canon(rebuilt), canon(str(o))
                i = next((k for k in range(min(len(a), len(c))) if a[k] != c[k]), min(len(a), len(c)))
                print(f"[{page}] DIFF em {b['key']} (pos {i}):\n  novo: ...{a[max(0,i-80):i+120]}\n  orig: ...{c[max(0,i-80):i+120]}")
        print(f"[{page}] blocos: {len(blocks)}  diferentes: {bad}")
        ok_all &= bad == 0
    print("RESULTADO:", "IDENTICO" if ok_all else "COM DIFERENCAS")
    return 0 if ok_all else 1


if __name__ == "__main__":
    sys.exit(main())
