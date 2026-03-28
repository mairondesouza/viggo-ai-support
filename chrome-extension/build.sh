#!/bin/bash
# ============================================================
# Build da extensão Chrome — Viggo AI Support
# ============================================================
# Uso: bash build.sh
# Saída: dist/ (pasta para carregar no Chrome em modo developer)
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST="$SCRIPT_DIR/dist"
SRC="$SCRIPT_DIR/src"
PUBLIC="$SCRIPT_DIR/public"

echo "🔨 Construindo Viggo AI Support..."

# Limpa e recria a pasta dist
rm -rf "$DIST"
mkdir -p "$DIST/icons"

# Copia o manifest
cp "$PUBLIC/manifest.json" "$DIST/"
echo "  ✓ manifest.json"

# Copia o background
cp "$SRC/background/background.js" "$DIST/"
echo "  ✓ background.js"

# Copia o content script
cp "$SRC/content.js" "$DIST/"
echo "  ✓ content.js"

# Copia o CSS
cp "$SRC/sidebar.css" "$DIST/"
echo "  ✓ sidebar.css"

# Copia o popup
cp "$SRC/popup/popup.html" "$DIST/"
cp "$SRC/popup/popup.js" "$DIST/"
echo "  ✓ popup"

# Copia as opções
cp "$SRC/popup/options.html" "$DIST/"
cp "$SRC/popup/options.js" "$DIST/"
echo "  ✓ options"

# Gera ícones PNG
echo "  🎨 Gerando ícones..."
python3 "$SCRIPT_DIR/generate_icons.py" "$DIST/icons"
echo "  ✓ ícones"

echo ""
echo "✅ Build concluído! Pasta: $DIST"
echo ""
echo "Como carregar no Chrome:"
echo "  1. Abra chrome://extensions/"
echo "  2. Ative 'Modo do desenvolvedor' (canto superior direito)"
echo "  3. Clique em 'Carregar sem compactação'"
echo "  4. Selecione a pasta: $DIST"
