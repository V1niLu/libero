const SESSION_KEY = 'libero_sessao';

function fazerLogin(email, senha) {
    if (!validarEmail(email)) return { sucesso: false, erro: 'Email inválido.' };

    const usuario = buscarUsuarioPorEmail(email);
    if (!usuario || usuario.senha !== hashSenha(senha)) {
        return { sucesso: false, erro: 'Email ou senha incorretos.' };
    }

    const sessao = {
        usuarioId:       usuario.id,
        nome:            usuario.nome,
        email:           usuario.email,
        tipoPerfil:      usuario.tipoPerfil || 'comum',
        nomeInstituicao: usuario.nomeInstituicao || null,
        telefone:        usuario.telefone || '',
        cep:             usuario.cep || '',
        rua:             usuario.rua || '',
        numero:          usuario.numero || '',
        cidade:          usuario.cidade || '',
        estado:          usuario.estado || ''
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessao));
    return { sucesso: true, usuario: sessao };
}

function fazerCadastro(nome, email, senha, confirmacao, tipoPerfil, nomeInstituicao) {
    if (!nome || nome.trim().length < 2)
        return { sucesso: false, erro: 'Nome deve ter pelo menos 2 caracteres.' };
    if (!validarEmail(email))
        return { sucesso: false, erro: 'Email inválido.' };
    if (buscarUsuarioPorEmail(email))
        return { sucesso: false, erro: 'Este email já está cadastrado.' };
    if (!validarSenha(senha))
        return { sucesso: false, erro: 'Senha deve ter pelo menos 6 caracteres.' };
    if (senha !== confirmacao)
        return { sucesso: false, erro: 'As senhas não coincidem.' };

    const tipo = tipoPerfil === 'ong' ? 'ong' : 'comum';
    if (tipo === 'ong' && (!nomeInstituicao || nomeInstituicao.trim().length < 2))
        return { sucesso: false, erro: 'Nome da instituição é obrigatório para ONGs.' };

    const usuario = {
        id:              gerarUUID(),
        nome:            nome.trim(),
        email:           email.toLowerCase().trim(),
        senha:           hashSenha(senha),
        dataCadastro:    Date.now(),
        tipoPerfil:      tipo,
        nomeInstituicao: tipo === 'ong' ? nomeInstituicao.trim() : null,
        telefone:        '',
        cep:             '',
        rua:             '',
        numero:          '',
        cidade:          '',
        estado:          ''
    };

    salvarUsuario(usuario);

    const sessao = {
        usuarioId:       usuario.id,
        nome:            usuario.nome,
        email:           usuario.email,
        tipoPerfil:      usuario.tipoPerfil,
        nomeInstituicao: usuario.nomeInstituicao,
        telefone:        usuario.telefone,
        cep:             usuario.cep,
        rua:             usuario.rua,
        numero:          usuario.numero,
        cidade:          usuario.cidade,
        estado:          usuario.estado
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessao));
    return { sucesso: true, usuario: sessao };
}

function fazerLogout() {
    sessionStorage.removeItem(SESSION_KEY);
    const isInPages = window.location.pathname.includes('/pages/');
    window.location.href = isInPages ? 'cadastro.html' : 'pages/cadastro.html';
}

function getUsuarioLogado() {
    try {
        const sessao = sessionStorage.getItem(SESSION_KEY);
        return sessao ? JSON.parse(sessao) : null;
    } catch {
        return null;
    }
}

function estaLogado() {
    return getUsuarioLogado() !== null;
}

function ehONG() {
    const u = getUsuarioLogado();
    return u !== null && u.tipoPerfil === 'ong';
}

function protegerRota() {
    if (!estaLogado()) {
        const isInPages = window.location.pathname.includes('/pages/');
        window.location.href = isInPages ? 'cadastro.html' : 'pages/cadastro.html';
        return false;
    }
    return true;
}

function atualizarMenuPerfil() {
    const perfilMenu = document.querySelector('.perfilMenu');
    if (!perfilMenu) return;

    const usuario = getUsuarioLogado();
    const base = getBaseUrl();

    if (usuario) {
        const naoLidas = contarNaoLidas(usuario.usuarioId);
        perfilMenu.innerHTML = `
            <a href="${base}pages/perfil.html">Olá, ${usuario.nome.split(' ')[0]}${naoLidas > 0 ? ` <span class="badge-notif">${naoLidas}</span>` : ''}</a>
            <span style="color:#ccc">|</span>
            <a href="#" onclick="fazerLogout(); return false;">Sair</a>
        `;
    } else {
        perfilMenu.innerHTML = `
            <a href="${base}pages/cadastro.html">Entre</a>
            <p>ou</p>
            <a href="${base}pages/cadastro.html#cadastro">Cadastre-se</a>
        `;
    }
}
