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
python3 scripts/partilha.py              # imagens de partilha (JPEG 1200×630) em media/partilha
node src/build.mjs                       # _site/ (o mesmo para local e para o ar)
node scripts/testar.mjs                  # provas do SEO e das partilhas no _site (também no CI)
```

- **Conteúdo:** `content/` (uma peça por ficheiro em `content/produtos/`, categorias, ocasiões, cupões, entregas,
  artigos da Inspiração). É isto que o backoffice vai editar.
- **Regras** (preços, caução, dia de semana −15 %, sinal de 50 %, zonas pelo código postal, cupões):
  `src/scripts/regras.js`, a mesma cópia no gerador, no browser e (mais tarde) no Worker.
- **3D:** `src/3d/pecas.js` (os modelos), `cena.js` (estúdio), `visor.js` (site), `estudio.js` (fotografias).
- **Legal:** `legal-comum/` (cópia da biblioteca comum, v1.1.3).

## SEO

Tudo em `src/lib/seo.mjs`: os títulos das categorias e das peças, as descrições, os dados estruturados (WebSite e
OnlineStore no início, Product com o preço da compra e migalhas nas fichas, Article na Inspiração), as imagens de
partilha e as datas do mapa do site (do git; o CI clona com `fetch-depth: 0`).
- **Fora do Google** (noindex e fora do mapa): os termos, a privacidade, os litígios, as entregas (a política de
  envios), o carrinho, a conta, o finalizar, o obrigado, os favoritos, o 404 e as três propostas da capa.
- **Na pré-visualização** todas as páginas têm noindex; o robots.txt fica aberto (é o noindex que fecha).
- **A guarda para abrir:** com `"preVisualizacao": false`, o build pára sem o nome da empresa, o NIF, a morada, o
  código postal, o email e o telefone (ou WhatsApp), ou se sobrar um «[por confirmar]» ou uma nota da pré-visualização.
- **No dia em que a loja abrir:** no Search Console (propriedade de domínio encantoreal.pt, conta
  renato.lima.valente@gmail.com, validada por TXT na Hostinger) enviar o `sitemap.xml` e pedir a indexação do início,
  da loja e das categorias; depois `node scripts/indexnow.mjs` (o Bing e companhia).

## Falta para abrir a loja a sério
Cloudflare (Worker com contas, encomendas e cupões no D1), pagamentos (ifthenpay/Stripe),
backoffice, dados da empresa (nome, NIF, morada, email, WhatsApp) e fotografias verdadeiras das peças.
