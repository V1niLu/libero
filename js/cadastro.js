const transicao = document.getElementById("trasicao");

function transicaoCadastro(){
    transicao.classList.remove("loginTransition")
    transicao.classList.add("cadastroTransition")
}

function transitionLogin(){
    transicao.classList.remove("cadastroTransition")
    transicao.classList.add("loginTransition")
}