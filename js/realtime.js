'use strict';

// ── Estado da conexão ─────────────────────────────────────────────────────────

let _socket    = null;
let _conectado = false;

// ── Inicialização ─────────────────────────────────────────────────────────────

function inicializarRealtime() {
    if (_socket !== null) return;        // já inicializado
    if (typeof io === 'undefined') {     // socket.io não disponível (modo offline)
        console.info('Socket.io não disponível — modo offline ativo.');
        return;
    }

    _socket = io({ transports: ['websocket', 'polling'] });

    _socket.on('connect', () => {
        _conectado = true;
        _atualizarIndicadorChat();
        const u = typeof getUsuarioLogado === 'function' ? getUsuarioLogado() : null;
        if (u) _socket.emit('join:usuario', u.usuarioId);
    });

    _socket.on('disconnect', () => {
        _conectado = false;
        _atualizarIndicadorChat();
    });

    _socket.on('connect_error', () => {
        _conectado = false;
        _atualizarIndicadorChat();
    });

    // ── Eventos recebidos ─────────────────────────────────────────────────────

    _socket.on('notificacao:nova', (notif) => {
        if (typeof adicionarNotificacao === 'function') adicionarNotificacao(notif);

        // Atualiza os cards de anúncio quando uma proposta é cancelada pelo comprador
        if (notif.tipo === 'proposta_cancelada') {
            if (typeof renderizarAnunciosPerfil === 'function') renderizarAnunciosPerfil();
        }

        // Sincroniza o status da proposta no localStorage do comprador ao receber
        // notificação de aceite/recusa (cross-browser sync)
        if (notif.tipo === 'proposta_aceita' || notif.tipo === 'proposta_recusada') {
            const novoStatus = notif.tipo === 'proposta_aceita' ? 'aceita' : 'recusada';
            if (typeof atualizarStatusPropostaPorUsuario === 'function') {
                atualizarStatusPropostaPorUsuario(notif.anuncioId, notif.destinatarioId, novoStatus);
            }
            // Re-renderiza a página de detalhes se o comprador estiver vendo este anúncio
            if (window.location.pathname.includes('detalhes-anuncio.html')) {
                const params = new URLSearchParams(window.location.search);
                if (params.get('id') === notif.anuncioId &&
                    typeof getAnuncioById === 'function' && typeof renderizarDetalhes === 'function') {
                    const anuncio = getAnuncioById(notif.anuncioId);
                    if (anuncio) renderizarDetalhes(anuncio);
                }
            }
        }

        if (typeof atualizarBadgeNotif === 'function') atualizarBadgeNotif();
        if (typeof renderizarNotificacoesPerfil === 'function') renderizarNotificacoesPerfil();
        mostrarToast(notif.detalhes || 'Nova notificação', 'info');
    });

    _socket.on('proposta:atualizada', (evento) => {
        // Sincroniza status no localStorage do comprador
        if (evento.anuncioId && evento.status && typeof atualizarStatusPropostaPorUsuario === 'function') {
            const u = typeof getUsuarioLogado === 'function' ? getUsuarioLogado() : null;
            if (u) atualizarStatusPropostaPorUsuario(evento.anuncioId, u.usuarioId, evento.status);
        }
        if (typeof renderizarAnunciosPerfil === 'function') renderizarAnunciosPerfil();
        // Re-renderiza detalhes se o comprador estiver na página do anúncio
        if (evento.anuncioId && window.location.pathname.includes('detalhes-anuncio.html')) {
            const params = new URLSearchParams(window.location.search);
            if (params.get('id') === evento.anuncioId &&
                typeof getAnuncioById === 'function' && typeof renderizarDetalhes === 'function') {
                const anuncio = getAnuncioById(evento.anuncioId);
                if (anuncio) renderizarDetalhes(anuncio);
            }
        }
        mostrarToast(
            `Proposta ${evento.status}: ${typeof truncarTexto === 'function' ? truncarTexto(evento.anuncioTitulo || '', 35) : ''}`,
            'info'
        );
    });

    _socket.on('anuncio:removido', (evento) => {
        if (typeof renderizarIndex === 'function') renderizarIndex();
        mostrarToast(
            `Anúncio removido: ${typeof truncarTexto === 'function' ? truncarTexto(evento.anuncioTitulo, 35) : evento.anuncioTitulo}`,
            'aviso'
        );
    });

    _socket.on('negociacao:atualizada', (evento) => {
        if (evento.anuncioId && typeof processarConfirmacaoNegociacao === 'function') {
            processarConfirmacaoNegociacao(evento.anuncioId, evento.papel, evento.decisao);
        }
        if (typeof renderizarAnunciosPerfil === 'function') renderizarAnunciosPerfil();
        if (typeof renderizarNotificacoesPerfil === 'function') renderizarNotificacoesPerfil();
        if (typeof atualizarBadgeNotif === 'function') atualizarBadgeNotif();
        const msg = evento.situacao === 'negociado'   ? 'Acordo confirmado! Acesse o chat.'  :
                    evento.situacao === 'sem_acordo'   ? 'Acordo não confirmado.'              :
                    'Negociação atualizada.';
        mostrarToast(msg, evento.situacao === 'negociado' ? 'sucesso' : 'info');
    });

    _socket.on('chat:mensagem', (data) => {
        if (typeof onChatMensagemRecebida === 'function') onChatMensagemRecebida(data);
    });
}

// Atualiza o indicador de status na página de chat
function _atualizarIndicadorChat() {
    const el = document.getElementById('chatStatus');
    if (!el) return;
    el.textContent = _conectado ? 'Conectado' : 'Desconectado';
    el.className   = `chat-status ${_conectado ? 'conectado' : 'desconectado'}`;
}

// ── Emissores ─────────────────────────────────────────────────────────────────

function emitirNotificacao(destinatarioId, notificacao) {
    if (_socket && _conectado) {
        _socket.emit('notificacao:emitir', { destinatarioId, notificacao });
    }
}

function emitirStatusProposta(destinatarioId, evento) {
    if (_socket && _conectado) {
        _socket.emit('proposta:status', { destinatarioId, evento });
    }
}

function emitirAnuncioDeletado(destinatariosIds, anuncioTitulo) {
    if (_socket && _conectado) {
        _socket.emit('anuncio:deletado', { destinatariosIds, anuncioTitulo });
    }
}

function emitirConfirmacaoNegociacao(vendedorId, compradorId, evento) {
    if (_socket && _conectado) {
        _socket.emit('negociacao:confirmar', { vendedorId, compradorId, evento });
    }
}

function entrarSalaChat(conversaId) {
    if (_socket && _conectado) _socket.emit('join:chat', conversaId);
    // Tenta entrar na sala quando a conexão for estabelecida
    if (_socket && !_conectado) {
        _socket.once('connect', () => _socket.emit('join:chat', conversaId));
    }
}

function sairSalaChat(conversaId) {
    if (_socket && _conectado) _socket.emit('leave:chat', conversaId);
}

// ── Toast notifications ───────────────────────────────────────────────────────

function _getToastContainer() {
    let c = document.getElementById('toastContainer');
    if (!c) {
        c = document.createElement('div');
        c.id = 'toastContainer';
        c.className = 'toast-container';
        document.body.appendChild(c);
    }
    return c;
}

function mostrarToast(mensagem, tipo = 'info') {
    const container = _getToastContainer();
    const toast     = document.createElement('div');
    toast.className = `toast-notif toast-${tipo}`;
    toast.textContent = mensagem;
    toast.addEventListener('click', () => {
        toast.classList.remove('toast-ativo');
        setTimeout(() => toast.remove(), 350);
    });
    container.appendChild(toast);

    // Força reflow para a transição funcionar
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('toast-ativo')));

    setTimeout(() => {
        toast.classList.remove('toast-ativo');
        setTimeout(() => toast.remove(), 350);
    }, 5000);
}
