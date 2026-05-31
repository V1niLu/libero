const compraAnuncio = document.getElementById("comprar");
const menu = document.getElementById("menu");

function abrirCompra(){
    compraAnuncio.classList.remove("desativar");
    menu.classList.remove("fixar");
}

function fecharCompra(){
    compraAnuncio.classList.add("desativar");
    menu.classList.add("fixar");
}