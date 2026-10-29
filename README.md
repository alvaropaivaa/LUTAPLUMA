# Easy Wrestling — sistema da academia

Painel do professor (computador) + app do aluno (celular, instalável na tela inicial).
**Sem banco de dados:** tudo roda com dados de exemplo salvos no navegador (localStorage).

## Rodar

```bash
npm install
npm run dev        # http://localhost:5274
npm run build      # gera a versão final em dist/
```

## Acessos de demonstração

| Perfil    | E-mail                          | Senha  |
|-----------|---------------------------------|--------|
| Professor | professor@easywrestling.com.br  | 123456 |
| Aluno     | lucas.martins@email.com         | 123456 |

Na tela de login também há botões de acesso rápido.

## Dicas

- **Relógio de demonstração** (Painel → App do aluno): o check-in só abre no horário da aula
  (30 min antes até o fim). Use os atalhos de horário para testar fora do horário real.
- **Menu do perfil** (rodapé da barra lateral): “Restaurar dados de exemplo” ou “Começar do zero”.
  Começando do zero, a primeira conta criada vira professor e as próximas viram alunos com plano mensal.
- Ações feitas na prévia do app (check-in etc.) aparecem no painel na hora.

## App do aluno (celular)

Abas: **Início · Aulas · Check-in · Histórico · Perfil**. Pelo Perfil o aluno abre:

- **Carteirinha** — com QR code da matrícula para a recepção.
- **Graduação** — faixa atual, progresso até o próximo grau (referência: 40 treinos e 4 meses,
  a mesma do painel em `selectors.ts`) e linha do tempo com as observações do professor.
- **Financeiro** — plano, vencimento, pagamentos e **Pagar com PIX** (QR + copia e cola).
  Ao tocar em "Já fiz o pagamento", o aviso aparece no **Financeiro do painel** em
  "PIX informados pelos alunos"; o professor confere no banco e **Confirma** (o plano é renovado).
  A chave PIX é fictícia: troque `ACADEMY_PIX` em `src/lib/pix.ts` pela chave real.
- Foto, telefone, nascimento, meta semanal, notificações, **Instalar na tela inicial** e sair.

O aluno adulto não vê as turmas Kids (e vice-versa).

## Estrutura

- `src/lib` — tipos, datas, faixas, dados de exemplo (`seed.ts`), regras (`selectors.ts`) e estado (`store.tsx`)
- `src/panel` — telas do painel do professor
- `src/student` — telas do app do aluno
- `src/site` — página inicial e login

## Notificações no celular (PWA)

- No app do aluno, o card **"Ative as notificações"** (Início), o **sininho** e o **Perfil** pedem a permissão e ligam/desligam as notificações.
  Com elas ativas aparece **"Enviar notificação de teste"**.
- O **sininho** abre a central de notificações. O que vira notificação do celular (cada uma só uma vez por aparelho; tocar abre a tela certa):
  - aviso publicado no **Mural** com **"Notificar no celular"** → Início
  - **check-in aberto** da aula do dia → Início
  - **mensalidade** vencendo em até 3 dias ou atrasada → Financeiro
  - **pagamento confirmado** pela academia (ex.: PIX confirmado no painel) → Financeiro
  - **nova graduação** registrada pelo professor → Graduação
- As regras ficam em `src/student/alerts.ts`.
- Sem servidor, a notificação chega aos apps abertos ou instalados **no mesmo navegador/aparelho** onde a ação foi feita (os dados ficam no navegador).
  Para chegar em celulares de outras pessoas é preciso um servidor de Web Push (ou serviço como Firebase/OneSignal); o `public/sw.js` já trata o evento `push` (`{ title, body, url }`).
- Celular só instala o app e aceita notificações em **HTTPS** (ou `localhost`). No iPhone, só depois de "Adicionar à Tela de Início" (iOS 16.4+).
