#!/usr/bin/env python3
"""As fotografias verdadeiras das peças (as que se juntam no painel) em versões para a web.

Lê:
  media/fotos/<nome>.jpg   os originais (o painel reduz a 2048 px e tira o EXIF/GPS antes de os gravar)
  content/fotos.json       a descrição e o ponto de foco de cada uma

Escreve em .cache/fotos/ (fica entre publicações; cada ficheiro leva no nome um resumo do original, por isso só se
refaz o que mudou) e um manifesto, .cache/fotos/manifesto.json, que o src/build.mjs lê para escrever as imagens e
copia para _site/assets/fotos/:
  <nome>-<resumo>-<largura>.webp   480, 800 e 1200 (os cartões, a galeria da ficha)
  <nome>-<resumo>-partilha.jpg     1200×630, cortada à volta do ponto de foco (o WhatsApp e o Facebook)
  miniatura-<nome>.webp            320 (o painel)
  grande-<nome>.webp               1200 (o painel)

    python3 scripts/fotos.py              # faz o que falta
    python3 scripts/fotos.py --verificar  # só confere que content/fotos.json e media/fotos batem certo
"""
import hashlib
import json
import os
import shutil
import sys

from PIL import Image, ImageOps

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
FOTOS = os.path.join(RAIZ, 'media', 'fotos')
INDICE = os.path.join(RAIZ, 'content', 'fotos.json')
CACHE = os.path.join(RAIZ, '.cache', 'fotos')
LARGURAS = (480, 800, 1200)
PARTILHA = (1200, 630)
VERSAO = f'v1-er-{LARGURAS}-{PARTILHA}-82'


def resumo(caminho):
    h = hashlib.sha256(VERSAO.encode())
    with open(caminho, 'rb') as f:
        h.update(f.read())
    return h.hexdigest()[:10]


def foco_de(info):
    try:
        x, y = (int(v.rstrip('%')) for v in str(info.get('foco') or '50% 50%').split())
        return min(max(x, 0), 100) / 100, min(max(y, 0), 100) / 100
    except ValueError:
        return 0.5, 0.5


def cortar(im, w, h, foco):
    """Cobre w×h com a imagem, cortando à volta do ponto de foco."""
    s = max(w / im.width, h / im.height)
    r = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x = min(max(round(r.width * foco[0] - w / 2), 0), r.width - w)
    y = min(max(round(r.height * foco[1] - h / 2), 0), r.height - h)
    return r.crop((x, y, x + w, y + h))


def guardar(im, destino, formato, **kw):
    if os.path.exists(destino):
        return False
    tmp = destino + '.tmp'
    im.save(tmp, formato, **kw)
    os.replace(tmp, destino)
    return True


def main():
    indice = json.load(open(INDICE, encoding='utf-8')) if os.path.exists(INDICE) else {}
    nomes = sorted(f[:-4] for f in os.listdir(FOTOS) if f.endswith('.jpg')) if os.path.isdir(FOTOS) else []
    sem_descricao = [n for n in nomes if n not in indice]
    if '--verificar' in sys.argv:
        for n in sem_descricao:
            print(f'aviso: media/fotos/{n}.jpg sem descrição em content/fotos.json')
        print(f'{len(nomes)} fotografias')
        return
    os.makedirs(CACHE, exist_ok=True)
    manifesto, feitos, usados = {}, 0, set()
    for nome in nomes:
        original = os.path.join(FOTOS, nome + '.jpg')
        r = resumo(original)
        info = indice.get(nome) or {}
        im = None
        ficheiros = {}
        for w in LARGURAS:
            alvo = f'{nome}-{r}-{w}.webp'
            ficheiros[str(w)] = alvo
            usados.add(alvo)
            if os.path.exists(os.path.join(CACHE, alvo)):
                continue
            im = im or ImageOps.exif_transpose(Image.open(original)).convert('RGB')
            larg = min(w, im.width)
            feitos += guardar(im.resize((larg, round(im.height * larg / im.width)), Image.LANCZOS), os.path.join(CACHE, alvo), 'WEBP', quality=82, method=6)
        alvo = f'{nome}-{r}-partilha.jpg'
        ficheiros['partilha'] = alvo
        usados.add(alvo)
        if not os.path.exists(os.path.join(CACHE, alvo)):
            im = im or ImageOps.exif_transpose(Image.open(original)).convert('RGB')
            feitos += guardar(cortar(im, *PARTILHA, foco_de(info)), os.path.join(CACHE, alvo), 'JPEG', quality=84, subsampling=0, optimize=True, progressive=True)
        # as duas do painel, com o nome fixo (o painel não sabe o resumo)
        for prefixo, w in (('miniatura', 320), ('grande', 1200)):
            alvo = f'{prefixo}-{nome}.webp'
            usados.add(alvo)
            fonte = os.path.join(CACHE, f'{prefixo}-{nome}.{r}')
            if not os.path.exists(fonte):
                im = im or ImageOps.exif_transpose(Image.open(original)).convert('RGB')
                larg = min(w, im.width)
                im.resize((larg, round(im.height * larg / im.width)), Image.LANCZOS).save(fonte, 'WEBP', quality=80, method=6)
                feitos += 1
            usados.add(os.path.basename(fonte))
            shutil.copyfile(fonte, os.path.join(CACHE, alvo))
        with Image.open(original) as o:
            largura, altura = ImageOps.exif_transpose(o).size
        manifesto[nome] = {'largura': largura, 'altura': altura, 'ficheiros': ficheiros}
    # o que já não se usa sai da cache
    for f in os.listdir(CACHE):
        if f != 'manifesto.json' and f not in usados:
            os.remove(os.path.join(CACHE, f))
    with open(os.path.join(CACHE, 'manifesto.json'), 'w', encoding='utf-8') as f:
        json.dump(manifesto, f, ensure_ascii=False, indent=1, sort_keys=True)
    for n in sem_descricao:
        print(f'aviso: media/fotos/{n}.jpg sem descrição em content/fotos.json')
    print(f'{len(nomes)} fotografias, {feitos} ficheiros novos')


if __name__ == '__main__':
    main()
