#!/usr/bin/env python3
"""
Gera ícones PNG para a extensão Chrome — Viggo AI Support
"""
import sys
import os

def gerar_icones(dest_dir):
    os.makedirs(dest_dir, exist_ok=True)
    
    try:
        from PIL import Image, ImageDraw
        
        for size in [16, 48, 128]:
            img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
            draw = ImageDraw.Draw(img)
            
            # Fundo arredondado roxo
            margin = max(1, size // 10)
            radius = size // 5
            draw.rounded_rectangle(
                [margin, margin, size - margin, size - margin],
                radius=radius,
                fill=(99, 102, 241, 255)
            )
            
            # Letra "V" branca centralizada
            try:
                from PIL import ImageFont
                font_size = int(size * 0.55)
                try:
                    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
                except:
                    try:
                        font = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", font_size)
                    except:
                        font = ImageFont.load_default()
            except:
                font = None
            
            letter = "V"
            if font:
                bbox = draw.textbbox((0, 0), letter, font=font)
                tw = bbox[2] - bbox[0]
                th = bbox[3] - bbox[1]
                x = (size - tw) // 2 - bbox[0]
                y = (size - th) // 2 - bbox[1]
                draw.text((x, y), letter, fill=(255, 255, 255, 255), font=font)
            
            path = os.path.join(dest_dir, f"icon{size}.png")
            img.save(path, "PNG")
            print(f"    icon{size}.png ({'Pillow'})")
        
    except ImportError:
        # Sem Pillow: cria ícones SVG mínimos e usa fallback
        print("    Pillow não disponível. Tentando com cairosvg...")
        try:
            import cairosvg
            for size in [16, 48, 128]:
                svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">
  <rect x="2" y="2" width="{size-4}" height="{size-4}" rx="{size//5}" fill="#6366f1"/>
  <text x="{size//2}" y="{size*0.72:.0f}" text-anchor="middle" font-size="{size*0.55:.0f}" font-weight="bold" fill="white" font-family="sans-serif">V</text>
</svg>'''
                cairosvg.svg2png(bytestring=svg.encode(), write_to=os.path.join(dest_dir, f"icon{size}.png"), output_width=size, output_height=size)
                print(f"    icon{size}.png (cairosvg)")
        except ImportError:
            # Último recurso: SVG como placeholder
            for size in [16, 48, 128]:
                svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">
  <rect x="2" y="2" width="{size-4}" height="{size-4}" rx="{size//5}" fill="#6366f1"/>
  <text x="{size//2}" y="{size*0.72:.0f}" text-anchor="middle" font-size="{size*0.55:.0f}" font-weight="bold" fill="white" font-family="sans-serif">V</text>
</svg>'''
                # Salva SVG com nome PNG (Chrome aceita SVG em alguns casos)
                with open(os.path.join(dest_dir, f"icon{size}.png"), "w") as f:
                    f.write(svg)
                print(f"    icon{size}.png (SVG fallback)")

if __name__ == "__main__":
    dest = sys.argv[1] if len(sys.argv) > 1 else "dist/icons"
    gerar_icones(dest)
