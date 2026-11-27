# ARCHBLUEPRINT (Nest + TypeScript + Prisma + SQLite + React + Tailwind + shadcn)

Reconstrucao do site original (`backup/`) com o conteudo no SQLite e o visual **idêntico**.

## Estrutura

```
apps/api   Nest + Prisma + SQLite
  prisma/schema.prisma      tabelas (episodios, personagens, entidades, ranks, camadas, auréolas, glossario, faq, mapa de relacoes, blocos...)
  prisma/seed.ts            grava os JSON de prisma/seed-data no SQLite (pode rodar varias vezes sem duplicar)
  storage/media/**.avif     imagens (antes base64): estrutura/, entidades/, personagens/
  src/<modulo>/             um modulo Nest por assunto (episodes, characters, entities, ranks, glossary, faq, layers, relmap, media, pages)
apps/web   React + Vite + Tailwind + shadcn
  src/styles/components/    CSS original dividido por componente, na MESMA ordem (31 arquivos)
  src/components/           um componente por tipo de conteudo (EpisodeItems, CharacterGrid, LayerGroupView...)
  src/legacy/               JavaScript original portado para TypeScript (menus, busca, leitor, cronologia, mapa)
tools/                      extract.py (HTML -> JSON + AVIF), split_css.py, verify.py, run_all.sh
backup/                     os dois HTML originais + backup.zip
```

## Hospedagem gratuita (Vercel, sem servidor)

O `vercel.json` ja esta pronto. Na Vercel: **Add New > Project**, escolha o repositorio, deixe a raiz do projeto como esta e clique em Deploy.
No build ela cria o SQLite a partir de `apps/api/prisma/seed-data`, exporta tudo para arquivos estaticos (`npm run build:static`) e publica.
O site fica 100% estatico (rapido e sem custo de servidor). Para mudar conteudo no modo gratuito, edite os dados e envie de novo.
A API/Railway so e necessaria se voce quiser editar o banco ao vivo.

## Modo protegido (beta)

Branch `beta`: o texto dos episódios, as fichas de personagem, as camadas/auréolas e as imagens (menos o fundo do hero) **não ficam mais legíveis no site publicado**.
- No build, `scripts/protect.js` cifra esse conteúdo (AES-256-GCM) em `public/c/<nome>.bin`. Os JSON públicos ficam só com títulos e listas.
- O navegador pede um token JWT (`/api/token`, vida de 10 min, preso ao navegador) e, com ele, a chave de cada arquivo (`/api/key`). Só atende pedidos feitos a partir do próprio domínio.
- O episódio só é baixado e decifrado quando é aberto; a ficha, quando é aberta; as camadas, logo depois da página montar.
- Obrigatório: variável de ambiente **`CHUNK_SECRET`** (40+ caracteres aleatórios) no projeto da Vercel, para build e funções. Sem ela o build falha de propósito.
- `npm run test:protect` roda o teste de ponta a ponta (cifra, API e leitura no navegador) e compara tudo com o original.

Limites: quem usa um navegador de verdade consegue ler o que a própria página mostra (print, copiar texto). O limite de pedidos por IP vale por instância; o firewall da Vercel faz o resto.
Continuam públicos: textos de blocos (introduções), glossário, ranks, cards de entidades e o fundo do hero.

## Rodar

```bash
npm install
npm run db:init      # prisma generate + migrate (cria o SQLite) + seed
npm run dev          # API :3000 e site :5173
```

O `perfil.png` (favicon e logo do menu) esta em `apps/web/public/` (256 px; o original fica em `assets-src/images/perfil.png`).

Producao com servidor (opcional, pago): `npm run build && npm start` (a API serve o site e as imagens na porta 3000), ou use o `Dockerfile`
com um volume em `/data` para o banco.

## Editar conteudo (sem mexer no codigo)

`npm run db:studio` abre o Prisma Studio. Exemplos:

- Auréolas: tabela `Layer`, grupos `hierarquia-layers-2` (N1 a N9) e `hierarquia-layers-3` (N10 a N12); o texto fica em `bodyHtml`.
- Episodios: tabela `Episode` (`bodyHtml` e o texto do episodio).
- Personagens: `Character` e `CharacterPart`. Entidades: `Entity`. Glossario: `GlossaryTerm`. Mapa de relacoes: `RelNode` e `RelEdge`.

Adicionou uma linha? Ela aparece no site sem build: o front le tudo de `GET /api/pages/:slug`.

## Como o visual foi preservado

- Cada pedaco repetido do HTML virou tabela; o HTML restante (texto corrido, decoracao, nav) ficou em `ContentBlock` com
  marcadores `<!--@episodios...-->` que os componentes React substituem pelos dados do banco.
- `tools/verify.py` reconstroi as duas paginas a partir dos JSON e compara com o HTML original: **0 diferenças** nas duas paginas.
- O CSS e o original, sem alterar regra nenhuma. Unica troca: o ruido de pergaminho (SVG em data-URI) virou
  `public/assets/textures/parchment-noise.svg`.
- Tailwind roda **sem preflight** (nao reseta nada) e usa as variaveis CSS do tema original. O tema azul da Hierarquia so carrega nessa pagina.
- shadcn esta configurado (`components.json`, `cn()`), mas nenhum componente dele e usado no visual atual para nao alterar a estetica.
  Para novas telas: `npx shadcn@latest add button`.

## Imagens

Os originais (PNG/JPG) ficam em `assets-src/images/<pasta>/<nome>.png`; o extrator converte para `.avif` em `apps/api/storage/media/`.
Para trocar uma imagem: substitua o arquivo de mesmo nome em `assets-src/images/` e rode `npm run extract` e depois `npm run db:seed`.

| Arquivo final | Conteudo |
|---|---|
| `estrutura/macroestrutura-vista-de-fora.avif` | Macroestrutura vista de fora (cubo e correntes) |
| `estrutura/corte-interno-da-estrutura.avif` | Oceano do Vazio, pilares e C01 a C21 |
| `estrutura/a-entidade-retrato.avif` | A Entidade, retrato |
| `entidades/a-entidade.avif` | A Entidade, corpo inteiro |
| `entidades/onyx.avif` | Onyx, corpo inteiro com a lâmina verde |
| `personagens/tengu-retrato.avif` | Tengu, retrato |
| `personagens/tengu-corpo-inteiro.avif` | Tengu, corpo inteiro |
| `personagens/tengu-lamina-de-nullis.avif` | Lâmina de Nullis |
| `personagens/onyx-retrato.avif` | Onyx, retrato encapuzado |
| `personagens/onyx-lamina-verde.avif` | Lâmina verde de Onyx |
| `fundos/planeta-disco.avif` | Fundo do hero (mundo disco); o CSS aponta para ele |

## Regenerar a partir dos HTML originais

`npm run extract` roda extrator, divisor de CSS e verificacao (precisa de Python 3 com `beautifulsoup4` e `Pillow`).

## Limites conhecidos

- Este projeto foi gerado sem acesso a internet: o extrator e a verificacao foram executados e passaram, mas `npm install`, o Prisma, o Nest e o build do front **ainda nao foram executados**. Se aparecer algum erro, e provavel que seja pequeno de tipagem/configuracao.
- Vercel nao e uma boa hospedagem para Nest + SQLite (o arquivo do banco nao persiste). Use Railway, Fly.io, Render ou um VPS (o `Dockerfile` ja serve).
