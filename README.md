# Conecta.Net

A empresa parceira **Conecta.Net** precisa centralizar a consulta de planos de internet e as solicitações de contratação. A API permite que clientes consultem planos ativos, solicitem a contratação e acompanhem seus pedidos. Administradores gerenciam planos e analisam solicitações.

## Integrantes e responsabilidades

| Nome completo | CRUD proposto para a A2 |
| --- | --- |
| Claudiomar José Martins de Oliveira | Planos |
| Raquel Vieira de Souza | Solicitações |

Os nomes e o projeto vêm da apresentação acadêmica revisada da equipe. Confirmem a divisão dos CRUDs antes da entrega. O cadastro de Usuário é parte da autenticação e fica fora da contagem. Plano e Solicitação constam no planejamento (US01, US04 a US07).

## Tecnologias

Node.js 22.12+ (recomendação para o ambiente da equipe: Node.js 24), Express 5, Prisma ORM 6.19, SQLite, bcryptjs e JWT. Execute `node --version` e registre aqui a versão efetivamente usada pela equipe na conferência final.

O modelo conecta cada Solicitação a um Usuário e a um Plano. O preço é armazenado em centavos (9990 representa R$ 99,90). Os status adotados são PENDENTE, APROVADA, RECUSADA e CANCELADA.

## Instalação e execução no PowerShell

Abra a raiz da API no VS Code e rode os comandos um por vez.

```powershell
node --version
npm.cmd install
Copy-Item .env.example .env
```

No arquivo `.env`, mantenha `DATABASE_URL` e `PORT` do exemplo e preencha:

- `JWT_SECRET` com um valor aleatório de pelo menos 32 caracteres. Gere um no terminal com `node -p "require('node:crypto').randomBytes(32).toString('hex')"`.
- `ADMIN_EMAIL` com o e-mail de teste, ou mantenha `admin@conecta.example`.
- `ADMIN_SENHA` com uma senha local de teste com pelo menos oito caracteres. Use letras e números para facilitar a entrada no Postman. Configure a mesma senha na variável `adminSenha` da coleção.
- `MODO_TESTE=true` para o tutor localizar o token de recuperação na resposta JSON. Use apenas no ambiente local de avaliação. O modo é desativado quando `NODE_ENV=production`. Esta versão usa a resposta local como meio de demonstração e não envia e-mail.

Depois execute:

```powershell
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

O seed cria o administrador uma vez e preserva a senha se ele já existir. A API escuta em `http://127.0.0.1:3000` por padrão. O arquivo `.env`, o banco local e `node_modules` ficam fora do Git. Inclua no repositório o manifesto, o lockfile gerado após a instalação, a pasta de migrations e o exemplo de configuração.

## Rotas

Nas rotas protegidas envie `Authorization: Bearer <token>`. Nas requisições com corpo, envie JSON. O cliente pode consultar planos ativos e suas próprias solicitações. O administrador pode alterar qualquer plano, consultar todas as solicitações e atualizar seu status. O cliente pode editar o plano selecionado ou excluir uma solicitação própria enquanto estiver pendente.

| Método e caminho | JWT | Ação e exemplo de corpo |
| --- | --- | --- |
| GET /health | Não | Verificar se a API responde |
| POST /auth/register | Não | Cadastrar cliente. `{"nome":"Cliente Demo","email":"cliente@conecta.example","senha":"ClienteDemo123"}` |
| POST /auth/login | Não | Entrar. `{"email":"cliente@conecta.example","senha":"ClienteDemo123"}` |
| POST /auth/forgot-password | Não | Solicitar recuperação. `{"email":"cliente@conecta.example"}` |
| POST /auth/reset-password | Não | Redefinir com token de recuperação. `{"token":"<token recebido>","novaSenha":"SenhaNova123"}` |
| POST /api/planos | Admin | Criar. `{"nome":"Fibra 400 Mega","velocidadeMbps":400,"precoCentavos":9990}` |
| GET /api/planos | Sim | Listar |
| GET /api/planos/:id | Sim | Buscar por ID |
| PATCH /api/planos/:id | Admin | Atualizar. `{"precoCentavos":10990}` |
| DELETE /api/planos/:id | Admin | Excluir plano sem solicitações vinculadas |
| POST /api/solicitacoes | Sim | Solicitar plano. `{"planoId":1}`. Use o ID devolvido pelo cadastro de Plano |
| GET /api/solicitacoes | Sim | Listar solicitações acessíveis |
| GET /api/solicitacoes/:id | Sim | Buscar por ID |
| PATCH /api/solicitacoes/:id | Sim | Admin `{"status":"APROVADA"}` ou cliente titular `{"planoId":2}` enquanto pendente |
| DELETE /api/solicitacoes/:id | Sim | Excluir como admin ou cliente titular enquanto pendente |

Respostas esperadas incluem 200 (consulta ou alteração), 201 (criação), 202 (recuperação solicitada), 204 (sucesso sem corpo), 400 (dados inválidos), 401 (autenticação inválida), 403 (sem permissão administrativa), 404 (recurso inexistente ou fora do escopo do usuário), 409 (conflito) e 500 (falha interna).

## Roteiro do tutor

1. Suba a API seguindo a seção de instalação. Importe [a coleção Postman](docs/ConectaNet.postman_collection.json), configure `baseUrl`, `adminEmail` e `adminSenha` e confira `MODO_TESTE=true` no servidor local.
2. Rode **Cadastro e login**. O cadastro gera um e-mail de cliente novo. Os testes da coleção salvam os JWTs e confirmam que a rota protegida responde 401 sem token.
3. Rode **Planos** e depois **Solicitações**. Os IDs são preenchidos com as respostas da API. O DELETE de Plano fica no final de Solicitações para respeitar o relacionamento no banco.
4. Rode **Recuperação de senha**. A resposta de solicitação fornece `tokenRecuperacao` em modo local de teste. A coleção captura esse valor, usa-o uma vez, confirma o bloqueio da segunda tentativa e testa o login com a nova senha.
5. Para a suíte automatizada, execute `npm.cmd test` após gerar o Prisma Client. A suíte cria um SQLite descartável e verifica os CRUDs, permissões e expiração do token.

Antes de enviar, uma pessoa da equipe deve clonar o repositório em outra pasta, seguir este roteiro e testar a coleção. O enunciado pede que um integrante envie o link público do GitHub no AVA até **30/11/2026, às 23h59**, e que o repositório fique público até a divulgação da nota.

