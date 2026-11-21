# Encanto Real — loja online (pré-visualização)

Aluguer e venda de peças de festa em MDF (arcos, painéis, cilindros, mesas, figuras), de Esposende.
No ar em https://encantoreal.pt, ainda como pré-visualização (noindex; propostas da capa em `/propostas/a|b|c/`).
O endereço antigo, renatovalente5.github.io/encanto-real/, reencaminha para o domínio.

## Como se trabalha

```sh
npm ci                                   # three.js e opentype.js
node scripts/renders.mjs                 # fotografias das peças a partir dos modelos 3D (.cache/renders)
node scripts/renders-cenas.mjs           # cenas da capa (palco com balões)
python3 scripts/imagens.py               # WebP em media/produtos e media/cenas
node src/build.mjs                       # _site/ (o mesmo para local e para o ar)
```

- **Conteúdo:** `content/` (uma peça por ficheiro em `content/produtos/`, categorias, ocasiões, cupões, entregas,
  artigos da Inspiração). É isto que o backoffice vai editar.
- **Regras** (preços, caução, dia de semana −15 %, sinal de 50 %, zonas pelo código postal, cupões):
  `src/scripts/regras.js`, a mesma cópia no gerador, no browser e (mais tarde) no Worker.
- **3D:** `src/3d/pecas.js` (os modelos), `cena.js` (estúdio), `visor.js` (site), `estudio.js` (fotografias).
- **Legal:** `legal-comum/` (cópia da biblioteca comum, v1.1.2).

## Falta para abrir a loja a sério
Cloudflare (Worker com contas, encomendas e cupões no D1), pagamentos (ifthenpay/Stripe),
backoffice, dados da empresa (nome, NIF, morada, email, WhatsApp) e fotografias verdadeiras das peças.
