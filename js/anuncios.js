// ── CRUD ──────────────────────────────────────────────────────────────────────

function criarAnuncio(dados) {
    const usuario = getUsuarioLogado();
    if (!usuario) return { sucesso: false, erro: 'Usuário não autenticado.' };

    const agora = Date.now();
    const duracao = Number(dados.duracao);

    const anuncio = {
        id:                    gerarUUID(),
        usuarioId:             usuario.usuarioId,
        titulo:                dados.titulo.trim(),
        categoria:             dados.categoria,
        descricao:             dados.descricao.trim(),
        volume:                dados.volume,
        endereco:              dados.endereco?.trim() || '',
        imagens:               dados.imagens || [],
        duracao,
        dataPublicacao:        agora,
        dataExpiracao:         agora + duracao * 24 * 60 * 60 * 1000,
        ativo:                 true,
        situacao:              'ativo',
        restritoParaONGs:      dados.restritoParaONGs || false,
        horarioRetiradaInicio: dados.horarioRetiradaInicio || null,
        horarioRetiradaFim:    dados.horarioRetiradaFim || null,
        propostas:             []
    };

    salvarAnuncio(anuncio);
    return { sucesso: true, anuncio };
}

function editarAnuncio(id, dados) {
    const usuario = getUsuarioLogado();
    if (!usuario) return { sucesso: false, erro: 'Não autenticado.' };

    const anuncio = getAnuncioById(id);
    if (!anuncio || anuncio.usuarioId !== usuario.usuarioId)
        return { sucesso: false, erro: 'Anúncio não encontrado.' };

    const duracao = Number(dados.duracao);
    const novaExpiracao = anuncio.dataPublicacao + duracao * 24 * 60 * 60 * 1000;

    atualizarAnuncio(id, {
        titulo:                dados.titulo.trim(),
        categoria:             dados.categoria,
        descricao:             dados.descricao.trim(),
        volume:                dados.volume,
        endereco:              dados.endereco?.trim() || anuncio.endereco || '',
        imagens:               dados.imagens && dados.imagens.length > 0 ? dados.imagens : anuncio.imagens,
        duracao,
        dataExpiracao:         novaExpiracao,
        ativo:                 !estaExpirado(novaExpiracao),
        restritoParaONGs:      dados.restritoParaONGs || false,
        horarioRetiradaInicio: dados.horarioRetiradaInicio || null,
        horarioRetiradaFim:    dados.horarioRetiradaFim || null
    });

    return { sucesso: true };
}

// ── Filtro por perfil ─────────────────────────────────────────────────────────

function filtrarPorPerfil(anuncios) {
    const usuario = getUsuarioLogado();
    const isONG = usuario && usuario.tipoPerfil === 'ong';
    return anuncios.filter(a => !a.restritoParaONGs || isONG);
}

// ── Upload de imagens ─────────────────────────────────────────────────────────

function processarImagensUpload(files) {
    const promises = Array.from(files).map(file =>
        new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.readAsDataURL(file);
        })
    );
    return Promise.all(promises);
}

// ── Helpers de renderização ───────────────────────────────────────────────────

function calcularDestaqueInfo(anuncio) {
    const pct = calcularPorcentagemRestante(anuncio.dataPublicacao, anuncio.dataExpiracao);
    return {
        ehDestaque:           pct <= 0.30,
        porcentagemRestante:  pct,
        diasRestantes:        calcularDiasRestantes(anuncio.dataExpiracao)
    };
}

function obterPrimeiraImagem(anuncio) {
    return (anuncio.imagens && anuncio.imagens.length > 0) ? anuncio.imagens[0] : IMG_PLACEHOLDER;
}

function diasRestantesTexto(n) {
    return `${n} dia${n !== 1 ? 's' : ''} restante${n !== 1 ? 's' : ''}`;
}

function badgeRestricao(anuncio) {
    return anuncio.restritoParaONGs
        ? '<span class="badge-ong" title="Exclusivo para ONGs">🏷️ ONGs</span>'
        : '';
}

// ── Cards ─────────────────────────────────────────────────────────────────────

function renderizarCardIndex(anuncio) {
    const { ehDestaque, diasRestantes } = calcularDestaqueInfo(anuncio);
    const base = getBaseUrl();

    return `
        <div class="produto" onclick="window.location.href='${base}pages/detalhes-anuncio.html?id=${anuncio.id}'">
            <img src="${obterPrimeiraImagem(anuncio)}" alt="${anuncio.titulo}" loading="lazy">
            <div class="containerProduto">
                <div class="badges-linha">
                    <span class="badge-categoria" style="background:${getCoresCategoria(anuncio.categoria)}">${getNomeCategoria(anuncio.categoria)}</span>
                    ${ehDestaque ? '<span class="badge-destaque">Últimos dias!</span>' : ''}
                    ${badgeRestricao(anuncio)}
                </div>
                <h4>${truncarTexto(anuncio.titulo, 50)}</h4>
                <p>${anuncio.volume}</p>
                <div class="detalhes">
                    <p>${diasRestantesTexto(diasRestantes)}</p>
                    <a href="${base}pages/detalhes-anuncio.html?id=${anuncio.id}">Ver detalhes</a>
                </div>
            </div>
        </div>`;
}

function renderizarCardDestaque(anuncio) {
    const { diasRestantes } = calcularDestaqueInfo(anuncio);
    const base = getBaseUrl();
    const usuario = buscarUsuarioPorId(anuncio.usuarioId);

    return `
        <div class="containerDestaque">
            <div class="descricaoDestaque">
                <div class="badges-linha">
                    <span class="badge-categoria" style="background:${getCoresCategoria(anuncio.categoria)}">${getNomeCategoria(anuncio.categoria)}</span>
                    ${badgeRestricao(anuncio)}
                </div>
                <h2>${truncarTexto(anuncio.titulo, 60)}</h2>
                <h4>${anuncio.volume}</h4>
                <h4>${usuario ? usuario.nome : 'Anunciante'}</h4>
                <h4>${diasRestantesTexto(diasRestantes)}</h4>
                ${anuncio.horarioRetiradaInicio ? `<h4>Retirada: ${formatarHorario(anuncio.horarioRetiradaInicio)} – ${formatarHorario(anuncio.horarioRetiradaFim)}</h4>` : ''}
                <div class="detalhesDestaque">
                    <span class="badge-destaque">Últimos dias!</span>
                    <a href="${base}pages/detalhes-anuncio.html?id=${anuncio.id}">Ver detalhes</a>
                </div>
            </div>
            <div class="imgProduto">
                <img src="${obterPrimeiraImagem(anuncio)}" alt="${anuncio.titulo}" loading="lazy">
            </div>
        </div>`;
}

function renderizarCardPerfil(anuncio) {
    const { ehDestaque, diasRestantes } = calcularDestaqueInfo(anuncio);
    const pctDecorrido = anuncio.ativo
        ? Math.round((1 - calcularPorcentagemRestante(anuncio.dataPublicacao, anuncio.dataExpiracao)) * 100)
        : 100;
    const totalPropostas = (anuncio.propostas || []).length;
    const pendentes = (anuncio.propostas || []).filter(p => p.status === 'pendente').length;

    const cardClass = !anuncio.ativo
        ? (anuncio.situacao === 'aguardando_confirmacao' ? 'negociando' : 'expirado')
        : '';

    // Seção de negociação final para anúncios expirados com proposta vencedora
    let negociacaoHtml = '';
    if (!anuncio.ativo && anuncio.negociacaoFinal) {
        const neg         = anuncio.negociacaoFinal;
        const vencedor    = buscarUsuarioPorId(neg.proponenteId);
        const nomeVenc    = vencedor?.nome || 'Desconhecido';
        const valorText   = neg.propostaValor > 0
            ? neg.propostaValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            : '';

        if (anuncio.situacao === 'aguardando_confirmacao') {
            if (neg.vendedorConfirmou !== null) {
                negociacaoHtml = `
                <div class="card-perfil-negociacao">
                    <p class="neg-aguardando">⏳ Aguardando confirmação de <strong>${nomeVenc}</strong>…</p>
                </div>`;
            } else {
                negociacaoHtml = `
                <div class="card-perfil-negociacao">
                    <p class="neg-titulo">🏆 Proposta vencedora</p>
                    <p class="neg-info"><strong>${nomeVenc}</strong>${valorText ? ' — ' + valorText : ''} · ${getLabelProposta(neg.propostaTipo)}</p>
                    <div class="neg-acoes">
                        <button class="btn-confirmar-neg" onclick="confirmarAcordo('${anuncio.id}','vendedor',true)">✅ Confirmar</button>
                        <button class="btn-recusar-neg" onclick="confirmarAcordo('${anuncio.id}','vendedor',false)">❌ Recusar</button>
                    </div>
                </div>`;
            }
        } else if (anuncio.situacao === 'negociado') {
            const conversaId = `${anuncio.id}::${neg.proponenteId}`;
            negociacaoHtml = `
                <div class="card-perfil-negociacao neg-concluido">
                    <span>✅ Negociado com <strong>${nomeVenc}</strong></span>
                    <a href="chat.html?conversa=${conversaId}" class="btn-chat-prop">💬 Chat</a>
                </div>`;
        } else if (anuncio.situacao === 'sem_acordo') {
            negociacaoHtml = `
                <div class="card-perfil-negociacao neg-sem-acordo">
                    <span>❌ Sem acordo</span>
                </div>`;
        }
    }

    return `
        <article class="card-perfil ${cardClass}" data-id="${anuncio.id}">
            <div class="card-perfil-img">
                <img src="${obterPrimeiraImagem(anuncio)}" alt="${anuncio.titulo}" loading="lazy">
                ${!anuncio.ativo ? '<span class="badge-expirado">Expirado</span>' : ''}
                ${ehDestaque && anuncio.ativo ? '<span class="badge-destaque">Últimos dias!</span>' : ''}
                ${anuncio.restritoParaONGs ? '<span class="badge-ong-card">ONGs</span>' : ''}
            </div>
            <div class="card-perfil-info">
                <span class="badge-categoria" style="background:${getCoresCategoria(anuncio.categoria)}">${getNomeCategoria(anuncio.categoria)}</span>
                <h4>${truncarTexto(anuncio.titulo, 50)}</h4>
                <p>${anuncio.volume}</p>
                ${anuncio.horarioRetiradaInicio ? `<p class="texto-horario">${formatarHorario(anuncio.horarioRetiradaInicio)} – ${formatarHorario(anuncio.horarioRetiradaFim)}</p>` : ''}
                <div class="barra-progresso">
                    <div class="barra-progresso-fill ${pctDecorrido >= 70 ? 'barra-urgente' : ''}" style="width:${pctDecorrido}%"></div>
                </div>
                <p class="texto-dias">
                    ${anuncio.ativo ? diasRestantesTexto(diasRestantes) : `Expirou em ${formatarData(anuncio.dataExpiracao)}`}
                </p>
            </div>
            <div class="card-perfil-acoes">
                ${anuncio.ativo ? `<button class="btn-editar" onclick="abrirEdicao('${anuncio.id}')">Editar</button>` : ''}
                <button class="btn-excluir" onclick="confirmarExclusao('${anuncio.id}')">Excluir</button>
                ${anuncio.ativo ? `<a href="detalhes-anuncio.html?id=${anuncio.id}" class="btn-ver">Ver</a>` : ''}
                ${anuncio.ativo ? `
                <button class="btn-propostas ${pendentes > 0 ? 'btn-propostas-destaque' : ''}" onclick="verPropostas('${anuncio.id}')">
                    Propostas${totalPropostas > 0 ? ` (${pendentes > 0 ? pendentes + ' novas' : totalPropostas})` : ''}
                </button>` : ''}
            </div>
            ${negociacaoHtml}
        </article>`;
}
