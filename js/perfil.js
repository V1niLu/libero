const anuncio = document.getElementById("anuncio");
const menu = document.getElementById("menu");

function addAnuncio(){
    anuncio.classList.remove("desativar");
    menu.classList.remove("fixar");
}

function fecharAnuncio(){
    anuncio.classList.add("desativar");
    menu.classList.add("fixar");
}