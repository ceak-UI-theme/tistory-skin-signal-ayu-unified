#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

VERSION="$(sed -n 's:.*<version>\(.*\)</version>.*:\1:p' index.xml | head -n1)"
if [[ -z "${VERSION}" ]]; then
  echo "Error: Could not read <version> from index.xml" >&2
  exit 1
fi

OUTPUT_DIR="releases"
BASE_NAME="Signal-Ayu-Unified-v${VERSION}"
OUTPUT_PATH="${OUTPUT_DIR}/${BASE_NAME}.zip"

if [[ -e "${OUTPUT_PATH}" ]]; then
  STAMP="$(date +%Y%m%d-%H%M%S)"
  OUTPUT_PATH="${OUTPUT_DIR}/${BASE_NAME}-local-${STAMP}.zip"
fi

FILES=(
  "README.md"
  "CHANGELOG.md"
  "index.xml"
  "style.css"
  "skin.html"
  "LICENSE"
  "preview.jpg"
  "preview1600.jpg"
  "preview256.jpg"
  "preview560.jpg"
  "preview_big.jpg"
  "images"
)

for f in "${FILES[@]}"; do
  if [[ ! -e "${f}" ]]; then
    echo "Error: Missing required file or directory: ${f}" >&2
    exit 1
  fi
done

mkdir -p "${OUTPUT_DIR}"

if command -v zip >/dev/null 2>&1; then
  zip -r -q "${OUTPUT_PATH}" "${FILES[@]}"
elif command -v 7z >/dev/null 2>&1; then
  7z a -tzip -mx=9 -bd -y "${OUTPUT_PATH}" "${FILES[@]}" >/dev/null
elif command -v python3 >/dev/null 2>&1; then
  python3 - "${OUTPUT_PATH}" "${FILES[@]}" <<'PY'
import os
import sys
import zipfile

out = sys.argv[1]
entries = sys.argv[2:]

with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED) as zf:
    for entry in entries:
        if os.path.isdir(entry):
            for root, _, files in os.walk(entry):
                for name in files:
                    p = os.path.join(root, name)
                    zf.write(p, p)
        else:
            zf.write(entry, entry)
PY
else
  echo "Error: no archiver found. Install one of: zip, 7z, python3." >&2
  exit 1
fi

echo "Built: ${OUTPUT_PATH}"
