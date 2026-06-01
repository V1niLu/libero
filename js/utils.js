function gerarUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function hashSenha(senha) {
    let hash = 0;
    for (let i = 0; i < senha.length; i++) {
        const char = senha.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

function formatarData(timestamp) {
    const data = new Date(timestamp);
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function calcularDiasRestantes(dataExpiracao) {
    const diffMs = new Date(dataExpiracao) - new Date();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function calcularPorcentagemRestante(dataPublicacao, dataExpiracao) {
    const totalMs = new Date(dataExpiracao) - new Date(dataPublicacao);
    const decorridoMs = new Date() - new Date(dataPublicacao);
    return Math.max(0, Math.min(1, 1 - (decorridoMs / totalMs)));
}

function estaExpirado(dataExpiracao) {
    return new Date() > new Date(dataExpiracao);
}

function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validarSenha(senha) {
    return senha && senha.length >= 6;
}

function mostrarFeedback(containerId, mensagem, tipo = 'info') {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.textContent = mensagem;
    el.className = `feedback feedback-${tipo}`;
    el.style.display = 'block';
    if (tipo !== 'loading') {
        setTimeout(() => { el.style.display = 'none'; }, 4000);
    }
}

function esconderFeedback(containerId) {
    const el = document.getElementById(containerId);
    if (el) el.style.display = 'none';
}

function truncarTexto(texto, limite) {
    if (!texto) return '';
    return texto.length > limite ? texto.substring(0, limite) + '...' : texto;
}

const CATEGORIAS = {
    'roupas': 'Roupas',
    'livros': 'Livros',
    'eletronicos': 'Eletrônicos',
    'moveis': 'Móveis',
    'utensilios': 'Utensílios',
    'maquinas': 'Máquinas',
    'entulho': 'Entulho',
    'sucata': 'Sucata',
    'construcao': 'Construção',
    'refeicao': 'Refeição',
    'outros': 'Outros'
};

function getNomeCategoria(valor) {
    return CATEGORIAS[valor] || valor;
}

function getCoresCategoria(categoria) {
    const cores = {
        'roupas': '#949602',
        'livros': '#f59e0b',
        'eletronicos': '#0051ff',
        'moveis': '#7c3aed',
        'utensilios': '#0891b2',
        'maquinas': '#dc2626',
        'entulho': '#393939',
        'sucata': '#745a23',
        'construcao': '#d97706',
        'refeicao': '#16a34a',
        'outros': '#6b7280'
    };
    return cores[categoria] || '#6b7280';
}

function getBaseUrl() {
    return window.location.pathname.includes('/pages/') ? '../' : '';
}

const IMG_PLACEHOLDER = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" font-family="sans-serif" font-size="14" fill="#9ca3af" text-anchor="middle" dy=".3em">Sem imagem</text></svg>'
);

// ── Dinheiro ──────────────────────────────────────────────────────────────────

function configurarMascaraDinheiro(input) {
    input.addEventListener('input', () => {
        const apenasDigitos = input.value.replace(/\D/g, '');
        if (!apenasDigitos) { input.value = ''; return; }
        const valor = parseInt(apenasDigitos, 10) / 100;
        input.value = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    });
    input.addEventListener('focus', () => {
        if (!input.value) input.value = 'R$ 0,00';
        input.select();
    });
    input.addEventListener('blur', () => {
        if (input.value === 'R$ 0,00') input.value = '';
    });
}

function desformatarDinheiro(str) {
    if (!str) return 0;
    return parseFloat(str.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
}

// ── Horário ───────────────────────────────────────────────────────────────────

function formatarHorario(str) {
    if (!str) return '';
    const [h, m] = str.split(':');
    return `${h}h${m}`;
}

// ── Tipo de proposta → label ──────────────────────────────────────────────────

const LABELS_PROPOSTA = {
    pago_retirada:  'Paga e retira',
    gratis_retirada:'Retira gratuitamente',
    cobro_retirada: 'Cobra para retirar',
    ong_interesse:  'Interesse (ONG)'
};

function getLabelProposta(tipo) {
    return LABELS_PROPOSTA[tipo] || tipo;
}
