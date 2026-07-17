const clienteData = localStorage.getItem('clienteLogado');

if (!clienteData) {
    alert('Acesso negado! Por favor, faça login para acessar seus veículos.');
    window.location.href = 'login-cliente.html';
}

const cliente = JSON.parse(clienteData);

window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        const dadosAtuais = localStorage.getItem('clienteLogado');
        if (!dadosAtuais) {
            window.location.href = 'login-cliente.html';
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('nomeCliente').textContent = `Olá, ${cliente.nome}`;

    configurarModal();
    carregarVeiculos();
    configurarLogout();
});

function configurarModal() {
    const modal = document.getElementById('modalCarro');
    const btnAbrir = document.getElementById('btnAbrirModal');
    const btnFechar = document.getElementById('btnFecharModal');
    const formCarro = document.getElementById('formCadastroCarro');

    btnAbrir.addEventListener('click', () => modal.classList.add('active'));
    btnFechar.addEventListener('click', () => modal.classList.remove('active'));

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    formCarro.addEventListener('submit', async (e) => {
        e.preventDefault();

        const dadosCarro = {
            marca: document.getElementById('marca').value.trim(),
            modelo: document.getElementById('modelo').value.trim(),
            ano: document.getElementById('ano').value,
            placa: document.getElementById('placa').value.trim(),
            id_cliente: cliente.id_cliente
        };

        try {
            const response = await fetch('https://autoresgate-backend.onrender.com/api/veiculos/cadastro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosCarro)
            });

            const dados = await response.json();

            if (response.ok) {
                alert('Veículo cadastrado com sucesso!');
                formCarro.reset();
                modal.classList.remove('active');
                carregarVeiculos();
            } else {
                alert(dados.erro || 'Erro ao cadastrar veículo.');
            }
        } catch (erro) {
            console.error(erro);
            alert('Erro ao conectar com o servidor.');
        }
    });
}

async function carregarVeiculos() {
    const grid = document.getElementById('gridCarros');

    try {
        const response = await fetch(`https://autoresgate-backend.onrender.com/api/veiculos?id_cliente=${cliente.id_cliente}`);
        const carros = await response.json();

        if (!response.ok) throw new Error(carros.erro || 'Erro ao buscar veículos.');

        if (carros.length === 0) {
            grid.innerHTML = '<div class="loading">Você ainda não possui veículos cadastrados.</div>';
            return;
        }

        grid.innerHTML = carros.map(carro => `
            <div class="car-card">
                <h4>${carro.marca} ${carro.modelo}</h4>
                <p class="car-info">Ano: <span>${carro.ano}</span></p>
                <div class="car-placa">${carro.placa.toUpperCase()}</div>
            </div>
        `).join('');

    } catch (erro) {
        console.error(erro);
        grid.innerHTML = '<div class="loading" style="color: #f75a68;">Erro ao carregar dados do servidor.</div>';
    }
}

function configurarLogout() {
    document.getElementById('btnSair').addEventListener('click', () => {
        localStorage.removeItem('clienteLogado');
        window.location.href = 'login-cliente.html';
    });
}