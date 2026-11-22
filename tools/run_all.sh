#!/usr/bin/env bash
# Regenera tudo a partir dos HTML originais em /backup: imagens .avif, JSON do seed, CSS por componente.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 tools/extract.py
python3 tools/split_css.py
python3 tools/verify.py
rm -rf apps/web/src/styles/original
