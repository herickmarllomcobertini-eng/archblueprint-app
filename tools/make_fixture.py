#!/usr/bin/env python3
"""Monta, a partir do seed-data, o mesmo JSON que a API (PagesService) entrega por pagina.
Usado nos testes do modo protegido: <raiz>/apps/web/public/data/<pagina>.json + media/."""
import json, shutil, sys
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "apps/api"
dest = Path(sys.argv[1])
SEED = SRC / "prisma/seed-data"
L = lambda n: json.loads((SEED / f"{n}.json").read_text(encoding="utf-8"))

pages, blocks = L("pages"), L("blocks")
ui = {u["key"]: u["html"] for u in L("uiStrings")}
chars, groups = L("characters"), L("characterGroups")
cid = pid = 0
for c in chars:
    cid += 1; c["id"] = cid
    for p in c["parts"]:
        pid += 1; p["id"] = pid
for i, e in enumerate(L("entities")): pass

out = dest / "apps/web/public/data"
out.mkdir(parents=True, exist_ok=True)
for pg in pages:
    slug = pg["slug"]
    home = slug == "home"
    payload = {
        "page": {k: pg[k] for k in ("slug", "title", "headHtml", "htmlAttrs", "bodyAttrs")},
        "blocks": [dict(id=i + 1, **{k: b[k] for k in ("sortOrder", "key", "kind", "html")})
                   for i, b in enumerate([b for b in blocks if b["page"] == slug])],
        "ui": ui,
        "episodes": L("episodes") if home else [],
        "spinoffs": L("spinoffs") if home else [],
        "characterGroups": [dict(g, characters=[c for c in chars if c["groupId"] == g["id"]])
                            for g in L("characterGroups") if g["page"] == slug],
        "entityGroups": [dict(g, entities=[e for e in L("entities") if e["groupId"] == g["id"]])
                         for g in L("entityGroups") if g["page"] == slug],
        "rankGroups": [dict(g, ranks=[r for r in L("ranks") if r["groupId"] == g["id"]])
                       for g in L("rankGroups") if g["page"] == slug],
        "glossary": [g for g in L("glossary") if g["page"] == slug],
        "faq": L("faq") if home else [],
        "layerGroups": [dict(g, layers=[l for l in L("layers") if l["groupId"] == g["id"]])
                        for g in L("layerGroups") if g["page"] == slug],
        "camadaGroups": [dict(g, camadas=[c for c in L("camadas") if c["groupId"] == g["id"]])
                         for g in L("camadaGroups") if g["page"] == slug],
        "relmap": json.loads((SEED / "relmap.json").read_text(encoding="utf-8")) if home else {"nodes": [], "edges": []},
    }
    (out / f"{slug}.json").write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    print("fixture:", slug, len(json.dumps(payload)) // 1024, "KB")

media = dest / "apps/web/public/media"
if media.exists():
    shutil.rmtree(media)
shutil.copytree(SRC / "storage/media", media)
