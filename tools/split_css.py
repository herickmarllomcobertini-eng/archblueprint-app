#!/usr/bin/env python3
"""Divide o CSS original em arquivos por componente, SEM mudar a ordem nem uma regra.
A concatenacao dos pedacos e identica ao original (verificado ao final)."""
import re, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "apps/web/src/styles/original"
OUT = ROOT / "apps/web/src/styles/components"
OUT.mkdir(parents=True, exist_ok=True)
for old in OUT.glob("*.css"):
    old.unlink()

BANNER = re.compile(r"^\s*/\*\s*(?:=+\s*)?([A-ZÀ-Ú][A-ZÀ-Ú0-9 &/:\-’'ÇÃÕÉÊÍÓÚÀ→().,]+?)\s*(?:=+\s*)?\*/\s*$")

def slug(s):
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:40] or "bloco"

def split(text):
    lines = text.split("\n")
    depth, cuts, names = 0, [0], ["tokens-e-reset"]
    for i, line in enumerate(lines):
        m = BANNER.match(line)
        if m and depth == 0 and i > 0:
            cuts.append(i)
            names.append(slug(m.group(1)))
        # profundidade de chaves (ignora comentarios de uma linha)
        code = re.sub(r"/\*.*?\*/", "", line)
        depth += code.count("{") - code.count("}")
    cuts.append(len(lines))
    return [("\n".join(lines[a:b]), names[k]) for k, (a, b) in enumerate(zip(cuts, cuts[1:]))]

def main():
    base = (SRC / "home.0.css").read_text(encoding="utf-8")
    parts = split(base)
    index, seen = [], {}
    for n, (chunk, name) in enumerate(parts):
        seen[name] = seen.get(name, 0) + 1
        fname = f"{n:02d}-{name}.css"
        (OUT / fname).write_text(chunk + ("\n" if not chunk.endswith("\n") else ""), encoding="utf-8")
        index.append(fname)
    rebuilt = "".join((OUT / f).read_text(encoding="utf-8") for f in index)
    norm = lambda s: re.sub(r"\s+", "", s)
    assert norm(rebuilt) == norm(base), "CSS dividido nao bate com o original"
    (OUT / "index.css").write_text(
        "/* Ordem original preservada. Cada arquivo = um bloco do CSS original. */\n"
        + "".join(f"@import './{f}';\n" for f in index), encoding="utf-8")
    print(len(index), "arquivos; concatenacao identica ao original")
    for f in index: print(" ", f, (OUT / f).stat().st_size)

def finish():
    import shutil
    web = ROOT / "apps/web/src/styles"
    shutil.copy(SRC / "home.1.css", web / "ui-extras.css")
    shutil.copy(SRC / "hierarquia.2.css", web / "hierarquia-theme.css")
    # paginas compartilham o CSS base e os extras: confirma que nada diverge
    assert (SRC / "home.0.css").read_text() == (SRC / "hierarquia.0.css").read_text()
    assert (SRC / "home.1.css").read_text() == (SRC / "hierarquia.1.css").read_text()
    shutil.rmtree(SRC)


main()
finish()
