#!/usr/bin/env python3
"""As fotografias das peças para a web: dos PNG do estúdio 3D (.cache/renders) para WebP em media/produtos.

Cada render (1600×2000, com transparência) sai em 3 larguras: 480 (cartões no telemóvel), 800 (cartões e
miniaturas), 1200 (a ficha). Só refaz o que mudou (compara as datas).

Uso: python3 scripts/imagens.py [--tudo]
"""
import sys
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parents[1]
ORIGEM = RAIZ / '.cache/renders'
DESTINO = RAIZ / 'media/produtos'
LARGURAS = (480, 800, 1200)


def main():
    tudo = '--tudo' in sys.argv
    feitos = 0
    for png in sorted(ORIGEM.glob('*/*.png')):
        cena = png.parent.name.startswith('_')
        pasta = (RAIZ / 'media' / png.parent.name[1:]) if cena else (DESTINO / png.parent.name)
        pasta.mkdir(parents=True, exist_ok=True)
        larguras = ((800, 1600, 2400) if '-largo' in png.stem else (600, 1000, 1600)) if cena else LARGURAS
        im = None
        for w in larguras:
            alvo = pasta / f'{png.stem}-{w}.webp'
            if not tudo and alvo.exists() and alvo.stat().st_mtime >= png.stat().st_mtime:
                continue
            if im is None:
                im = Image.open(png).convert('RGBA')
            h = round(im.height * w / im.width)
            im.resize((w, h), Image.LANCZOS).save(alvo, 'WEBP', quality=84, method=6, alpha_quality=90)
            feitos += 1
    print(f'{feitos} imagens WebP')


if __name__ == '__main__':
    main()
