'use strict';

const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// ── Chat: persistência em arquivo JSON ────────────────────────────────────────

const CHATS_FILE = path.join(__dirname, 'data', 'chats.json');

function lerChats() {
    try {
        if (!fs.existsSync(CHATS_FILE)) return {};
        return JSON.parse(fs.readFileSync(CHATS_FILE, 'utf8'));
    } catch { return {}; }
}

function salvarChats(chats) {
    try {
        fs.mkdirSync(path.dirname(CHATS_FILE), { recursive: true });
        fs.writeFileSync(CHATS_FILE, JSON.stringify(chats, null, 2));
    } catch (e) {
        console.error('Erro ao salvar chats:', e.message);
    }
}

// ── REST API ──────────────────────────────────────────────────────────────────

// GET /api/chats/:conversaId  →  retorna histórico de mensagens
app.get('/api/chats/:conversaId', (req, res) => {
    const chats    = lerChats();
    const conversa = chats[req.params.conversaId] || { mensagens: [] };
    res.json(conversa);
});

// POST /api/chats  →  envia mensagem e emite via Socket.io
app.post('/api/chats', (req, res) => {
    const { conversaId, mensagem } = req.body || {};

    if (!conversaId || typeof conversaId !== 'string') {
        return res.status(400).json({ erro: 'conversaId inválido.' });
    }
    if (!mensagem?.remetenteId || !mensagem?.texto?.trim()) {
        return res.status(400).json({ erro: 'Mensagem inválida.' });
    }

    const chats = lerChats();
    if (!chats[conversaId]) chats[conversaId] = { mensagens: [] };

    const msg = {
        id:            crypto.randomUUID(),
        remetenteId:   mensagem.remetenteId,
        remetenteNome: mensagem.remetenteNome || 'Usuário',
        texto:         mensagem.texto.trim(),
        timestamp:     Date.now()
    };

    chats[conversaId].mensagens.push(msg);
    salvarChats(chats);

    // Emite para todos na sala deste chat
    io.to(`chat:${conversaId}`).emit('chat:mensagem', { conversaId, mensagem: msg });

    res.json({ sucesso: true, mensagem: msg });
});

// ── Socket.io ─────────────────────────────────────────────────────────────────

io.on('connection', (socket) => {
    // Entra na sala pessoal para receber notificações direcionadas
    socket.on('join:usuario', (usuarioId) => {
        if (typeof usuarioId === 'string' && usuarioId.length > 8) {
            socket.join(`usuario:${usuarioId}`);
        }
    });

    // Gerencia salas de chat
    socket.on('join:chat', (conversaId) => {
        if (typeof conversaId === 'string') socket.join(`chat:${conversaId}`);
    });

    socket.on('leave:chat', (conversaId) => {
        if (typeof conversaId === 'string') socket.leave(`chat:${conversaId}`);
    });

    // Retransmite notificação para um destinatário específico
    socket.on('notificacao:emitir', ({ destinatarioId, notificacao } = {}) => {
        if (destinatarioId && notificacao && typeof notificacao === 'object') {
            io.to(`usuario:${destinatarioId}`).emit('notificacao:nova', notificacao);
        }
    });

    // Retransmite atualização de status de proposta
    socket.on('proposta:status', ({ destinatarioId, evento } = {}) => {
        if (destinatarioId && evento) {
            io.to(`usuario:${destinatarioId}`).emit('proposta:atualizada', evento);
        }
    });

    // Retransmite deleção de anúncio para múltiplos destinatários
    socket.on('anuncio:deletado', ({ destinatariosIds, anuncioTitulo } = {}) => {
        if (Array.isArray(destinatariosIds)) {
            destinatariosIds.forEach(id => {
                io.to(`usuario:${id}`).emit('anuncio:removido', { anuncioTitulo });
            });
        }
    });

    // Retransmite confirmação/recusa de negociação para vendedor e comprador
    socket.on('negociacao:confirmar', ({ vendedorId, compradorId, evento } = {}) => {
        if (vendedorId && compradorId && evento) {
            io.to(`usuario:${vendedorId}`).emit('negociacao:atualizada', evento);
            io.to(`usuario:${compradorId}`).emit('negociacao:atualizada', evento);
        }
    });

    // Retransmite confirmação de liberação de venda para o chat e para os usuários
    socket.on('venda:liberacao', ({ conversaId, anuncioId, papel, vendedorId, compradorId } = {}) => {
        if (!conversaId || !anuncioId || !papel) return;
        const dados = { conversaId, anuncioId, papel, vendedorId, compradorId };
        io.to(`chat:${conversaId}`).emit('venda:liberacao:atualizada', dados);
        if (vendedorId)  io.to(`usuario:${vendedorId}`).emit('venda:liberacao:atualizada',  dados);
        if (compradorId) io.to(`usuario:${compradorId}`).emit('venda:liberacao:atualizada', dados);
    });
});

// ── Inicialização ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`\n  ✅  Liberô rodando em → http://localhost:${PORT}\n`);
    console.log(`  Chat persistido em: data/chats.json`);
    console.log(`  Socket.io ativo para notificações em tempo real\n`);
});
