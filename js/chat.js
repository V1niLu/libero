'use strict';

// ── Estado ────────────────────────────────────────────────────────────────────

let _conversaId = null;

// ── Inicialização ─────────────────────────────────────────────────────────────

function initChat() {
    if (!protegerRota()) return;

    const params = new URLSearchParams(window.location.search);
    _conversaId  = params.get('conversa');

    if (!_conversaId || !_conversaId.includes('::')) {
        window.location.href = 'perfil.html';
        return;
    }

    const partes        = _conversaId.split('::');
    const anuncioId     = partes[0];
    const proponenteId  = partes[1];
    const usuario       = getUsuarioLogado();

    // Valida que o usuário é parte desta conversa
    const anuncio    = getAnuncioById(anuncioId);
    const eVendedor  = anuncio?.usuarioId === usuario.usuarioId;
    const eComprador = proponenteId === usuario.usuarioId;

    if (!eVendedor && !eComprador) {
        window.location.href = 'perfil.html';
        return;
    }

    // Cabeçalho da conversa
    const outroId   = eVendedor ? proponenteId : anuncio?.usuarioId;
    const outro     = buscarUsuarioPorId(outroId);
    const nomeOutro = outro?.nome || 'Usuário';

    const elNome    = document.getElementById('chatNomeOutro');
    const elAnuncio = document.getElementById('chatTituloAnuncio');
    if (elNome)    elNome.textContent    = nomeOutro;
    if (elAnuncio) elAnuncio.textContent = anuncio?.titulo ? `Anúncio: ${anuncio.titulo}` : '';
    document.title = `Chat com ${nomeOutro} — Liberô`;

    atualizarMenuPerfil();

    // Socket.io
    inicializarRealtime();
    entrarSalaChat(_conversaId);

    // Auto-resize + atalho Enter no textarea
    const textarea = document.getElementById('inputMensagem');
    if (textarea) {
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
        });
        textarea.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                enviarMensagem();
            }
        });
        textarea.focus();
    }

    carregarMensagens();
}

// ── Carregar histórico do servidor ────────────────────────────────────────────

async function carregarMensagens() {
    try {
        const res = await fetch(`/api/chats/${encodeURIComponent(_conversaId)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        renderizarMensagens(data.mensagens || []);
    } catch {
        const c = document.getElementById('chatMensagens');
        if (c) c.innerHTML = `
            <div class="chat-erro">
                <p>⚠️ Não foi possível carregar as mensagens.</p>
                <p>O chat requer o servidor ativo.</p>
                <p>Execute na pasta do projeto:</p>
                <p><code>npm install &amp;&amp; npm start</code></p>
                <p>Depois acesse: <code>http://localhost:3000</code></p>
            </div>`;
    }
}

// ── Enviar mensagem ───────────────────────────────────────────────────────────

async function enviarMensagem() {
    const textarea = document.getElementById('inputMensagem');
    const texto    = textarea?.value.trim();
    if (!texto) return;

    const usuario = getUsuarioLogado();
    const btn     = document.getElementById('btnEnviar');
    if (btn) btn.disabled = true;

    try {
        const res = await fetch('/api/chats', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                conversaId: _conversaId,
                mensagem: {
                    remetenteId:   usuario.usuarioId,
                    remetenteNome: usuario.nome,
                    texto
                }
            })
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        if (textarea) {
            textarea.value = '';
            textarea.style.height = 'auto';
        }
        esconderFeedback('feedbackChat');
    } catch {
        mostrarFeedback('feedbackChat', 'Erro ao enviar. Verifique se o servidor está ativo.', 'error');
    } finally {
        if (btn) btn.disabled = false;
        textarea?.focus();
    }
}

// ── Receber mensagem via Socket.io (chamada por realtime.js) ──────────────────

function onChatMensagemRecebida(data) {
    if (data.conversaId !== _conversaId) return;
    adicionarMensagemDom(data.mensagem);
}

// ── Renderização ──────────────────────────────────────────────────────────────

function renderizarMensagens(mensagens) {
    const c       = document.getElementById('chatMensagens');
    const usuario = getUsuarioLogado();
    if (!c) return;

    if (!mensagens.length) {
        c.innerHTML = '<p class="chat-vazio">Nenhuma mensagem ainda. Inicie a conversa!</p>';
        return;
    }

    c.innerHTML = mensagens.map(m => _renderMensagem(m, usuario.usuarioId)).join('');
    c.scrollTop = c.scrollHeight;
}

function adicionarMensagemDom(msg) {
    const c       = document.getElementById('chatMensagens');
    const usuario = getUsuarioLogado();
    if (!c) return;

    const vazio = c.querySelector('.chat-vazio');
    if (vazio) vazio.remove();

    c.insertAdjacentHTML('beforeend', _renderMensagem(msg, usuario.usuarioId));
    c.scrollTop = c.scrollHeight;
}

function _renderMensagem(m, meuId) {
    const ehMeu = m.remetenteId === meuId;
    const hora  = new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Escapa HTML para segurança
    const texto = String(m.texto)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/\n/g, '<br>');

    return `<div class="chat-msg ${ehMeu ? 'msg-minha' : 'msg-outro'}">
        ${!ehMeu ? `<span class="msg-remetente">${m.remetenteNome}</span>` : ''}
        <div class="msg-balao">
            <p>${texto}</p>
            <span class="msg-hora">${hora}</span>
        </div>
    </div>`;
}
