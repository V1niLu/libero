// ── Inicialização ─────────────────────────────────────────────────────────────

let _recemExpiradosIds = [];

function formatarEnderecoPerfil(usuario) {
    if (!usuario) return '';
    const cep = usuario.cep ? usuario.cep.trim() : '';
    const rua = usuario.rua ? usuario.rua.trim() : '';
    const numero = usuario.numero ? usuario.numero.trim() : '';
    const cidade = usuario.cidade ? usuario.cidade.trim() : '';
    const estado = usuario.estado ? usuario.estado.trim().toUpperCase() : '';
    if (!cep || !rua || !numero || !cidade || !estado) return '';
    return `${rua}, ${numero} - ${cidade}/${estado} · CEP ${cep}`;
}

function temEnderecoPerfilCompleto(usuario) {
    return !!(usuario && usuario.cep && usuario.rua && usuario.numero && usuario.cidade && usuario.estado);
}

function atualizarSessaoUsuario(usuario) {
    if (!usuario) return;
    const sessao = {
        usuarioId: usuario.id || usuario.usuarioId,
        nome: usuario.nome || '',
        email: usuario.email || '',
        tipoPerfil: usuario.tipoPerfil || 'comum',
        nomeInstituicao: usuario.nomeInstituicao || null,
        telefone: usuario.telefone || '',
        cep: usuario.cep || '',
        rua: usuario.rua || '',
        numero: usuario.numero || '',
        cidade: usuario.cidade || '',
        estado: usuario.estado || ''
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessao));
}

async function buscarEnderecoPorCEP(cep) {
    const cepSomenteDigitos = cep.replace(/\D/g, '');
    if (cepSomenteDigitos.length !== 8) {
        throw new Error('CEP inválido.');
    }
    const response = await fetch(`https://viacep.com.br/ws/${cepSomenteDigitos}/json/`);
    if (!response.ok) {
        throw new Error('Não foi possível buscar o CEP.');
    }
    const data = await response.json();
    if (data.erro) {
        throw new Error('CEP não encontrado.');
    }
    return data;
}

function carregarDadosPerfil() {
    const usuario = getUsuarioLogado();
    if (!usuario) return;

    if (document.getElementById('nomePerfil')) document.getElementById('nomePerfil').value = usuario.nome || '';
    if (document.getElementById('telefonePerfil')) document.getElementById('telefonePerfil').value = usuario.telefone || '';
    if (document.getElementById('cepPerfil')) document.getElementById('cepPerfil').value = usuario.cep || '';
    if (document.getElementById('ruaPerfil')) document.getElementById('ruaPerfil').value = usuario.rua || '';
    if (document.getElementById('numeroPerfil')) document.getElementById('numeroPerfil').value = usuario.numero || '';
    if (document.getElementById('cidadePerfil')) document.getElementById('cidadePerfil').value = usuario.cidade || '';
    if (document.getElementById('estadoPerfil')) document.getElementById('estadoPerfil').value = usuario.estado || '';

    if (!temEnderecoPerfilCompleto(usuario)) {
        mostrarFeedback('feedbackPerfil', 'Atualize CEP, rua, número, cidade e estado para habilitar os filtros por cidade/CEP nos anúncios.', 'info');
    }
}

function configurarFormularioPerfil() {
    const form = document.getElementById('formPerfil');
    if (!form) return;

    const cepInput = document.getElementById('cepPerfil');
    if (cepInput) {
        cepInput.addEventListener('blur', async () => {
            const cep = cepInput.value.replace(/\D/g, '');
            if (!cep) return;
            try {
                const endereco = await buscarEnderecoPorCEP(cep);
                document.getElementById('ruaPerfil').value = endereco.logradouro || '';
                document.getElementById('cidadePerfil').value = endereco.localidade || '';
                document.getElementById('estadoPerfil').value = (endereco.uf || '').toUpperCase();
                mostrarFeedback('feedbackPerfil', 'Rua, cidade e estado atualizados automaticamente.', 'success');
            } catch (erro) {
                mostrarFeedback('feedbackPerfil', erro.message, 'error');
            }
        });
    }

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const usuario = getUsuarioLogado();
        if (!usuario) return;

        const nome = document.getElementById('nomePerfil').value.trim();
        const telefone = document.getElementById('telefonePerfil').value.trim();
        const cep = document.getElementById('cepPerfil').value.trim();
        const rua = document.getElementById('ruaPerfil').value.trim();
        const numero = document.getElementById('numeroPerfil').value.trim();
        const cidade = document.getElementById('cidadePerfil').value.trim();
        const estado = document.getElementById('estadoPerfil').value.trim().toUpperCase();

        if (!nome || !cep || !rua || !cidade || !estado) {
            mostrarFeedback('feedbackPerfil', 'Preencha os campos obrigatórios de perfil antes de salvar.', 'error');
            return;
        }

        const dadosUsuario = {
            nome,
            telefone,
            cep,
            rua,
            numero,
            cidade,
            estado
        };

        if (!/^[0-9]{5}-?[0-9]{3}$/.test(cep)) {
            mostrarFeedback('feedbackPerfil', 'CEP deve conter 8 dígitos.', 'error');
            return;
        }

        const atualizado = atualizarUsuario(usuario.usuarioId, dadosUsuario);
        if (atualizado) {
            const usuarioAtualizado = buscarUsuarioPorId(usuario.usuarioId);
            atualizarSessaoUsuario(usuarioAtualizado);
            atualizarMenuPerfil();

            const enderecoAtualizado = formatarEnderecoPerfil(usuarioAtualizado);
            if (enderecoAtualizado) {
                getAnunciosPorUsuario(usuario.usuarioId)
                    .filter(a => a.ativo)
                    .forEach(a => atualizarAnuncio(a.id, { endereco: enderecoAtualizado }));
            }

            mostrarFeedback('feedbackPerfil', 'Perfil atualizado com sucesso.', 'success');
        } else {
            mostrarFeedback('feedbackPerfil', 'Não foi possível atualizar o perfil.', 'error');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    inicializarDB();
    _recemExpiradosIds = verificarExpiracoes();

    const path = window.location.pathname;

    if (path.endsWith('index.html') || path.endsWith('/') || path === '') {
        initIndex();
    } else if (path.includes('cadastro.html')) {
        initCadastro();
    } else if (path.includes('chat.html')) {
        if (typeof initChat === 'function') initChat();
    } else if (path.includes('perfil.html')) {
        initPerfil();
    } else if (path.includes('detalhes-anuncio.html')) {
        initDetalhes();
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// INDEX
// ══════════════════════════════════════════════════════════════════════════════

let categoriaAtiva = 'todos';

function initIndex() {
    atualizarMenuPerfil();
    renderizarIndex();
    configurarFiltros();
    configurarOrdenacao();
    configurarPesquisa();
    inicializarRealtime();
    _processarNovasExpiracoes();
}

function renderizarIndex(filtro = 'todos', ordem = 'recentes', pesquisa = '') {
    const listagemEl = document.getElementById('listagemProduto');
    const destaqueEl = document.getElementById('listagemDestaque');

    let anuncios = filtrarPorPerfil(getAnunciosAtivos());

    if (pesquisa) {
        const termo = pesquisa.toLowerCase().trim();
        const termoDigitos = termo.replace(/\D/g, '');

        anuncios = anuncios.filter(a => {
            const usuario = buscarUsuarioPorId(a.usuarioId) || {};
            const titulo = a.titulo.toLowerCase();
            const descricao = a.descricao.toLowerCase();
            const endereco = (a.endereco || '').toLowerCase();
            const cidade = (usuario.cidade || '').toLowerCase();
            const cep = (usuario.cep || '').replace(/\D/g, '');

            return titulo.includes(termo)
                || descricao.includes(termo)
                || endereco.includes(termo)
                || cidade.includes(termo)
                || (termoDigitos && cep.includes(termoDigitos));
        });
    }
    if (filtro !== 'todos') anuncios = anuncios.filter(a => a.categoria === filtro);

    if (ordem === 'recentes') {
        anuncios.sort((a, b) => b.dataPublicacao - a.dataPublicacao);
    } else {
        anuncios.sort((a, b) => a.dataExpiracao - b.dataExpiracao);
    }

    // Destaques: ≥ 50% do tempo decorrido (segunda metade da duração)
    const todosAtivosDestaque = filtrarPorPerfil(getAnunciosAtivos());
    const destaques = todosAtivosDestaque
        .filter(a => calcularPorcentagemRestante(a.dataPublicacao, a.dataExpiracao) <= 0.50)
        .sort((a, b) => a.dataExpiracao - b.dataExpiracao);

    if (destaqueEl) {
        const secao    = destaqueEl.closest('.destaque');
        const tituloEl = secao?.querySelector('h2');
        if (destaques.length > 0) {
            if (tituloEl) tituloEl.textContent = 'Expirando em breve';
            renderizarDestaquesResponsivo(destaques, destaqueEl);
            if (secao) secao.style.display = '';
        } else if (todosAtivosDestaque.length > 0) {
            if (tituloEl) tituloEl.textContent = 'Anúncios disponíveis';
            renderizarDestaquesResponsivo(todosAtivosDestaque, destaqueEl);
            if (secao) secao.style.display = '';
        } else {
            if (secao) secao.style.display = 'none';
        }
    }

    if (listagemEl) {
        listagemEl.innerHTML = anuncios.length > 0
            ? anuncios.map(renderizarCardIndex).join('')
            : '<p class="estado-vazio">Nenhum anúncio encontrado.</p>';
    }

    document.querySelectorAll('.btn-categoria').forEach(btn => {
        btn.classList.toggle('ativo', btn.dataset.categoria === filtro);
    });
}

// ── Carrossel de destaques ────────────────────────────────────────────────────

let _carrosselInterval = null;
let _carrosselAtual = 0;
let _carrosselTotal = 0;

function renderizarDestaquesResponsivo(destaques, container) {
    pararCarrosselDestaque();

    // Sempre usa carrossel: se > 10 destaques, mostra apenas os 10 primeiros
    const destaquesExibidos = destaques.slice(0, 10);
    _carrosselTotal = destaquesExibidos.length;
    _carrosselAtual = 0;

    container.innerHTML = `
        <div class="carrossel-destaque-wrapper" id="carrosselDestaqueWrapper">
            <div class="carrossel-destaque-slides">
                ${destaquesExibidos.map((a, i) => `
                    <div class="slide-destaque ${i === 0 ? 'ativo' : ''}" data-idx="${i}">
                        ${renderizarCardDestaque(a)}
                    </div>
                `).join('')}
            </div>
            ${destaquesExibidos.length > 1 ? `
            <div class="carrossel-dots" id="carrosselDots">
                ${destaquesExibidos.map((_, i) => `
                    <button class="dot ${i === 0 ? 'ativo' : ''}" onclick="irParaSlideDestaque(${i})" aria-label="Slide ${i + 1}"></button>
                `).join('')}
            </div>` : ''}
        </div>`;

    const wrapper = document.getElementById('carrosselDestaqueWrapper');
    if (wrapper && destaquesExibidos.length > 1) {
        wrapper.addEventListener('mouseenter', pararCarrosselDestaque);
        wrapper.addEventListener('mouseleave', () => iniciarCarrosselDestaque());
        iniciarCarrosselDestaque();
    }
}

function iniciarCarrosselDestaque() {
    pararCarrosselDestaque();
    if (_carrosselTotal <= 1) return;
    _carrosselInterval = setInterval(() => {
        irParaSlideDestaque((_carrosselAtual + 1) % _carrosselTotal);
    }, 3000);
}

function pararCarrosselDestaque() {
    if (_carrosselInterval) { clearInterval(_carrosselInterval); _carrosselInterval = null; }
}

function irParaSlideDestaque(idx) {
    const slides = document.querySelectorAll('.slide-destaque');
    const dots   = document.querySelectorAll('#carrosselDots .dot');
    if (!slides.length || idx === _carrosselAtual) return;

    slides[_carrosselAtual].classList.remove('ativo');
    dots[_carrosselAtual]?.classList.remove('ativo');
    _carrosselAtual = idx;
    slides[_carrosselAtual].classList.add('ativo');
    dots[_carrosselAtual]?.classList.add('ativo');
}

// ── Filtros e pesquisa ────────────────────────────────────────────────────────

function configurarFiltros() {
    document.querySelectorAll('.btn-categoria').forEach(btn => {
        btn.addEventListener('click', () => {
            categoriaAtiva = btn.dataset.categoria;
            const ordem = document.getElementById('selectOrdem')?.value || 'recentes';
            const pesquisa = document.getElementById('inputPesquisa')?.value || '';
            renderizarIndex(categoriaAtiva, ordem, pesquisa);
        });
    });
}

function configurarOrdenacao() {
    const sel = document.getElementById('selectOrdem');
    if (!sel) return;
    sel.addEventListener('change', () => {
        const pesquisa = document.getElementById('inputPesquisa')?.value || '';
        renderizarIndex(categoriaAtiva, sel.value, pesquisa);
    });
}

function configurarPesquisa() {
    const input = document.getElementById('inputPesquisa');
    if (!input) return;
    input.addEventListener('input', () => {
        const ordem = document.getElementById('selectOrdem')?.value || 'recentes';
        renderizarIndex(categoriaAtiva, ordem, input.value);
    });
}

// ══════════════════════════════════════════════════════════════════════════════
// CADASTRO / LOGIN
// ══════════════════════════════════════════════════════════════════════════════

function transicaoCadastro() {
    const el = document.getElementById('trasicao');
    el.classList.remove('loginTransition');
    el.classList.add('cadastroTransition');
}

function transitionLogin() {
    const el = document.getElementById('trasicao');
    el.classList.remove('cadastroTransition');
    el.classList.add('loginTransition');
}

function initCadastro() {
    if (estaLogado()) { window.location.href = 'perfil.html'; return; }
    if (window.location.hash === '#cadastro') transicaoCadastro();

    // Dinâmica do campo tipoPerfil → nomeInstituicao
    const selectTipo = document.getElementById('tipoPerfil');
    const wrapInstituicao = document.getElementById('wrapNomeInstituicao');
    const inputInstituicao = document.getElementById('nomeInstituicao');

    if (selectTipo && wrapInstituicao) {
        selectTipo.addEventListener('change', () => {
            const ehOngSelecionado = selectTipo.value === 'ong';
            wrapInstituicao.style.display = ehOngSelecionado ? 'flex' : 'none';
            if (inputInstituicao) inputInstituicao.required = ehOngSelecionado;
        });
    }

    const formLogin = document.getElementById('formLogin');
    if (formLogin) {
        formLogin.addEventListener('submit', e => {
            e.preventDefault();
            const email = document.getElementById('emailLogin').value;
            const senha = document.getElementById('senhaLogin').value;
            mostrarFeedback('feedbackLogin', 'Verificando...', 'loading');
            const res = fazerLogin(email, senha);
            if (res.sucesso) {
                mostrarFeedback('feedbackLogin', 'Login realizado! Redirecionando...', 'success');
                setTimeout(() => { window.location.href = 'perfil.html'; }, 800);
            } else {
                mostrarFeedback('feedbackLogin', res.erro, 'error');
            }
        });
    }

    const formCadastro = document.getElementById('formCadastro');
    if (formCadastro) {
        formCadastro.addEventListener('submit', e => {
            e.preventDefault();
            const nome        = document.getElementById('nomeCadastro').value;
            const email       = document.getElementById('emailCadastro').value;
            const senha       = document.getElementById('senhaCadastro').value;
            const confirmacao = document.getElementById('confirmaSenha').value;
            const tipo        = document.getElementById('tipoPerfil')?.value || 'comum';
            const instituicao = document.getElementById('nomeInstituicao')?.value || '';

            mostrarFeedback('feedbackCadastro', 'Cadastrando...', 'loading');
            const res = fazerCadastro(nome, email, senha, confirmacao, tipo, instituicao);
            if (res.sucesso) {
                mostrarFeedback('feedbackCadastro', 'Cadastro realizado! Redirecionando...', 'success');
                setTimeout(() => { window.location.href = 'perfil.html'; }, 800);
            } else {
                mostrarFeedback('feedbackCadastro', res.erro, 'error');
            }
        });
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// PERFIL
// ══════════════════════════════════════════════════════════════════════════════

let imagensNovasUpload = [];
let anuncioEmEdicao    = null;

function initPerfil() {
    if (!protegerRota()) return;

    const usuario = getUsuarioLogado();
    const nomeEl = document.getElementById('nomeUsuario');
    if (nomeEl) nomeEl.textContent = usuario.tipoPerfil === 'ong'
        ? `${usuario.nome} · ${usuario.nomeInstituicao || 'ONG'}`
        : usuario.nome;

    atualizarMenuPerfil();
    renderizarAnunciosPerfil();
    configurarFormAnuncio();
    configurarUploadImagens();
    configurarAbas();
    configurarCamposCondicionalAnuncio();
    configurarFormularioPerfil();
    carregarDadosPerfil();
    renderizarNotificacoesPerfil();
    renderizarConversasPerfil();
    atualizarBadgeNotif();
    inicializarRealtime();
    _processarNovasExpiracoes();

    const tituloInput = document.getElementById('tituloAnuncio');
    const descricaoInput = document.getElementById('descricaoAnuncio');
    if (tituloInput) tituloInput.addEventListener('input', () => {
        document.getElementById('contadorTitulo').textContent = tituloInput.value.length;
    });
    if (descricaoInput) descricaoInput.addEventListener('input', () => {
        document.getElementById('contadorDescricao').textContent = descricaoInput.value.length;
    });
}

// ── Renderização dos anúncios no perfil ───────────────────────────────────────

function renderizarAnunciosPerfil() {
    const usuario = getUsuarioLogado();
    if (!usuario) return;

    const todos     = getAnunciosPorUsuario(usuario.usuarioId);
    const ativos    = todos.filter(a => a.ativo);
    const liberados = todos.filter(a => !a.ativo && a.situacao === 'liberado');
    const expirados = todos.filter(a => !a.ativo && a.situacao !== 'liberado');

    document.getElementById('totalAtivos')    && (document.getElementById('totalAtivos').textContent    = ativos.length);
    document.getElementById('totalExpirados') && (document.getElementById('totalExpirados').textContent = expirados.length);
    document.getElementById('totalLiberados') && (document.getElementById('totalLiberados').textContent = liberados.length);

    const containerAtivos    = document.getElementById('listaAtivos');
    const containerExpirados = document.getElementById('listaExpirados');
    const containerLiberados = document.getElementById('listaLiberados');

    if (containerAtivos) {
        containerAtivos.innerHTML = ativos.length > 0
            ? ativos.map(renderizarCardPerfil).join('')
            : '<p class="estado-vazio">Nenhum anúncio ativo.</p>';
    }
    if (containerExpirados) {
        containerExpirados.innerHTML = expirados.length > 0
            ? expirados.map(renderizarCardPerfil).join('')
            : '<p class="estado-vazio">Nenhum anúncio expirado.</p>';
    }
    if (containerLiberados) {
        containerLiberados.innerHTML = liberados.length > 0
            ? liberados.map(renderizarCardLiberado).join('')
            : '<p class="estado-vazio">Nenhum anúncio liberado ainda.</p>';
    }
}

function renderizarCardLiberado(anuncio) {
    const comprador     = anuncio.liberacao?.compradorId
        ? buscarUsuarioPorId(anuncio.liberacao.compradorId) : null;
    const compradorNome = comprador?.nome || 'Interessado';
    const dataLib       = anuncio.liberacao?.liberadoEm
        ? formatarData(anuncio.liberacao.liberadoEm) : '';
    const conversaId    = anuncio.liberacao?.compradorId
        ? `${anuncio.id}::${anuncio.liberacao.compradorId}` : null;

    return `
        <article class="card-perfil card-liberado" data-id="${anuncio.id}">
            <div class="card-perfil-img">
                <img src="${obterPrimeiraImagem(anuncio)}" alt="${anuncio.titulo}" loading="lazy">
                <span class="badge-liberado">Liberado</span>
            </div>
            <div class="card-perfil-info">
                <span class="badge-categoria" style="background:${getCoresCategoria(anuncio.categoria)}">${getNomeCategoria(anuncio.categoria)}</span>
                <h4>${truncarTexto(anuncio.titulo, 50)}</h4>
                <p>${anuncio.volume}</p>
                <p class="texto-liberado">Liberado para <strong>${compradorNome}</strong></p>
                ${dataLib ? `<p class="texto-data-lib">${dataLib}</p>` : ''}
            </div>
            <div class="card-perfil-acoes">
                <button class="btn-excluir" onclick="confirmarExclusao('${anuncio.id}')">Excluir</button>
                ${conversaId ? `<a href="chat.html?conversa=${conversaId}" class="btn-chat-prop">💬 Chat</a>` : ''}
            </div>
        </article>`;
}

// ── Abas ──────────────────────────────────────────────────────────────────────

function configurarAbas() {
    document.querySelectorAll('.btn-aba').forEach(btn => {
        btn.addEventListener('click', () => {
            const aba = btn.dataset.aba;
            document.querySelectorAll('.btn-aba').forEach(b => {
                b.classList.remove('ativa');
                b.setAttribute('aria-selected', 'false');
            });
            document.querySelectorAll('.painel-aba').forEach(p => p.classList.remove('ativo'));
            btn.classList.add('ativa');
            btn.setAttribute('aria-selected', 'true');
            document.getElementById(`aba-${aba}`)?.classList.add('ativo');
        });
    });
}

// ── Campos condicionais do formulário de anúncio ──────────────────────────────

function configurarCamposCondicionalAnuncio() {
    const checkRestrito     = document.getElementById('restritoParaONGs');
    const wrapHorarios      = document.getElementById('wrapHorarios');
    const inputInicio       = document.getElementById('horarioRetiradaInicio');
    const inputFim          = document.getElementById('horarioRetiradaFim');
    const isOng             = ehONG();

    if (!wrapHorarios) return;

    function aplicarEstadoHorarios(mostrar) {
        wrapHorarios.style.display = mostrar ? 'block' : 'none';
        if (inputInicio) inputInicio.required = mostrar;
        if (inputFim)    inputFim.required    = mostrar;
    }

    // ONG: campos de horário sempre visíveis e obrigatórios
    if (isOng) {
        aplicarEstadoHorarios(true);
        if (checkRestrito) {
            checkRestrito.parentElement.style.display = 'flex'; // mostra checkbox para ONG
        }
    } else {
        // Usuário comum: horários só aparecem quando checkbox restrito é marcado
        aplicarEstadoHorarios(false);
    }

    if (checkRestrito) {
        checkRestrito.addEventListener('change', () => {
            if (!isOng) aplicarEstadoHorarios(checkRestrito.checked);
        });
    }
}

// ── Formulário de anúncio ─────────────────────────────────────────────────────

function configurarFormAnuncio() {
    const form = document.getElementById('formAnuncio');
    if (!form) return;

    form.addEventListener('submit', async e => {
        e.preventDefault();

        const titulo    = document.getElementById('tituloAnuncio').value;
        const categoria = document.getElementById('categoriaAnuncio').value;
        const duracao   = document.getElementById('duracaoAnuncio').value;
        const descricao = document.getElementById('descricaoAnuncio').value;
        const volume    = document.getElementById('volumeAnuncio').value;
        const restrito  = document.getElementById('restritoParaONGs')?.checked || false;
        const inicio    = document.getElementById('horarioRetiradaInicio')?.value || '';
        const fim       = document.getElementById('horarioRetiradaFim')?.value || '';
        const usuarioPerfil = getUsuarioLogado();
        const endereco  = formatarEnderecoPerfil(usuarioPerfil);

        if (!titulo || !categoria || !duracao || !descricao || !volume) {
            mostrarFeedback('feedbackAnuncio', 'Preencha todos os campos obrigatórios.', 'error');
            return;
        }

        if (!endereco) {
            mostrarFeedback('feedbackAnuncio', 'Complete seu perfil com CEP, rua, número, cidade e estado antes de publicar um anúncio.', 'error');
            return;
        }
        if (titulo.length > 100) {
            mostrarFeedback('feedbackAnuncio', 'Título deve ter no máximo 100 caracteres.', 'error');
            return;
        }
        if (descricao.length > 500) {
            mostrarFeedback('feedbackAnuncio', 'Descrição deve ter no máximo 500 caracteres.', 'error');
            return;
        }

        const camposHorarioVisiveis = document.getElementById('wrapHorarios')?.style.display !== 'none';
        if (camposHorarioVisiveis && (!inicio || !fim)) {
            mostrarFeedback('feedbackAnuncio', 'Informe os horários de retirada.', 'error');
            return;
        }

        mostrarFeedback('feedbackAnuncio', 'Salvando...', 'loading');

        const dados = { titulo, categoria, duracao, descricao, volume, endereco, imagens: imagensNovasUpload,
                        restritoParaONGs: restrito, horarioRetiradaInicio: inicio || null, horarioRetiradaFim: fim || null };

        const resultado = anuncioEmEdicao ? editarAnuncio(anuncioEmEdicao, dados) : criarAnuncio(dados);

        if (resultado.sucesso) {
            mostrarFeedback('feedbackAnuncio', anuncioEmEdicao ? 'Anúncio atualizado!' : 'Anúncio publicado!', 'success');
            setTimeout(() => { fecharAnuncio(); renderizarAnunciosPerfil(); }, 800);
        } else {
            mostrarFeedback('feedbackAnuncio', resultado.erro, 'error');
        }
    });
}

function configurarUploadImagens() {
    const input = document.getElementById('inputImagens');
    if (!input) return;
    input.addEventListener('change', async () => {
        if (!input.files.length) return;
        mostrarFeedback('feedbackAnuncio', 'Processando imagens...', 'loading');
        imagensNovasUpload = await processarImagensUpload(input.files);
        renderizarPreviewImagens(imagensNovasUpload);
        esconderFeedback('feedbackAnuncio');
    });
}

function renderizarPreviewImagens(imagens) {
    const container = document.getElementById('previewImagens');
    if (!container) return;
    container.innerHTML = imagens.map((src, i) => `
        <div class="preview-img">
            <img src="${src}" alt="Preview ${i + 1}">
            <button type="button" onclick="removerPreviewImagem(${i})">×</button>
        </div>
    `).join('');
}

function removerPreviewImagem(idx) {
    imagensNovasUpload.splice(idx, 1);
    renderizarPreviewImagens(imagensNovasUpload);
}

function addAnuncio() {
    anuncioEmEdicao = null;
    imagensNovasUpload = [];
    document.getElementById('formAnuncio')?.reset();
    document.getElementById('previewImagens').innerHTML = '';
    document.getElementById('modalTitulo').textContent = 'Anunciar novo item';
    esconderFeedback('feedbackAnuncio');
    // Reaplica estado dos campos condicionais após reset
    configurarCamposCondicionalAnuncio();

    const usuario = getUsuarioLogado();

    document.getElementById('anuncio').classList.remove('desativar');
    document.getElementById('menu')?.classList.remove('fixar');

    if (!temEnderecoPerfilCompleto(usuario)) {
        mostrarFeedback('feedbackAnuncio', 'Complete os dados de CEP, rua, número, cidade e estado no seu perfil para que o endereço apareça no anúncio.', 'info');
    }
}

function fecharAnuncio() {
    document.getElementById('anuncio').classList.add('desativar');
    document.getElementById('menu')?.classList.add('fixar');
    anuncioEmEdicao = null;
    imagensNovasUpload = [];
}

function abrirEdicao(id) {
    const anuncio = getAnuncioById(id);
    if (!anuncio) return;

    anuncioEmEdicao = id;
    imagensNovasUpload = [];
    document.getElementById('modalTitulo').textContent = 'Editar anúncio';
    document.getElementById('tituloAnuncio').value    = anuncio.titulo;
    document.getElementById('categoriaAnuncio').value = anuncio.categoria;
    document.getElementById('duracaoAnuncio').value   = anuncio.duracao;
    document.getElementById('descricaoAnuncio').value = anuncio.descricao;
    document.getElementById('volumeAnuncio').value    = anuncio.volume;

    const checkRestrito = document.getElementById('restritoParaONGs');
    if (checkRestrito) checkRestrito.checked = anuncio.restritoParaONGs || false;

    const inputInicio = document.getElementById('horarioRetiradaInicio');
    const inputFim    = document.getElementById('horarioRetiradaFim');
    if (inputInicio) inputInicio.value = anuncio.horarioRetiradaInicio || '';
    if (inputFim)    inputFim.value    = anuncio.horarioRetiradaFim || '';

    // Reaplica visibilidade dos campos condicionais
    const wrapHorarios = document.getElementById('wrapHorarios');
    if (wrapHorarios) {
        const mostrar = ehONG() || (anuncio.restritoParaONGs);
        wrapHorarios.style.display = mostrar ? 'block' : 'none';
    }

    if (anuncio.imagens.length > 0) {
        imagensNovasUpload = [...anuncio.imagens];
        renderizarPreviewImagens(imagensNovasUpload);
    }

    document.getElementById('anuncio').classList.remove('desativar');
    document.getElementById('menu')?.classList.remove('fixar');
}

function confirmarExclusao(id) {
    if (!confirm('Tem certeza que deseja excluir este anúncio?\nTodos os usuários com propostas serão notificados.')) return;

    const anuncio = getAnuncioById(id);
    const vendor  = getUsuarioLogado();

    if (anuncio) {
        const propostas          = anuncio.propostas || [];
        const proponentesNotif   = new Set();

        propostas.forEach(p => {
            if (proponentesNotif.has(p.usuarioId)) return;
            proponentesNotif.add(p.usuarioId);

            const notif = {
                id:             gerarUUID(),
                destinatarioId: p.usuarioId,
                tipo:           'anuncio_removido',
                anuncioId:      id,
                anuncioTitulo:  anuncio.titulo,
                remetenteNome:  vendor?.nome || 'Anunciante',
                detalhes:       `O anúncio "${truncarTexto(anuncio.titulo, 40)}" foi removido pelo anunciante.`,
                timestamp:      Date.now(),
                lida:           false
            };
            adicionarNotificacao(notif);
            emitirNotificacao(p.usuarioId, notif);
        });

        emitirAnuncioDeletado([...proponentesNotif], anuncio.titulo);
    }

    deletarAnuncio(id);
    renderizarAnunciosPerfil();
}

// ── Modal de propostas recebidas ──────────────────────────────────────────────

let _anuncioPropostasAtual = null;

function verPropostas(anuncioId) {
    _anuncioPropostasAtual = anuncioId;
    const anuncio = getAnuncioById(anuncioId);
    if (!anuncio) return;

    const propostas = getPropostasByAnuncio(anuncioId);
    const container = document.getElementById('listaPropostas');
    const titulo    = document.getElementById('tituloModalPropostas');

    if (titulo) titulo.textContent = `Propostas — ${truncarTexto(anuncio.titulo, 40)}`;

    if (container) {
        if (propostas.length === 0) {
            container.innerHTML = '<p class="estado-vazio">Nenhuma proposta recebida ainda.</p>';
        } else {
            container.innerHTML = propostas.map(p => renderizarItemProposta(anuncioId, p)).join('');
        }
    }

    document.getElementById('modalPropostas').classList.remove('desativar');
    document.getElementById('menu')?.classList.remove('fixar');
}

function fecharModalPropostas() {
    document.getElementById('modalPropostas').classList.add('desativar');
    document.getElementById('menu')?.classList.add('fixar');
    _anuncioPropostasAtual = null;
}

function renderizarItemProposta(anuncioId, p) {
    const proponente = buscarUsuarioPorId(p.usuarioId);
    const nome       = proponente ? proponente.nome : 'Desconhecido';
    const tipoLabel  = getLabelProposta(p.tipo);
    const valorText  = (p.valor && p.valor > 0)
        ? p.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : '';
    // Garantir que status não tem espaços
    const status = (p.status || '').trim();
    const statusClass = { pendente: 'status-pendente', aceita: 'status-aceita', recusada: 'status-recusada' }[status] || '';
    const dataStr = new Date(p.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

    const chatLink = status === 'aceita'
        ? `<a href="chat.html?conversa=${anuncioId}::${p.usuarioId}" class="btn-chat-prop">💬 Chat</a>`
        : '';

    const acoes = status === 'pendente' ? `
        <div class="proposta-acoes">
            <button class="btn-aceitar" onclick="aceitarProposta('${anuncioId}','${p.id}','${p.usuarioId}')">Aceitar</button>
            <button class="btn-recusar" onclick="recusarProposta('${anuncioId}','${p.id}','${p.usuarioId}')">Recusar</button>
        </div>`
        : chatLink ? `<div class="proposta-acoes">${chatLink}</div>` : '';

    return `
        <div class="item-proposta">
            <div class="proposta-header">
                <strong>${nome}</strong>
                <span class="status-proposta ${statusClass}">${status}</span>
            </div>
            <p class="proposta-tipo">${tipoLabel}${valorText ? ` · <strong>${valorText}</strong>` : ''}</p>
            <p class="proposta-data">${dataStr}</p>
            ${acoes}
        </div>`;
}

function _posAcaoPropostaRenderizar(anuncioId) {
    if (window.location.pathname.includes('detalhes-anuncio.html')) {
        const anuncio = getAnuncioById(anuncioId);
        if (anuncio) renderizarDetalhes(anuncio);
    } else {
        verPropostas(anuncioId);
        renderizarAnunciosPerfil();
    }
}

function aceitarProposta(anuncioId, propostaId, proponenteId) {
    const resultado = aceitarPropostaComRejeicao(anuncioId, propostaId);
    if (!resultado.sucesso) return;

    const anuncio    = getAnuncioById(anuncioId);
    const vendor     = getUsuarioLogado();
    const conversaId = `${anuncioId}::${proponenteId}`;

    // Notifica o proponente aceito (com conversaId para abrir o chat)
    const notifAceita = {
        id:             gerarUUID(),
        destinatarioId: proponenteId,
        tipo:           'proposta_aceita',
        anuncioId,
        anuncioTitulo:  anuncio?.titulo || '',
        remetenteNome:  vendor?.nome || '',
        conversaId,
        detalhes:       'Sua proposta foi aceita! Clique em "Chat" para conversar.',
        timestamp:      Date.now(),
        lida:           false
    };
    adicionarNotificacao(notifAceita);
    emitirNotificacao(proponenteId, notifAceita);
    emitirStatusProposta(proponenteId, { anuncioId, anuncioTitulo: anuncio?.titulo || '', status: 'aceita' });

    // Notifica cada proponente rejeitado automaticamente
    resultado.rejeitados.forEach(({ usuarioId }) => {
        const notifRecusada = {
            id:             gerarUUID(),
            destinatarioId: usuarioId,
            tipo:           'proposta_recusada',
            anuncioId,
            anuncioTitulo:  anuncio?.titulo || '',
            remetenteNome:  vendor?.nome || '',
            detalhes:       'Outra proposta foi selecionada para este anúncio.',
            timestamp:      Date.now(),
            lida:           false
        };
        adicionarNotificacao(notifRecusada);
        emitirNotificacao(usuarioId, notifRecusada);
        emitirStatusProposta(usuarioId, { anuncioId, anuncioTitulo: anuncio?.titulo || '', status: 'recusada' });
    });

    _posAcaoPropostaRenderizar(anuncioId);
}

function recusarProposta(anuncioId, propostaId, proponenteId) {
    atualizarStatusProposta(anuncioId, propostaId, 'recusada');
    const anuncio = getAnuncioById(anuncioId);
    const notif = {
        id:             gerarUUID(),
        destinatarioId: proponenteId,
        tipo:           'proposta_recusada',
        anuncioId,
        anuncioTitulo:  anuncio?.titulo || '',
        remetenteNome:  getUsuarioLogado()?.nome || '',
        detalhes:       'Sua proposta foi recusada.',
        timestamp:      Date.now(),
        lida:           false
    };
    adicionarNotificacao(notif);
    emitirNotificacao(proponenteId, notif);
    emitirStatusProposta(proponenteId, { anuncioId, anuncioTitulo: anuncio?.titulo || '', status: 'recusada' });
    _posAcaoPropostaRenderizar(anuncioId);
}

// ── Notificações no perfil ────────────────────────────────────────────────────

function renderizarNotificacoesPerfil() {
    const usuario = getUsuarioLogado();
    if (!usuario) return;

    const notifs  = getNotificacoesByDestinatario(usuario.usuarioId)
        .sort((a, b) => b.timestamp - a.timestamp);
    const container = document.getElementById('listaNotificacoes');
    const totalEl   = document.getElementById('totalNotificacoes');
    const naoLidas  = notifs.filter(n => !n.lida).length;

    if (totalEl) totalEl.textContent = naoLidas > 0 ? naoLidas : notifs.length;

    if (!container) return;
    if (notifs.length === 0) {
        container.innerHTML = '<p class="estado-vazio">Nenhuma notificação.</p>';
        return;
    }

    const icones = {
        nova_proposta:              '📬',
        novo_interesse:             '✋',
        proposta_aceita:            '✅',
        proposta_recusada:          '❌',
        proposta_cancelada:         '🚫',
        anuncio_removido:           '🗑️',
        proposta_vencedora:         '🏆',
        proposta_vencedora_vendedor:'🏆',
        negociacao_confirmada:      '🤝',
        negociacao_recusada:        '❌',
        venda_liberada:             '🔓'
    };

    container.innerHTML = notifs.map(n => {
        const chatBtn = ((n.tipo === 'proposta_aceita' || n.tipo === 'negociacao_confirmada' || n.tipo === 'venda_liberada') && n.conversaId)
            ? `<a href="chat.html?conversa=${n.conversaId}" class="btn-chat-notif" onclick="event.stopPropagation()">💬 Chat</a>`
            : '';

        // Botões de confirmar/recusar acordo (somente para proposta_vencedora*)
        let acaoNeg = '';
        if (n.tipo === 'proposta_vencedora' || n.tipo === 'proposta_vencedora_vendedor') {
            const anuncioN = getAnuncioById(n.anuncioId);
            if (anuncioN?.negociacaoFinal) {
                const neg         = anuncioN.negociacaoFinal;
                const ehComprador = neg.proponenteId === usuario.usuarioId;
                const papel       = ehComprador ? 'comprador' : 'vendedor';
                const jaConfirmou = ehComprador ? neg.compradorConfirmou !== null : neg.vendedorConfirmou !== null;
                if (anuncioN.situacao === 'aguardando_confirmacao' && !jaConfirmou) {
                    acaoNeg = `<div class="neg-acoes-notif" onclick="event.stopPropagation()">
                        <button class="btn-confirmar-neg" onclick="confirmarAcordo('${n.anuncioId}','${papel}',true)">✅ Confirmar</button>
                        <button class="btn-recusar-neg"   onclick="confirmarAcordo('${n.anuncioId}','${papel}',false)">❌ Recusar</button>
                    </div>`;
                } else if (anuncioN.situacao === 'negociado' && ehComprador) {
                    const conversaId = `${n.anuncioId}::${usuario.usuarioId}`;
                    acaoNeg = `<a href="chat.html?conversa=${conversaId}" class="btn-chat-notif" onclick="event.stopPropagation()">💬 Chat</a>`;
                }
            }
        }

        return `
        <div class="item-notif ${n.lida ? 'lida' : 'nao-lida'}" onclick="marcarNotificacaoLida('${n.id}'); renderizarNotificacoesPerfil(); atualizarBadgeNotif();">
            <span class="notif-icone">${icones[n.tipo] || '🔔'}</span>
            <div class="notif-corpo">
                <p><strong>${n.remetenteNome}</strong> — ${n.detalhes}</p>
                <p class="notif-anuncio">Anúncio: ${truncarTexto(n.anuncioTitulo, 40)}</p>
                <p class="notif-data">${new Date(n.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                ${chatBtn}
                ${acaoNeg}
            </div>
            ${!n.lida ? '<span class="notif-ponto"></span>' : ''}
        </div>`;
    }).join('');
}

function marcarTodasNotificacoesLidas() {
    const usuario = getUsuarioLogado();
    if (!usuario) return;
    marcarTodasLidas(usuario.usuarioId);
    renderizarNotificacoesPerfil();
    atualizarBadgeNotif();
}

function atualizarBadgeNotif() {
    const usuario = getUsuarioLogado();
    if (!usuario) return;
    const naoLidas = contarNaoLidas(usuario.usuarioId);
    const totalEl  = document.getElementById('totalNotificacoes');
    if (totalEl) totalEl.textContent = naoLidas > 0 ? naoLidas : getNotificacoesByDestinatario(usuario.usuarioId).length;
}

// ══════════════════════════════════════════════════════════════════════════════
// DETALHES DO ANÚNCIO
// ══════════════════════════════════════════════════════════════════════════════

let indiceCarrossel = 0;

function initDetalhes() {
    atualizarMenuPerfil();
    inicializarRealtime();
    _processarNovasExpiracoes();
    const params  = new URLSearchParams(window.location.search);
    const id      = params.get('id');
    if (!id) { mostrarErroDetalhes('ID do anúncio não informado.'); return; }

    const anuncio = getAnuncioById(id);
    if (!anuncio) { mostrarErroDetalhes('Anúncio não encontrado.'); return; }
    if (!anuncio.ativo) { mostrarErroDetalhes('Este anúncio não está mais disponível.'); return; }

    renderizarDetalhes(anuncio);
}

function mostrarErroDetalhes(msg) {
    const c = document.getElementById('conteudoDetalhes');
    if (c) c.innerHTML = `
        <div class="erro-detalhes">
            <p>${msg}</p>
            <a href="../index.html" class="btn-voltar">← Voltar</a>
        </div>`;
}

function renderizarDetalhes(anuncio) {
    const usuario     = buscarUsuarioPorId(anuncio.usuarioId);
    const { diasRestantes } = calcularDestaqueInfo(anuncio);
    const pctDecorrido = Math.round(
        (1 - calcularPorcentagemRestante(anuncio.dataPublicacao, anuncio.dataExpiracao)) * 100
    );
    const imagens = anuncio.imagens.length > 0 ? anuncio.imagens : [IMG_PLACEHOLDER];

    const horarioHtml = (anuncio.horarioRetiradaInicio && anuncio.horarioRetiradaFim)
        ? `<div class="horario-detalhe">
              <h3>Horário de Retirada</h3>
              <p>${formatarHorario(anuncio.horarioRetiradaInicio)} até ${formatarHorario(anuncio.horarioRetiradaFim)}</p>
           </div>`
        : '';

    const enderecoExibido = anuncio.endereco || formatarEnderecoPerfil(usuario);
    const enderecoHtml = enderecoExibido
        ? `<div class="endereco-detalhe">
               <h3>Endereço para retirada</h3>
               <p>📍 ${enderecoExibido}</p>
           </div>`
        : '';

    document.getElementById('conteudoDetalhes').innerHTML = `
        <div class="detalhes-layout">
            <div class="galeria">
                <div class="carrossel" id="carrossel">
                    ${imagens.map((src, i) => `
                        <img src="${src}" class="slide-img ${i === 0 ? 'ativo' : ''}" alt="Imagem ${i + 1}" data-idx="${i}">
                    `).join('')}
                </div>
                ${imagens.length > 1 ? `
                <div class="carrossel-controles">
                    <button onclick="moverCarrossel(-1)" aria-label="Anterior">&#8249;</button>
                    <span id="indicadorCarrossel">1 / ${imagens.length}</span>
                    <button onclick="moverCarrossel(1)" aria-label="Próximo">&#8250;</button>
                </div>
                <div class="carrossel-thumbs">
                    ${imagens.map((src, i) => `
                        <img src="${src}" class="thumb ${i === 0 ? 'ativa' : ''}" onclick="irParaSlide(${i})" alt="Thumb ${i + 1}">
                    `).join('')}
                </div>` : ''}
            </div>

            <div class="info-detalhes">
                <div class="info-topo">
                    <div class="badges-linha">
                        <span class="badge-categoria" style="background:${getCoresCategoria(anuncio.categoria)}">${getNomeCategoria(anuncio.categoria)}</span>
                        ${anuncio.restritoParaONGs ? '<span class="badge-ong">Exclusivo ONGs</span>' : ''}
                    </div>
                    <h1>${anuncio.titulo}</h1>
                    <p class="volume-detalhe">Quantidade: <strong>${anuncio.volume}</strong></p>
                </div>
                <div class="descricao-detalhe">
                    <h3>Descrição</h3>
                    <p>${anuncio.descricao}</p>
                </div>
                ${horarioHtml}
                ${enderecoHtml}
                <div class="anunciante-detalhe">
                    <h3>Anunciante</h3>
                    <p>${usuario ? usuario.nome : 'Desconhecido'}</p>
                    <p>Publicado em ${formatarData(anuncio.dataPublicacao)}</p>
                </div>
                <div class="duracao-detalhe">
                    <h3>Duração do anúncio</h3>
                    <div class="barra-progresso">
                        <div class="barra-progresso-fill ${pctDecorrido >= 70 ? 'barra-urgente' : ''}" style="width:${pctDecorrido}%"></div>
                    </div>
                    <p class="texto-dias">${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''} restante${diasRestantes !== 1 ? 's' : ''} de ${anuncio.duracao === 1 ? '24 horas' : `${anuncio.duracao} dias`}</p>
                </div>
                ${renderizarSecaoInteresse(anuncio)}
                <a href="../index.html" class="btn-voltar">← Voltar aos anúncios</a>
            </div>
        </div>`;

    indiceCarrossel = 0;
    configurarFormInteresse(anuncio);
}

// ── Seção de interesse / proposta (condicional) ───────────────────────────────

function renderizarSecaoInteresse(anuncio) {
    const usuarioAtual = getUsuarioLogado();

    if (!usuarioAtual) {
        return `<div class="secao-proposta">
            <p class="aviso-login">Faça <a href="cadastro.html">login</a> para demonstrar interesse neste anúncio.</p>
        </div>`;
    }

    const ehDono = usuarioAtual.usuarioId === anuncio.usuarioId;
    if (ehDono) return renderizarPropostasRecebidas(anuncio);

    if (anuncio.restritoParaONGs && usuarioAtual.tipoPerfil !== 'ong') {
        return `<div class="secao-proposta secao-restrita">
            <p>🔒 Este anúncio é exclusivo para ONGs e Caridades cadastradas.</p>
        </div>`;
    }

    const jaEnviou = jaTemProposta(anuncio.id, usuarioAtual.usuarioId);
    if (jaEnviou) return renderizarPropostaJaEnviada(anuncio.id, usuarioAtual.usuarioId);

    if (anuncio.restritoParaONGs && usuarioAtual.tipoPerfil === 'ong') {
        return renderizarFormInteresseONG(anuncio);
    }

    return renderizarFormPropostas(anuncio);
}

function renderizarPropostasRecebidas(anuncio) {
    const propostas = getPropostasByAnuncio(anuncio.id);
    if (propostas.length === 0) {
        return `<div class="secao-proposta"><h3>Propostas recebidas</h3>
            <p class="estado-vazio">Nenhuma proposta ainda.</p></div>`;
    }
    return `<div class="secao-proposta">
        <h3>Propostas recebidas (${propostas.length})</h3>
        ${propostas.map(p => {
            // Garantir que status não tem espaços
            const status = (p.status || '').trim();
            
            const u        = buscarUsuarioPorId(p.usuarioId);
            const nome     = u ? u.nome : 'Desconhecido';
            const valorText = p.valor > 0 ? p.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
            const chatLink  = status === 'aceita'
                ? `<a href="chat.html?conversa=${anuncio.id}::${p.usuarioId}" class="btn-chat-prop">💬 Chat</a>`
                : '';
            const acoes = status === 'pendente'
                ? `<div class="proposta-acoes">
                       <button class="btn-aceitar" onclick="aceitarProposta('${anuncio.id}','${p.id}','${p.usuarioId}')">Aceitar</button>
                       <button class="btn-recusar" onclick="recusarProposta('${anuncio.id}','${p.id}','${p.usuarioId}')">Recusar</button>
                   </div>`
                : chatLink ? `<div class="proposta-acoes">${chatLink}</div>` : '';
            return `<div class="item-proposta mini">
                <div class="proposta-header">
                    <span><strong>${nome}</strong> — ${getLabelProposta(p.tipo)}${valorText ? ' · ' + valorText : ''}</span>
                    <span class="status-proposta status-${status}">${status}</span>
                </div>
                ${acoes}
            </div>`;
        }).join('')}
    </div>`;
}

function renderizarPropostaJaEnviada(anuncioId, usuarioId) {
    const propostas = getPropostasByAnuncio(anuncioId);
    const minha = propostas.find(p => p.usuarioId === usuarioId);
    if (!minha) return '';
    const valorText    = minha.valor > 0 ? minha.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
    const podeCancelar = minha.status === 'pendente';
    const chatLink     = minha.status === 'aceita'
        ? `<a href="chat.html?conversa=${anuncioId}::${usuarioId}" class="btn-chat-prop">💬 Acessar chat</a>`
        : '';
    return `<div class="secao-proposta">
        <h3>Sua proposta</h3>
        <div class="proposta-enviada">
            <p>${getLabelProposta(minha.tipo)}${valorText ? ` — <strong>${valorText}</strong>` : ''}</p>
            <span class="status-proposta status-${minha.status}">${minha.status}</span>
        </div>
        ${chatLink}
        ${podeCancelar ? `<button class="btn-cancelar-proposta" onclick="cancelarMinhaProposta('${anuncioId}')">Cancelar proposta</button>` : ''}
    </div>`;
}

function renderizarFormInteresseONG(anuncio) {
    return `
    <div class="secao-proposta">
        <h3>Demonstrar interesse</h3>
        <div id="feedbackProposta" class="feedback" style="display:none" role="alert"></div>
        <form id="formProposta" class="form-interesse-ong">
            <label class="checkbox-label">
                <input type="checkbox" id="checkInteresse" required>
                <span>Tenho interesse neste item</span>
            </label>
            <p class="aviso-confirmacao">Confirmo que aceito retirada no local no horário disponível
                ${anuncio.horarioRetiradaInicio ? `(${formatarHorario(anuncio.horarioRetiradaInicio)} – ${formatarHorario(anuncio.horarioRetiradaFim)})` : ''}
            </p>
            <button type="button" onclick="enviarInteresseONG('${anuncio.id}')">Confirmar interesse</button>
        </form>
    </div>`;
}

function renderizarFormPropostas(anuncio) {
    return `
    <div class="secao-proposta">
        <h3>Demonstrar interesse</h3>
        <div id="feedbackProposta" class="feedback" style="display:none" role="alert"></div>
        <form id="formProposta">
            <div class="radio-opcao">
                <label>
                    <input type="radio" name="tipoProposta" value="pago_retirada" id="r1">
                    Tenho interesse e pago
                </label>
                <div class="input-valor-wrap" id="wrapPago" style="display:none">
                    <input type="text" id="valorPago" class="input-dinheiro" placeholder="R$ 0,00" maxlength="15" aria-label="Valor pago">
                </div>
                <span class="radio-sufixo" id="sufixoPago" style="display:none">pelo(s) item(s), o qual irei retirar no endereço</span>
            </div>
            <div class="radio-opcao">
                <label>
                    <input type="radio" name="tipoProposta" value="gratis_retirada" id="r2">
                    Tenho interesse e posso retirar no local, mas não pago nada pelo item
                </label>
            </div>
            <div class="radio-opcao">
                <label>
                    <input type="radio" name="tipoProposta" value="cobro_retirada" id="r3">
                    Cobro
                </label>
                <div class="input-valor-wrap" id="wrapCobro" style="display:none">
                    <input type="text" id="valorCobro" class="input-dinheiro" placeholder="R$ 0,00" maxlength="15" aria-label="Valor cobrado">
                </div>
                <span class="radio-sufixo" id="sufixoCobro" style="display:none">para retirar o item no endereço e dar um destino apropriado para o mesmo</span>
            </div>
            <button type="button" onclick="enviarProposta('${anuncio.id}')">Enviar proposta</button>
        </form>
    </div>`;
}

function configurarFormInteresse(anuncio) {
    // Configura máscaras de dinheiro
    ['valorPago', 'valorCobro'].forEach(id => {
        const el = document.getElementById(id);
        if (el) configurarMascaraDinheiro(el);
    });

    // Mostra/oculta inputs de valor conforme radio selecionado
    document.querySelectorAll('input[name="tipoProposta"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const isPago  = radio.value === 'pago_retirada';
            const isCobro = radio.value === 'cobro_retirada';
            document.getElementById('wrapPago').style.display   = isPago  ? 'flex' : 'none';
            document.getElementById('sufixoPago').style.display = isPago  ? 'inline' : 'none';
            document.getElementById('wrapCobro').style.display  = isCobro ? 'flex' : 'none';
            document.getElementById('sufixoCobro').style.display= isCobro ? 'inline' : 'none';
        });
    });
}

function enviarInteresseONG(anuncioId) {
    const check = document.getElementById('checkInteresse');
    if (!check?.checked) {
        mostrarFeedback('feedbackProposta', 'Marque a caixa para confirmar seu interesse.', 'error');
        return;
    }
    _salvarPropostaENotificar(anuncioId, 'ong_interesse', null);
}

function enviarProposta(anuncioId) {
    const tipoSelecionado = document.querySelector('input[name="tipoProposta"]:checked');
    if (!tipoSelecionado) {
        mostrarFeedback('feedbackProposta', 'Selecione uma das opções.', 'error');
        return;
    }
    const tipo = tipoSelecionado.value;
    let valor  = null;

    if (tipo === 'pago_retirada') {
        valor = desformatarDinheiro(document.getElementById('valorPago')?.value);
        if (!valor || valor <= 0) {
            mostrarFeedback('feedbackProposta', 'Informe o valor que deseja pagar.', 'error');
            return;
        }
    }
    if (tipo === 'cobro_retirada') {
        valor = desformatarDinheiro(document.getElementById('valorCobro')?.value);
        if (!valor || valor <= 0) {
            mostrarFeedback('feedbackProposta', 'Informe o valor que irá cobrar.', 'error');
            return;
        }
    }

    _salvarPropostaENotificar(anuncioId, tipo, valor);
}

function _salvarPropostaENotificar(anuncioId, tipo, valor) {
    const usuarioAtual = getUsuarioLogado();
    const anuncio      = getAnuncioById(anuncioId);
    if (!usuarioAtual || !anuncio) return;

    const proposta = {
        id:        gerarUUID(),
        anuncioId,
        usuarioId: usuarioAtual.usuarioId,
        tipo,
        valor:     valor || 0,
        timestamp: Date.now(),
        status:    'pendente'
    };

    adicionarProposta(anuncioId, proposta);

    adicionarNotificacao({
        id:            gerarUUID(),
        destinatarioId: anuncio.usuarioId,
        tipo:          tipo === 'ong_interesse' ? 'novo_interesse' : 'nova_proposta',
        anuncioId,
        anuncioTitulo: anuncio.titulo,
        remetenteNome: usuarioAtual.nome,
        detalhes:      tipo === 'ong_interesse'
            ? `${usuarioAtual.nomeInstituicao || usuarioAtual.nome} demonstrou interesse`
            : `Nova proposta: ${getLabelProposta(tipo)}${valor > 0 ? ' — ' + valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''}`,
        timestamp:     Date.now(),
        lida:          false
    });

    mostrarFeedback('feedbackProposta', 'Enviado com sucesso!', 'success');
    setTimeout(() => {
        // Re-renderiza a seção de interesse com estado atualizado
        const anuncioAtualizado = getAnuncioById(anuncioId);
        const secao = document.querySelector('.secao-proposta');
        if (secao) secao.outerHTML = renderizarPropostaJaEnviada(anuncioId, usuarioAtual.usuarioId);
    }, 1200);
}

// ── Carrossel de imagens (página detalhes) ────────────────────────────────────

function irParaSlide(idx) {
    const slides = document.querySelectorAll('.slide-img');
    const thumbs = document.querySelectorAll('.carrossel-thumbs .thumb');
    if (!slides.length || idx === indiceCarrossel) return;

    slides[indiceCarrossel].classList.remove('ativo');
    thumbs[indiceCarrossel]?.classList.remove('ativa');
    indiceCarrossel = (idx + slides.length) % slides.length;
    slides[indiceCarrossel].classList.add('ativo');
    thumbs[indiceCarrossel]?.classList.add('ativa');

    const indicador = document.getElementById('indicadorCarrossel');
    if (indicador) indicador.textContent = `${indiceCarrossel + 1} / ${slides.length}`;
}

function moverCarrossel(direcao) {
    const slides = document.querySelectorAll('.slide-img');
    if (slides.length === 0) return;
    irParaSlide(indiceCarrossel + direcao);
}

// ══════════════════════════════════════════════════════════════════════════════
// EXCLUSÃO DE CONTA
// ══════════════════════════════════════════════════════════════════════════════

function excluirConta() {
    if (!confirm(
        'Tem certeza que deseja excluir sua conta?\n\n' +
        '• Todos os seus anúncios serão removidos\n' +
        '• Seus dados serão apagados permanentemente\n' +
        '• Usuários com propostas nos seus anúncios serão notificados\n\n' +
        'Esta ação não pode ser desfeita.'
    )) return;

    if (!confirm('CONFIRMAÇÃO FINAL: excluir conta permanentemente?')) return;

    const usuario = getUsuarioLogado();
    if (!usuario) return;

    // Notifica proponentes de todos os anúncios do usuário antes de apagar
    const anunciosDoUsuario = getAnunciosPorUsuario(usuario.usuarioId);
    anunciosDoUsuario.forEach(anuncio => {
        const proponentesVistos = new Set();
        (anuncio.propostas || []).forEach(p => {
            if (proponentesVistos.has(p.usuarioId)) return;
            proponentesVistos.add(p.usuarioId);

            const notif = {
                id:             gerarUUID(),
                destinatarioId: p.usuarioId,
                tipo:           'anuncio_removido',
                anuncioId:      anuncio.id,
                anuncioTitulo:  anuncio.titulo,
                remetenteNome:  usuario.nome,
                detalhes:       `O anúncio "${truncarTexto(anuncio.titulo, 40)}" foi removido (conta excluída).`,
                timestamp:      Date.now(),
                lida:           false
            };
            adicionarNotificacao(notif);
            emitirNotificacao(p.usuarioId, notif);
        });
        if (proponentesVistos.size > 0) {
            emitirAnuncioDeletado([...proponentesVistos], anuncio.titulo);
        }
    });

    // Exclui conta do DB
    excluirContaUsuario(usuario.usuarioId);

    // Encerra sessão e redireciona
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = '../index.html';
}

// ══════════════════════════════════════════════════════════════════════════════
// CANCELAMENTO DE PROPOSTA
// ══════════════════════════════════════════════════════════════════════════════

function cancelarMinhaProposta(anuncioId) {
    if (!confirm('Tem certeza que deseja cancelar sua proposta?')) return;
    const usuario = getUsuarioLogado();
    const anuncio = getAnuncioById(anuncioId);
    if (!usuario || !anuncio) return;

    const ok = cancelarPropostaPorUsuario(anuncioId, usuario.usuarioId);
    if (!ok) { mostrarFeedback('feedbackProposta', 'Não foi possível cancelar a proposta.', 'error'); return; }

    // Notifica o dono do anúncio
    const notif = {
        id:             gerarUUID(),
        destinatarioId: anuncio.usuarioId,
        tipo:           'proposta_cancelada',
        anuncioId,
        anuncioTitulo:  anuncio.titulo,
        remetenteNome:  usuario.nome,
        detalhes:       `${usuario.nome} cancelou sua proposta em "${truncarTexto(anuncio.titulo, 35)}".`,
        timestamp:      Date.now(),
        lida:           false
    };
    adicionarNotificacao(notif);
    emitirNotificacao(anuncio.usuarioId, notif);

    // Re-renderiza a seção (proposta removida → form aparece novamente)
    if (window.location.pathname.includes('detalhes-anuncio.html')) {
        const anuncioAtualizado = getAnuncioById(anuncioId);
        if (anuncioAtualizado) renderizarDetalhes(anuncioAtualizado);
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// NEGOCIAÇÃO FINAL (PÓS-EXPIRAÇÃO)
// ══════════════════════════════════════════════════════════════════════════════

function _emitirNotificacoesNegociacao(resultado) {
    const { anuncioId, anuncioTitulo, anuncioUsuarioId, vencedor } = resultado;
    const comprador     = buscarUsuarioPorId(vencedor.usuarioId);
    const vendedor      = buscarUsuarioPorId(anuncioUsuarioId);
    const compradorNome = comprador?.nome || 'Interessado';
    const vendedorNome  = vendedor?.nome  || 'Anunciante';
    const valorText     = vencedor.valor > 0
        ? vencedor.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : '';

    const notifComprador = {
        id:             gerarUUID(),
        destinatarioId: vencedor.usuarioId,
        tipo:           'proposta_vencedora',
        anuncioId,
        anuncioTitulo,
        remetenteNome:  vendedorNome,
        detalhes:       `Sua proposta foi a vencedora para "${truncarTexto(anuncioTitulo, 35)}"! Confirme o acordo.`,
        timestamp:      Date.now(),
        lida:           false
    };
    adicionarNotificacao(notifComprador);
    emitirNotificacao(vencedor.usuarioId, notifComprador);

    const notifVendedor = {
        id:             gerarUUID(),
        destinatarioId: anuncioUsuarioId,
        tipo:           'proposta_vencedora_vendedor',
        anuncioId,
        anuncioTitulo,
        remetenteNome:  compradorNome,
        detalhes:       `Seu anúncio expirou. Vencedor: ${compradorNome}${valorText ? ' — ' + valorText : ''}. Confirme o acordo na aba Expirados.`,
        timestamp:      Date.now(),
        lida:           false
    };
    adicionarNotificacao(notifVendedor);
    emitirNotificacao(anuncioUsuarioId, notifVendedor);
}

function _processarNovasExpiracoes() {
    if (!_recemExpiradosIds.length) return;
    const ids          = [..._recemExpiradosIds];
    _recemExpiradosIds = [];

    ids.forEach(id => {
        const resultado = iniciarNegociacaoFinal(id);
        if (resultado) _emitirNotificacoesNegociacao(resultado);
    });

    if (typeof renderizarAnunciosPerfil === 'function') renderizarAnunciosPerfil();
    if (typeof renderizarNotificacoesPerfil === 'function') renderizarNotificacoesPerfil();
    if (typeof atualizarBadgeNotif === 'function') atualizarBadgeNotif();
}

function confirmarAcordo(anuncioId, papel, decisao) {
    const anuncio = getAnuncioById(anuncioId);
    if (!anuncio?.negociacaoFinal) return;

    const resultado    = processarConfirmacaoNegociacao(anuncioId, papel, decisao);
    if (!resultado) return;

    const vendedorId   = anuncio.usuarioId;
    const compradorId  = anuncio.negociacaoFinal.proponenteId;

    emitirConfirmacaoNegociacao(vendedorId, compradorId, {
        anuncioId, papel, decisao, situacao: resultado, vendedorId, compradorId
    });

    if (resultado === 'negociado') {
        const conversaId   = `${anuncioId}::${compradorId}`;
        const vendedor     = buscarUsuarioPorId(vendedorId);
        const comprador    = buscarUsuarioPorId(compradorId);
        const detalheMsg   = `Acordo confirmado para "${truncarTexto(anuncio.titulo, 35)}"! Acesse o chat.`;

        [
            { id: compradorId, nome: vendedor?.nome  || 'Anunciante' },
            { id: vendedorId,  nome: comprador?.nome || 'Interessado' }
        ].forEach(({ id, nome }) => {
            const notif = {
                id:             gerarUUID(),
                destinatarioId: id,
                tipo:           'negociacao_confirmada',
                anuncioId,
                anuncioTitulo:  anuncio.titulo,
                remetenteNome:  nome,
                conversaId,
                detalhes:       detalheMsg,
                timestamp:      Date.now(),
                lida:           false
            };
            adicionarNotificacao(notif);
            emitirNotificacao(id, notif);
        });

    } else if (resultado === 'sem_acordo') {
        const vendedor   = buscarUsuarioPorId(vendedorId);
        const comprador  = buscarUsuarioPorId(compradorId);
        const recusouNome = papel === 'vendedor' ? (vendedor?.nome || 'Anunciante') : (comprador?.nome || 'Interessado');
        const detalheMsg  = `Acordo não confirmado para "${truncarTexto(anuncio.titulo, 35)}".`;

        [compradorId, vendedorId].forEach(id => {
            const notif = {
                id:             gerarUUID(),
                destinatarioId: id,
                tipo:           'negociacao_recusada',
                anuncioId,
                anuncioTitulo:  anuncio.titulo,
                remetenteNome:  recusouNome,
                detalhes:       detalheMsg,
                timestamp:      Date.now(),
                lida:           false
            };
            adicionarNotificacao(notif);
            emitirNotificacao(id, notif);
        });
    }

    renderizarAnunciosPerfil();
    renderizarNotificacoesPerfil();
    atualizarBadgeNotif();
}

function renderizarConversasPerfil() {
    const usuario   = getUsuarioLogado();
    const container = document.getElementById('listaConversas');
    const totalEl   = document.getElementById('totalConversas');
    if (!usuario || !container) return;

    const conversas = getConversasDoUsuario(usuario.usuarioId);
    if (totalEl) totalEl.textContent = conversas.length;

    if (!conversas.length) {
        container.innerHTML = '<p class="estado-vazio">Nenhuma conversa ativa. Aceite uma proposta para iniciar um chat.</p>';
        return;
    }

    container.innerHTML = conversas.map(c => {
        const anuncio    = getAnuncioById(c.anuncioId);
        const eLiberado  = anuncio?.situacao === 'liberado';
        return `
        <div class="conversa-card ${eLiberado ? 'conversa-liberada' : ''}">
            ${eLiberado ? '<span class="etiqueta-liberado">Liberado</span>' : ''}
            <span class="conversa-icon">💬</span>
            <div class="conversa-info">
                <h4>${truncarTexto(c.anuncioTitulo, 45)}</h4>
                <p>Com: <strong>${c.outroUsuarioNome}</strong></p>
            </div>
            <span class="conversa-papel">${c.papel === 'vendedor' ? 'Vendedor' : 'Interessado'}</span>
            <a href="chat.html?conversa=${c.id}" class="btn-abrir-chat">Abrir chat</a>
        </div>`;
    }).join('');
}
