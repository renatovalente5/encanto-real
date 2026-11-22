#!/usr/bin/env python3
"""As imagens de partilha (og:image) das peças, das categorias e dos artigos: JPEG 1200×630 com a fotografia da peça
no fundo da página, como o WhatsApp e o Facebook as mostram (o WebP 4:5 da ficha saía cortado, ou nem saía).

A lista sai de src/lib/seo.mjs (scripts/lista-partilhas.mjs): a mesma escolha que faz a capa de cada página.
A fotografia vem do render do estúdio (.cache/renders, 1600×2000) ou, sem ele, do WebP 1200 da ficha.
Só refaz o que mudou (compara as datas). JPEG com subsampling=0 (4:4:4), para as cores e as arestas ficarem limpas.

Uso: python3 scripts/partilha.py [--tudo]
"""
import json
import subprocess
import sys
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parents[1]
W, H = 1200, 630
CAIXA = (1000, 520)  # onde cabe a peça (sem as sombras)
FUNDOS = {  # os --azulejo-* do site.css
    'rosa': '#F2DCD8', 'salvia': '#DDE3D2', 'lilas': '#E5DEEC', 'azul': '#DAE6EE',
    'champanhe': '#F3E7CC', 'areia': '#ECE5D4', 'verde': '#54603C',
}


def origem(produto, cor):
    png = RAIZ / '.cache/renders' / produto / f'principal-{cor}.png'
    if png.exists():
        return png
    return RAIZ / 'media/produtos' / produto / f'principal-{cor}-1200.webp'


def esbater_bordas(im, fracao=0.06):
    """As sombras do render chegam às bordas da moldura: esbatê-las, para não haver um corte a direito no cartão."""
    w, h = im.size
    a = im.getchannel('A')
    mascara = Image.new('L', (w, h), 255)
    bx, by = max(1, int(w * fracao)), max(1, int(h * fracao))
    px = mascara.load()
    for x in range(w):
        fx = min(1.0, x / bx, (w - 1 - x) / bx)
        for y in range(h):
            fy = min(1.0, y / by, (h - 1 - y) / by)
            f = max(0.0, min(fx, fy))
            if f < 1:
                px[x, y] = int(255 * f)
    from PIL import ImageChops
    im.putalpha(ImageChops.multiply(a, mascara))
    return im


def cartao(src, fundo, alvo):
    im = Image.open(src).convert('RGBA')
    caixa = im.getchannel('A').point(lambda v: 255 if v > 150 else 0).getbbox()
    ow, oh = caixa[2] - caixa[0], caixa[3] - caixa[1]
    s = min(CAIXA[0] / ow, CAIXA[1] / oh)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    im = esbater_bordas(im)
    cx, cy = (caixa[0] + caixa[2]) / 2 * s, (caixa[1] + caixa[3]) / 2 * s
    tela = Image.new('RGBA', (W, H), FUNDOS.get(fundo, FUNDOS['areia']))
    tela.alpha_composite(im, (round(W / 2 - cx), round(H / 2 - cy)))
    alvo.parent.mkdir(parents=True, exist_ok=True)
    tela.convert('RGB').save(alvo, 'JPEG', quality=86, subsampling=0, optimize=True, progressive=True)


def cena(nome, alvo):
    src = max((RAIZ / 'media/cenas').glob(f'{nome}-largo-*.webp'), key=lambda f: int(f.stem.rsplit('-', 1)[1]))
    im = Image.open(src).convert('RGB')
    s = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x, y = (im.width - W) // 2, (im.height - H) // 2
    alvo.parent.mkdir(parents=True, exist_ok=True)
    im.crop((x, y, x + W, y + H)).save(alvo, 'JPEG', quality=86, subsampling=0, optimize=True, progressive=True)
    return src


def main():
    tudo = '--tudo' in sys.argv
    lista = json.loads(subprocess.run(['node', str(RAIZ / 'scripts/lista-partilhas.mjs')], check=True, capture_output=True, text=True).stdout)
    feitos = 0
    for x in lista:
        alvo = RAIZ / x['ficheiro'].lstrip('/')
        if x.get('cena'):
            if tudo or not alvo.exists():
                cena(x['cena'], alvo)
                feitos += 1
            continue
        src = origem(x['produto'], x['cor'])
        if not src.exists():
            print(f'falta a fotografia {src.relative_to(RAIZ)}', file=sys.stderr)
            continue
        alvo = RAIZ / x['ficheiro'].lstrip('/')
        if not tudo and alvo.exists() and alvo.stat().st_mtime >= src.stat().st_mtime:
            continue
        cartao(src, x.get('fundo'), alvo)
        feitos += 1
    print(f'{feitos} imagens de partilha (de {len(lista)})')


if __name__ == '__main__':
    main()
