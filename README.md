# Liberô

Liberô é um sistema de classificados local para doação/retirada de itens com suporte a cadastro de usuários, publicação de anúncios, propostas, conversas por chat em tempo real e notificações.

## Tecnologias

- JavaScript puro (front-end)
- HTML / CSS
- Node.js + Express
- Socket.io
- LocalStorage para dados de usuários/anúncios/propostas/notificações
- Arquivo JSON para persistência de chat (`data/chats.json`)

## Funcionalidades

- Cadastro de usuário com perfil comum ou ONG
- Login e sessão via `sessionStorage`
- Criação, edição e exclusão de anúncios
- Anúncios restritos para ONGs
- Envio de propostas de interesse em anúncios
- Aceitar ou recusar propostas pelo anunciante
- Filtragem, pesquisa e ordenação de anúncios
- Área de perfil com lista de anúncios e acesso a propostas
- Chat em tempo real entre anunciante e proponente
- Notificações em tempo real via Socket.io
- Detalhes completos de anúncio com imagens e horário de retirada

## Estrutura do projeto

- `index.html` - página inicial
- `pages/cadastro.html` - página de cadastro/login
- `pages/chat.html` - página de chat entre usuários
- `pages/detalhes-anuncio.html` - detalhes do anúncio e propostas
- `pages/perfil.html` - perfil do usuário e seus anúncios
- `css/` - estilos da aplicação
- `js/` - scripts da aplicação
  - `app.js` - lógica principal de UI e rotas de página
  - `auth.js` - autenticação, sessão e proteção de rota
  - `database.js` - abstração de banco de dados em LocalStorage
  - `anuncios.js` - criação e renderização de anúncios
  - `realtime.js` - integração Socket.io para notificações e chat
  - `chat.js` - envio e recebimento de mensagens de chat
  - `utils.js` - utilitários e helpers genéricos
- `data/db.json` - modelo de referência para a estrutura de dados
- `data/chats.json` - histórico de chat persistido pelo servidor
- `server.js` - servidor Express + Socket.io
- `package.json` - dependências e scripts do projeto

## Instalação

1. Clone o repositório ou copie os arquivos para sua máquina.
2. Abra o terminal na pasta do projeto.
3. Instale as dependências:

```bash
npm install
```

## Execução

### Modo normal

```bash
npm start
```

### Modo desenvolvimento (recarregamento automático do servidor)

```bash
npm run dev
```

A aplicação será servida em `http://localhost:3000`.

## API e sockets disponíveis

### Endpoints REST

- `GET /api/chats/:conversaId`
  - Retorna o histórico de mensagens da conversa.
- `POST /api/chats`
  - Envia uma mensagem de chat e emite a atualização para todos os clientes conectados.

### Eventos Socket.io

- `join:usuario` - o cliente entra na sala do usuário para receber notificações.
- `join:chat` - o cliente entra na sala de chat.
- `leave:chat` - o cliente sai da sala de chat.
- `notificacao:emitir` - servidor retransmite notificações para um destinatário.
- `proposta:status` - retransmite atualizações de status de proposta.
- `anuncio:deletado` - notifica destinatários quando um anúncio é removido.
- `negociacao:confirmar` - retransmite atualizações de negociação para comprador e vendedor.

## Observações

- O banco de dados principal de anúncios, usuários, propostas e notificações é mantido no navegador via `localStorage` com a chave `libero_db`.
- O arquivo `data/db.json` serve apenas como referência da estrutura dos dados.
- O histórico de chat é persistido no servidor em `data/chats.json`.
- O socket em tempo real só funciona quando o servidor Node está ativo.

## Uso básico

1. Acesse `http://localhost:3000`.
2. Cadastre um usuário ou faça login.
3. Crie um anúncio em seu perfil.
4. Acesse o anúncio e envie uma proposta.
5. Volte ao perfil do anunciante para aceitar ou recusar propostas.
6. Use o chat para continuar a conversa após aceitação.

## Contribuição

Você pode estender este projeto adicionando recursos como:

- validação de imagens nos uploads
- persistência de dados server-side completa
- autenticação real com JWT
- paginação de anúncios
- filtros avançados e categorias dinâmicas

## Licença

Projeto sem licença específica definida. Use conforme necessário para desenvolvimento e aprendizado.
