#!/usr/bin/env python3
"""
Extrai o conteudo dos dois HTML originais (backup/) para:
  - apps/api/storage/media/**.avif   (imagens base64 convertidas)
  - apps/api/prisma/seed-data/*.json (dados que o seed Prisma grava no SQLite)
  - apps/web/src/styles/original/*.css (CSS original, sem alteracao)

Cada trecho estruturado vira linhas de tabela. O que sobra do HTML vira
ContentBlock com marcadores <!--@tipo:arg--> que os componentes React
substituem pelos dados do banco.
"""
import base64, hashlib, io, json, re, subprocess, sys
from pathlib import Path
from bs4 import BeautifulSoup, Comment, NavigableString
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BACKUP = ROOT / "backup"
API = ROOT / "apps/api"
MEDIA = API / "storage/media"
SEED = API / "prisma/seed-data"
CSS_OUT = ROOT / "apps/web/src/styles/original"
for d in (MEDIA, SEED, CSS_OUT):
    d.mkdir(parents=True, exist_ok=True)

PAGES = {"home": "index.original.html", "hierarquia": "hierarquia.original.html"}

# hash -> (pasta, arquivo)
IMG_NAMES = {
    "639c428f25": ("estrutura", "macroestrutura-vista-de-fora"),
    "c4ff9834e8": ("estrutura", "corte-interno-da-estrutura"),
    "48a7fd3aec": ("estrutura", "a-entidade-retrato"),
    "c0edbb5d7d": ("entidades", "a-entidade"),
    "e68932194c": ("entidades", "onyx"),
    "653d2d18c0": ("personagens", "tengu-retrato"),
    "20b96afd89": ("personagens", "tengu-corpo-inteiro"),
    "3619b1d442": ("personagens", "tengu-lamina-de-nullis"),
    "7a3bf6ae7b": ("personagens", "onyx-retrato"),
    "0f7624953f": ("personagens", "onyx-lamina-verde"),
}

# Imagens finais enviadas pelo autor: se existir assets-src/images/<pasta>/<nome>.(png|jpg|webp),
# ela substitui a versao que estava em base64 no HTML original.
OVERRIDES = ROOT / "assets-src/images"


def find_override(folder, name):
    for ext in ("png", "jpg", "jpeg", "webp"):
        p = OVERRIDES / folder / f"{name}.{ext}"
        if p.exists():
            return p
    return None


DATA_URI = re.compile(r"data:image/([a-z+]+);base64,([A-Za-z0-9+/=]+)")
media_rows = {}


def convert_images(html: str) -> str:
    def sub(m):
        raw = base64.b64decode(m.group(2))
        h = hashlib.sha1(raw).hexdigest()[:10]
        folder, name = IMG_NAMES[h]
        rel = f"{folder}/{name}.avif"
        if h not in media_rows:
            src = find_override(folder, name)
            if src:
                im = Image.open(src)
                raw = src.read_bytes()
            else:
                im = Image.open(io.BytesIO(raw))
            if im.mode == "RGBA" and im.getchannel("A").getextrema()[0] == 255:
                im = im.convert("RGB")  # alfa todo opaco: nao precisa guardar
            elif im.mode not in ("RGB", "RGBA"):
                im = im.convert("RGB")
            (MEDIA / folder).mkdir(parents=True, exist_ok=True)
            im.save(MEDIA / rel, format="AVIF", quality=75, speed=4)
            media_rows[h] = dict(hash=h, folder=folder, filename=f"{name}.avif",
                                 path=f"/media/{rel}", width=im.width, height=im.height,
                                 bytesOriginal=len(raw), bytesAvif=(MEDIA / rel).stat().st_size,
                                 alt=None)
        return f"/media/{rel}"
    return DATA_URI.sub(sub, html)


NOISE_RE = re.compile(r"url\(\"data:image/svg\+xml,[^\"]*\"\)")


def extract_css(html: str):
    styles = re.findall(r"<style[^>]*>(.*?)</style>", html, flags=re.S)
    return styles


def attrs_of(el):
    out = {}
    for k, v in el.attrs.items():
        out[k] = " ".join(v) if isinstance(v, list) else v
    return out


def inner(el):
    return el.decode_contents()


def txt(el):
    return el.get_text("", strip=False).strip() if el else None


def mk(text):
    return Comment(text)


def replace_group(elements, marker_text):
    first = elements[0]
    first.replace_with(mk(marker_text))
    for e in elements[1:]:
        e.decompose()


def after_first_by_class(el, cls):
    return el.find(class_=cls)


# ---------------------------------------------------------------- extractors
def ex_episodes(soup, ds):
    ep = soup.find(id="episodios")
    if not ep:
        return
    readers = {r["id"]: r for r in ep.select(".ep-reader")}
    items = ep.select(".ep-item")
    for order, it in enumerate(items):
        slug = re.search(r"openEp\('([^']+)'\)", it["onclick"]).group(1)
        r = readers[slug]
        ds["episodes"].append(dict(
            slug=slug,
            readerOrder=list(readers).index(slug),
            seasonNumber=int(it["data-season"]) if it.get("data-season") else None,
            spinoffSlug=it.get("data-spinoff"),
            sortOrder=order,
            numLabel=txt(it.select_one(".ep-num")),
            title=txt(it.select_one(".ep-title")),
            subtitle=txt(it.select_one(".ep-sub")),
            itemAttrs=attrs_of(it),
            readerAttrs=attrs_of(r),
            readerTag=txt(r.select_one(".ep-reader-tag")),
            readerTitle=txt(r.select_one(".ep-reader-title")),
            afterHtml="".join(str(c) for c in r.find_all(recursive=False)
                              if not (set(c.get("class") or []) & {"ep-reader-header", "ep-content", "close-reader"})),
            bodyHtml=inner(r.select_one(".ep-content")),
            bodyAttrs=attrs_of(r.select_one(".ep-content")),
        ))
    closes = {str(r.select_one(".close-reader")).replace(slug_, "{slug}") for slug_, r in readers.items()}
    assert len(closes) == 1, closes
    ds["uiStrings"].append(dict(key="ep-reader-close", html=closes.pop()))
    for tab in ep.select("#spinoff-tabs .spinoff-tab"):
        slug = re.search(r"selectSpinoff\('([^']+)'", tab["onclick"]).group(1)
        ds["spinoffs"].append(dict(slug=slug, label=txt(tab), sortOrder=len(ds["spinoffs"]),
                                   attrs=attrs_of(tab)))
    # marcadores
    season_list = ep.select_one("#ep-list")
    spin_list = ep.select_one("#spinoff-ep-list")
    replace_group(season_list.select(".ep-item"), "@ep-items:season")
    replace_group(spin_list.select(".ep-item"), "@ep-items:spinoff")
    replace_group(list(readers.values()), "@ep-readers")
    tabs = ep.select_one("#spinoff-tabs")
    tabs.clear()
    tabs.append(mk("@spinoff-tabs"))


def ex_characters(soup, page, ds):
    sec = soup.find(id="personagens")
    if not sec:
        return
    for gi, grid in enumerate(sec.select(".char-grid")):
        gid = f"{page}-g{gi}"
        ds["characterGroups"].append(dict(id=gid, page=page, sortOrder=gi, attrs=attrs_of(grid)))
        for ci, card in enumerate(grid.find_all(recursive=False)):
            header = card.select_one(".char-card-header")
            badge = header.select_one(".char-rank-badge")
            body = card.select_one(".char-body")
            parts = []
            for pi, child in enumerate(body.find_all(recursive=False)):
                cls = child.get("class") or []
                if "estrutura-galeria" in cls:
                    parts.append(dict(kind="gallery", sortOrder=pi, label=None, attrs=attrs_of(child),
                                      html=None,
                                      images=[dict(attrs=attrs_of(i)) for i in child.find_all("img")]))
                elif "char-field" in cls:
                    order = []
                    for sub in child.children:
                        if isinstance(sub, NavigableString):
                            if str(sub).strip():
                                order.append(dict(t="raw", html=str(sub)))
                            continue
                        c2 = sub.get("class") or []
                        if "char-field-label" in c2:
                            order.append(dict(t="label", text=txt(sub), attrs=attrs_of(sub)))
                        elif "char-field-value" in c2:
                            order.append(dict(t="value", html=inner(sub), attrs=attrs_of(sub)))
                        else:
                            order.append(dict(t="raw", html=str(sub)))
                    parts.append(dict(kind="field", sortOrder=pi, label=None, attrs=attrs_of(child),
                                      html=None, fieldParts=order))
                else:
                    parts.append(dict(kind="html", sortOrder=pi, label=None, attrs=None, html=str(child)))
            ds["characters"].append(dict(
                page=page, groupId=gid, sortOrder=ci, attrs=attrs_of(card),
                name=txt(card.select_one(".char-name")), title=txt(card.select_one(".char-title")),
                headerAttrs=attrs_of(header),
                badgeText=txt(badge) if badge else None, badgeAttrs=attrs_of(badge) if badge else None,
                toggleText=txt(card.select_one(".char-toggle")),
                bodyAttrs=attrs_of(body), parts=parts))
        replace_group([grid], f"@characters:{gid}")


def ex_entities(soup, page, ds):
    sec = soup.find(id="entidades")
    if not sec:
        return
    grid = sec.select_one(".entities-grid")
    gid = f"{page}-entities"
    ds["entityGroups"].append(dict(id=gid, page=page, attrs=attrs_of(grid)))
    for i, card in enumerate(grid.select(":scope > .entity-card")):
        img = card.find("img")
        ds["entities"].append(dict(
            page=page, groupId=gid, sortOrder=i, attrs=attrs_of(card),
            rank=txt(card.select_one(".entity-rank")), name=txt(card.select_one(".entity-name")),
            imgAttrs=attrs_of(img) if img else None,
            descHtml=inner(card.select_one(".entity-desc")),
            descAttrs=attrs_of(card.select_one(".entity-desc")),
            tags=[dict(text=txt(t), attrs=attrs_of(t)) for t in card.select(".entity-tags .tag")],
            tagsAttrs=attrs_of(card.select_one(".entity-tags")),
            order=[c.get("class", [c.name])[0] if c.name != "img" else "img" for c in card.find_all(recursive=False)]))
    replace_group([grid], f"@entities:{gid}")


def ex_ranks(soup, page, ds):
    grid = soup.select_one(".rank-grid")
    if not grid:
        return
    gid = f"{page}-ranks"
    ds["rankGroups"].append(dict(id=gid, page=page, attrs=attrs_of(grid)))
    for i, row in enumerate(grid.select(":scope > .rank-row")):
        mid = row.find_all(recursive=False)[1]
        d0 = mid.select_one(".rank-desc")
        extra = "".join(str(n) for n in list(d0.next_siblings))
        ds["ranks"].append(dict(page=page, groupId=gid, sortOrder=i, attrs=attrs_of(row),
                                label=txt(row.select_one(".rank-label")),
                                labelAttrs=attrs_of(row.select_one(".rank-label")),
                                name=txt(row.select_one(".rank-name")),
                                nameAttrs=attrs_of(row.select_one(".rank-name")),
                                descHtml=inner(d0), descAttrs=attrs_of(d0),
                                extraHtml=extra, midAttrs=attrs_of(mid)))
    replace_group([grid], f"@ranks:{gid}")


def ex_glossary(soup, page, ds):
    sec = soup.find(id="glossario")
    if not sec:
        return
    rows = sec.select(".glossary-row")
    for i, r in enumerate(rows):
        t, d = r.select_one(".glossary-term"), r.select_one(".glossary-def")
        ds["glossary"].append(dict(page=page, sortOrder=i, attrs=attrs_of(r), term=txt(t),
                                   termAttrs=attrs_of(t), defHtml=inner(d), defAttrs=attrs_of(d)))
    replace_group(rows, f"@glossary:{page}")


def ex_faq(soup, ds):
    sec = soup.find(id="faq")
    if not sec:
        return
    items = sec.select("details.faq-item")
    for i, d in enumerate(items):
        s, a = d.find("summary"), d.select_one(".faq-answer")
        ds["faq"].append(dict(sortOrder=i, attrs=attrs_of(d), question=txt(s), questionAttrs=attrs_of(s),
                              answerHtml=inner(a), answerAttrs=attrs_of(a)))
    replace_group(items, "@faq")


def ex_layers(soup, page, ds):
    # 1) camadas (C01..C20) aninhadas em cosmo-layer
    parents = {}
    for ci in soup.select(".camada-item"):
        parents.setdefault(id(ci.parent), ci.parent)
    for k, parent in enumerate(parents.values()):
        gid = f"{page}-camadas-{k}"
        g = dict(id=gid, page=page, attrs=attrs_of(parent), trailingHtml="")
        ds["camadaGroups"].append(g)
        pending, i = [], -1
        for ci in list(parent.children):
            if isinstance(ci, NavigableString) and not isinstance(ci, Comment) and not str(ci).strip():
                continue
            if isinstance(ci, Comment) or "camada-item" not in (ci.get("class") or []):
                pending.append(ci.output_ready() if isinstance(ci, NavigableString) else str(ci))
                continue
            i += 1
            mid = ci.find_all(recursive=False)[1]
            ds["camadas"].append(dict(
                groupId=gid, sortOrder=i, attrs=attrs_of(ci), beforeHtml="".join(pending),
                code=txt(ci.select_one(".camada-code")), codeAttrs=attrs_of(ci.select_one(".camada-code")),
                midAttrs=attrs_of(mid),
                name=txt(ci.select_one(".camada-name")), nameAttrs=attrs_of(ci.select_one(".camada-name")),
                descHtml=inner(ci.select_one(".camada-desc")), descAttrs=attrs_of(ci.select_one(".camada-desc"))))
            pending = []
        g["trailingHtml"] = "".join(pending)
        parent.replace_with(mk(f"@camadas:{gid}"))
    # 2) grupos de cosmo-layer
    for gi, grp in enumerate(soup.select(".cosmo-layers")):
        gid = f"{page}-layers-{gi}"
        ds["layerGroups"].append(dict(id=gid, page=page, sortOrder=gi, attrs=attrs_of(grp)))
        pending = []
        children = [c for c in grp.children if not (isinstance(c, NavigableString) and not isinstance(c, Comment) and not str(c).strip())]
        i = -1
        for L in children:
            if isinstance(L, Comment) or L.name is None or "cosmo-layer" not in (L.get("class") or []):
                pending.append(L.output_ready() if isinstance(L, NavigableString) else str(L))
                continue
            i += 1
            kids = L.find_all(recursive=False)
            num, mid, badge = kids[0], kids[1], kids[-1]
            name = mid.select_one(":scope > .layer-name")
            rest = []
            seen = False
            for node in list(mid.children):
                if node is name:
                    seen = True
                    continue
                if seen:
                    rest.append(str(node))
            pre = []
            for node in list(mid.children):
                if node is name:
                    break
                pre.append(str(node))
            ds["layers"].append(dict(
                groupId=gid, sortOrder=i, attrs=attrs_of(L), beforeHtml="".join(pending),
                numHtml=str(num), numAttrs=attrs_of(num), numTag=num.name,
                midAttrs=attrs_of(mid), preNameHtml="".join(pre),
                name=txt(name), nameAttrs=attrs_of(name),
                bodyHtml="".join(rest),
                badgeText=txt(badge), badgeAttrs=attrs_of(badge),
                kidCount=len(kids)))
            pending = []
        ds["layerGroups"][-1]["trailingHtml"] = "".join(pending)
        grp.replace_with(mk(f"@layers:{gid}"))


def ex_relmap(soup, ds):
    js = [s.string for s in soup.find_all("script") if s.string and "relMapData" in s.string]
    if not js:
        return
    code = js[0]
    i = code.index("relMapData = ")
    # corta o literal por balanceamento de chaves
    start = code.index("{", i)
    depth, j = 0, start
    while True:
        c = code[j]
        depth += (c == "{") - (c == "}")
        j += 1
        if depth == 0:
            break
    literal = code[start:j]
    out = subprocess.run(["node", "-e", f"console.log(JSON.stringify(({literal})))"],
                         capture_output=True, text=True, check=True).stdout
    data = json.loads(out)
    ds["relmap"] = data


def ex_head_and_layout(soup, page, ds):
    head = soup.head
    keep = [str(c) for c in head.children if getattr(c, "name", None) not in ("style", "script", None)]
    ds["pages"].append(dict(slug=page, title=soup.title.string, headHtml="".join(keep),
                            htmlAttrs=attrs_of(soup.html), bodyAttrs=attrs_of(soup.body)))
    for i, node in enumerate(soup.body.children):
        if isinstance(node, NavigableString):
            if isinstance(node, Comment) or not str(node).strip():
                if isinstance(node, Comment):
                    ds["blocks"].append(dict(page=page, sortOrder=i, key=f"comment-{i}", kind="comment", html=str(node.output_ready())))
                continue
        if node.name == "script":
            continue
        key = node.get("id") or (node.get("class") or [node.name])[0]
        kind = "section" if node.name == "section" else "chrome"
        ds["blocks"].append(dict(page=page, sortOrder=i, key=f"{key}-{i}", kind=kind, html=str(node)))


def register_static(folder, name, alt):
    """Imagem que nao estava em base64 (ex.: fundo do hero, vinha como arquivo PNG do repositorio)."""
    src = find_override(folder, name)
    if not src:
        return
    im = Image.open(src)
    if im.mode not in ("RGB", "RGBA"):
        im = im.convert("RGB")
    (MEDIA / folder).mkdir(parents=True, exist_ok=True)
    rel = f"{folder}/{name}.avif"
    im.save(MEDIA / rel, format="AVIF", quality=70, speed=4)
    h = hashlib.sha1(src.read_bytes()).hexdigest()[:10]
    media_rows[h] = dict(hash=h, folder=folder, filename=f"{name}.avif", path=f"/media/{rel}",
                         width=im.width, height=im.height, bytesOriginal=src.stat().st_size,
                         bytesAvif=(MEDIA / rel).stat().st_size, alt=alt)


def main():
    ds = {k: [] for k in ["uiStrings", "pages", "blocks", "episodes", "spinoffs", "characterGroups", "characters",
                          "entityGroups", "entities", "rankGroups", "ranks", "glossary", "faq",
                          "camadaGroups", "camadas", "layerGroups", "layers"]}
    ds["relmap"] = None
    scripts = {}
    for page, fname in PAGES.items():
        raw = (BACKUP / fname).read_text(encoding="utf-8")
        scripts[page] = [s for s in re.findall(r"<script[^>]*>(.*?)</script>", raw, flags=re.S)]
        css = extract_css(raw)
        for n, c in enumerate(css):
            c = NOISE_RE.sub('url("/assets/textures/parchment-noise.svg")', c)
            # o planeta do hero vem de apps/web/public/planeta-disco.png (caminho absoluto no build)
            c = c.replace("url('planeta-disco.png')", "url('/media/fundos/planeta-disco.avif')")
            (CSS_OUT / f"{page}.{n}.css").write_text(c.strip() + "\n", encoding="utf-8")
        html = convert_images(raw)
        soup = BeautifulSoup(html, "html.parser")
        for s in soup.find_all("style"):
            s.decompose()
        ex_relmap(soup, ds) if page == "home" else None
        ex_episodes(soup, ds) if page == "home" else None
        ex_characters(soup, page, ds)
        ex_entities(soup, page, ds)
        ex_ranks(soup, page, ds)
        ex_glossary(soup, page, ds)
        ex_faq(soup, ds) if page == "home" else None
        ex_layers(soup, page, ds)
        ex_head_and_layout(soup, page, ds)
    # alt/uso das imagens
    for page, fname in PAGES.items():
        pass
    for p in list(ds["characters"]):
        pass
    register_static("fundos", "planeta-disco", "Planeta disco (fundo do hero)")
    ds["media"] = list(media_rows.values())
    alts = {}
    srcs = [dict(i["attrs"]) for c in ds["characters"] for p in c["parts"] if p["kind"] == "gallery" for i in p["images"]]
    srcs += [e["imgAttrs"] for e in ds["entities"] if e["imgAttrs"]]
    for a in srcs:
        if a.get("src") and a.get("alt"):
            alts.setdefault(a["src"], a["alt"])
    for m in ds["media"]:
        m["alt"] = alts.get(m["path"]) or m["alt"]
    for name, rows in ds.items():
        (SEED / f"{name}.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    for page, ss in scripts.items():
        for n, s in enumerate(ss):
            (ROOT / "assets-src" / f"{page}.script{n}.js").write_text(s, encoding="utf-8")
    print({k: (len(v) if isinstance(v, list) else 'obj') for k, v in ds.items()})


if __name__ == "__main__":
    main()
