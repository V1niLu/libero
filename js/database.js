const DB_KEY = 'libero_db';

function inicializarDB() {
    if (!localStorage.getItem(DB_KEY)) {
        localStorage.setItem(DB_KEY, JSON.stringify({ usuarios: [], anuncios: [], notificacoes: [] }));
        return;
    }
    const db    = getDB();
    let dirty   = false;

    // Garante campo notificacoes para DBs antigos
    if (!db.notificacoes) { db.notificacoes = []; dirty = true; }

    // Garante propostas[], endereco e situacao em anuncios; id/status em propostas
    (db.anuncios || []).forEach(anuncio => {
        if (!anuncio.propostas)         { anuncio.propostas  = [];                              dirty = true; }
        if (anuncio.endereco === undefined) { anuncio.endereco = '';                            dirty = true; }
        if (!anuncio.situacao)          { anuncio.situacao   = anuncio.ativo ? 'ativo' : 'expirado'; dirty = true; }
        anuncio.propostas.forEach(p => {
            if (!p.id)     { p.id     = gerarUUID();  dirty = true; }
            if (!p.status) { p.status = 'pendente';   dirty = true; }
        });
    });

    if (dirty) salvarDB(db);
}

function getDB() {
    try {
        const dados = localStorage.getItem(DB_KEY);
        return dados ? JSON.parse(dados) : { usuarios: [], anuncios: [] };
    } catch {
        return { usuarios: [], anuncios: [] };
    }
}

function salvarDB(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// ── Usuários ──────────────────────────────────────────────────────────────────

function getUsuarios() {
    return getDB().usuarios;
}

function buscarUsuarioPorEmail(email) {
    return getUsuarios().find(u => u.email === email.toLowerCase().trim()) || null;
}

function buscarUsuarioPorId(id) {
    return getUsuarios().find(u => u.id === id) || null;
}

function salvarUsuario(usuario) {
    const db = getDB();
    db.usuarios.push(usuario);
    salvarDB(db);
}

// ── Anúncios ─────────────────────────────────────────────────────────────────

function getAnuncios() {
    return getDB().anuncios;
}

function getAnuncioById(id) {
    return getAnuncios().find(a => a.id === id) || null;
}

function getAnunciosAtivos() {
    return getAnuncios().filter(a => a.ativo);
}

function getAnunciosPorUsuario(usuarioId) {
    return getAnuncios().filter(a => a.usuarioId === usuarioId);
}

function salvarAnuncio(anuncio) {
    const db = getDB();
    db.anuncios.push(anuncio);
    salvarDB(db);
}

function atualizarAnuncio(id, dadosNovos) {
    const db = getDB();
    const idx = db.anuncios.findIndex(a => a.id === id);
    if (idx === -1) return false;
    db.anuncios[idx] = { ...db.anuncios[idx], ...dadosNovos };
    salvarDB(db);
    return true;
}

function deletarAnuncio(id) {
    const db = getDB();
    db.anuncios = db.anuncios.filter(a => a.id !== id);
    salvarDB(db);
}

// ── Propostas ─────────────────────────────────────────────────────────────────

function adicionarProposta(anuncioId, proposta) {
    const db = getDB();
    const idx = db.anuncios.findIndex(a => a.id === anuncioId);
    if (idx === -1) return false;
    if (!db.anuncios[idx].propostas) db.anuncios[idx].propostas = [];
    db.anuncios[idx].propostas.push(proposta);
    salvarDB(db);
    return true;
}

function getPropostasByAnuncio(anuncioId) {
    const anuncio = getAnuncioById(anuncioId);
    return anuncio ? (anuncio.propostas || []) : [];
}

function jaTemProposta(anuncioId, usuarioId) {
    return getPropostasByAnuncio(anuncioId).some(p => p.usuarioId === usuarioId);
}

function atualizarStatusProposta(anuncioId, propostaId, status) {
    const db = getDB();
    const anuncioIdx = db.anuncios.findIndex(a => a.id === anuncioId);
    if (anuncioIdx === -1) return false;
    const pIdx = (db.anuncios[anuncioIdx].propostas || []).findIndex(p => p.id === propostaId);
    if (pIdx === -1) return false;
    db.anuncios[anuncioIdx].propostas[pIdx].status = status;
    salvarDB(db);
    return true;
}

// ── Notificações ──────────────────────────────────────────────────────────────

function adicionarNotificacao(notif) {
    const db = getDB();
    if (!db.notificacoes) db.notificacoes = [];
    db.notificacoes.push(notif);
    salvarDB(db);
}

function getNotificacoesByDestinatario(usuarioId) {
    return (getDB().notificacoes || []).filter(n => n.destinatarioId === usuarioId);
}

function contarNaoLidas(usuarioId) {
    return getNotificacoesByDestinatario(usuarioId).filter(n => !n.lida).length;
}

function marcarNotificacaoLida(id) {
    const db = getDB();
    if (!db.notificacoes) return;
    const idx = db.notificacoes.findIndex(n => n.id === id);
    if (idx !== -1) { db.notificacoes[idx].lida = true; salvarDB(db); }
}

function marcarTodasLidas(usuarioId) {
    const db = getDB();
    if (!db.notificacoes) return;
    db.notificacoes.forEach(n => { if (n.destinatarioId === usuarioId) n.lida = true; });
    salvarDB(db);
}

// ── Usuário ───────────────────────────────────────────────────────────────────

function atualizarUsuario(id, dados) {
    const db = getDB();
    const idx = db.usuarios.findIndex(u => u.id === id);
    if (idx === -1) return false;
    db.usuarios[idx] = { ...db.usuarios[idx], ...dados };
    salvarDB(db);
    return true;
}

function verificarExpiracoes() {
    const db = getDB();
    let alterado = false;
    const recemExpirados = [];

    db.anuncios.forEach(anuncio => {
        if (anuncio.ativo && estaExpirado(anuncio.dataExpiracao)) {
            anuncio.ativo    = false;
            anuncio.situacao = 'expirado';
            alterado         = true;

            const temPendentes = (anuncio.propostas || []).some(p => p.status === 'pendente');
            if (temPendentes && !anuncio.negociacaoFinal) {
                recemExpirados.push(anuncio.id);
            }
        }
    });

    if (alterado) salvarDB(db);
    return recemExpirados;
}

// ── Exclusão de conta ─────────────────────────────────────────────────────────

function excluirContaUsuario(usuarioId) {
    const db = getDB();

    // Coleta anúncios e proponentes antes de remover (para notificações)
    const anunciosDoUsuario = db.anuncios.filter(a => a.usuarioId === usuarioId);

    // Remove os anúncios do usuário
    db.anuncios = db.anuncios.filter(a => a.usuarioId !== usuarioId);

    // Remove as propostas do usuário em anúncios de terceiros
    db.anuncios.forEach(anuncio => {
        anuncio.propostas = (anuncio.propostas || []).filter(p => p.usuarioId !== usuarioId);
    });

    // Remove notificações destinadas ao usuário
    db.notificacoes = (db.notificacoes || []).filter(n => n.destinatarioId !== usuarioId);

    // Remove o usuário
    db.usuarios = db.usuarios.filter(u => u.id !== usuarioId);

    salvarDB(db);
    return anunciosDoUsuario;
}

// ── Aceitar uma proposta e rejeitar todas as outras pendentes ─────────────────

function aceitarPropostaComRejeicao(anuncioId, propostaId) {
    const db  = getDB();
    const idx = db.anuncios.findIndex(a => a.id === anuncioId);
    if (idx === -1) return { sucesso: false, rejeitados: [] };

    const propostas  = db.anuncios[idx].propostas || [];
    const rejeitados = [];
    let   encontrou  = false;

    propostas.forEach(p => {
        if (p.id === propostaId) {
            p.status = 'aceita';
            encontrou = true;
        } else if (p.status === 'pendente') {
            p.status = 'recusada';
            rejeitados.push({ usuarioId: p.usuarioId, propostaId: p.id });
        }
    });

    if (!encontrou) return { sucesso: false, rejeitados: [] };

    salvarDB(db);
    return { sucesso: true, rejeitados };
}

// ── Cancelar proposta pendente por usuário ────────────────────────────────────

function cancelarPropostaPorUsuario(anuncioId, usuarioId) {
    const db  = getDB();
    const idx = db.anuncios.findIndex(a => a.id === anuncioId);
    if (idx === -1) return false;
    const antes = (db.anuncios[idx].propostas || []).length;
    db.anuncios[idx].propostas = (db.anuncios[idx].propostas || [])
        .filter(p => !(p.usuarioId === usuarioId && p.status === 'pendente'));
    if (db.anuncios[idx].propostas.length === antes) return false;
    salvarDB(db);
    return true;
}

// ── Negociação final (pós-expiração) ─────────────────────────────────────────

function iniciarNegociacaoFinal(anuncioId) {
    const db  = getDB();
    const idx = db.anuncios.findIndex(a => a.id === anuncioId);
    if (idx === -1) return null;

    const anuncio  = db.anuncios[idx];
    if (anuncio.negociacaoFinal) return null;

    const pendentes = (anuncio.propostas || []).filter(p => p.status === 'pendente');
    if (!pendentes.length) return null;

    // Prioridade: pago (maior valor) > gratis/ong (mais antigo) > cobro (menor valor)
    let vencedor = null;
    const pagas  = pendentes.filter(p => p.tipo === 'pago_retirada').sort((a, b) => b.valor - a.valor);
    if (pagas.length) {
        vencedor = pagas[0];
    } else {
        const gratis = pendentes
            .filter(p => p.tipo === 'gratis_retirada' || p.tipo === 'ong_interesse')
            .sort((a, b) => a.timestamp - b.timestamp);
        if (gratis.length) {
            vencedor = gratis[0];
        } else {
            const cobro = pendentes
                .filter(p => p.tipo === 'cobro_retirada')
                .sort((a, b) => a.valor - b.valor || a.timestamp - b.timestamp);
            if (cobro.length) vencedor = cobro[0];
        }
    }

    if (!vencedor) return null;

    // Marca os demais pendentes como recusados
    anuncio.propostas.forEach(p => {
        if (p.status === 'pendente' && p.id !== vencedor.id) p.status = 'recusada';
    });

    anuncio.negociacaoFinal = {
        proponenteId:       vencedor.usuarioId,
        propostaTipo:       vencedor.tipo,
        propostaValor:      vencedor.valor || 0,
        vendedorConfirmou:  null,
        compradorConfirmou: null,
        iniciadaEm:         Date.now()
    };
    anuncio.situacao = 'aguardando_confirmacao';

    salvarDB(db);
    return {
        anuncioId:       anuncio.id,
        anuncioTitulo:   anuncio.titulo,
        anuncioUsuarioId: anuncio.usuarioId,
        vencedor
    };
}

function processarConfirmacaoNegociacao(anuncioId, papel, decisao) {
    // papel: 'vendedor' | 'comprador' — decisao: true (confirma) | false (recusa)
    const db  = getDB();
    const idx = db.anuncios.findIndex(a => a.id === anuncioId);
    if (idx === -1) return null;

    const anuncio = db.anuncios[idx];
    if (!anuncio.negociacaoFinal) return null;

    if (papel === 'vendedor') anuncio.negociacaoFinal.vendedorConfirmou  = decisao;
    else                      anuncio.negociacaoFinal.compradorConfirmou = decisao;

    if (decisao === false) {
        anuncio.situacao = 'sem_acordo';
    } else if (anuncio.negociacaoFinal.vendedorConfirmou === true &&
               anuncio.negociacaoFinal.compradorConfirmou === true) {
        anuncio.situacao = 'negociado';
        const pIdx = (anuncio.propostas || [])
            .findIndex(p => p.usuarioId === anuncio.negociacaoFinal.proponenteId);
        if (pIdx !== -1) anuncio.propostas[pIdx].status = 'aceita';
    }

    salvarDB(db);
    return anuncio.situacao;
}

// ── Liberação de venda (confirmação mútua via chat) ───────────────────────────

function processarLiberacao(anuncioId, papel) {
    // papel: 'comprador' | 'vendedor'
    const db  = getDB();
    const idx = db.anuncios.findIndex(a => a.id === anuncioId);
    if (idx === -1) return null;

    const anuncio = db.anuncios[idx];

    if (!anuncio.liberacao) {
        const propostaAceita = (anuncio.propostas || []).find(p => p.status === 'aceita');
        if (!propostaAceita) return null;

        anuncio.liberacao = {
            compradorId:        propostaAceita.usuarioId,
            compradorConfirmou: false,
            vendedorConfirmou:  false,
            liberadoEm:         null
        };
    }

    if (papel === 'comprador') anuncio.liberacao.compradorConfirmou = true;
    if (papel === 'vendedor')  anuncio.liberacao.vendedorConfirmou  = true;

    if (anuncio.liberacao.compradorConfirmou && anuncio.liberacao.vendedorConfirmou) {
        anuncio.situacao             = 'liberado';
        anuncio.ativo                = false;
        anuncio.liberacao.liberadoEm = Date.now();
    }

    salvarDB(db);
    return anuncio.liberacao;
}

// Atualiza status da proposta buscando por anuncioId + usuarioId do proponente
function atualizarStatusPropostaPorUsuario(anuncioId, usuarioId, status) {
    const db         = getDB();
    const anuncioIdx = db.anuncios.findIndex(a => a.id === anuncioId);
    if (anuncioIdx === -1) return false;
    const propostas  = db.anuncios[anuncioIdx].propostas || [];
    const pIdx       = propostas.findIndex(p => p.usuarioId === usuarioId);
    if (pIdx === -1) return false;
    db.anuncios[anuncioIdx].propostas[pIdx].status = status;
    salvarDB(db);
    return true;
}

// ── Conversas derivadas de propostas aceitas ──────────────────────────────────

function getConversasDoUsuario(usuarioId) {
    const conversas = [];
    const seen      = new Set();

    // Como vendedor: meus anúncios com propostas aceitas
    getAnunciosPorUsuario(usuarioId).forEach(anuncio => {
        (anuncio.propostas || []).filter(p => p.status === 'aceita').forEach(p => {
            const id = `${anuncio.id}::${p.usuarioId}`;
            if (seen.has(id)) return;
            seen.add(id);
            const comprador = buscarUsuarioPorId(p.usuarioId);
            conversas.push({
                id,
                anuncioId:        anuncio.id,
                anuncioTitulo:    anuncio.titulo,
                outroUsuarioNome: comprador?.nome || 'Desconhecido',
                papel:            'vendedor',
                timestamp:        p.timestamp
            });
        });
    });

    // Como comprador: anúncios onde minha proposta foi aceita
    getAnuncios().forEach(anuncio => {
        (anuncio.propostas || [])
            .filter(p => p.usuarioId === usuarioId && p.status === 'aceita')
            .forEach(p => {
                const id = `${anuncio.id}::${usuarioId}`;
                if (seen.has(id)) return;
                seen.add(id);
                const vendedor = buscarUsuarioPorId(anuncio.usuarioId);
                conversas.push({
                    id,
                    anuncioId:        anuncio.id,
                    anuncioTitulo:    anuncio.titulo,
                    outroUsuarioNome: vendedor?.nome || 'Desconhecido',
                    papel:            'comprador',
                    timestamp:        p.timestamp
                });
            });
    });

    return conversas.sort((a, b) => b.timestamp - a.timestamp);
}
