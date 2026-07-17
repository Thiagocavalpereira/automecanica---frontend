const API_URL = 'https://autoresgate-backend.onrender.com/api';

const clienteData = localStorage.getItem('clienteLogado');

if (!clienteData) {
    alert('Acesso restrito! Por favor, faça login.');
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
    document.getElementById('nomeCliente').textContent = cliente.nome;

    carregarChamados();
    configurarModal();
    configurarLogout();
});

async function carregarChamados() {
    const grid = document.getElementById('gridChamados');

    try {
        const response = await fetch(`${API_URL}/chamados/cliente/${cliente.id_cliente}`);
        const dados = await response.json();

        if (!response.ok) throw new Error(dados.erro || 'Erro ao carregar chamados.');

        if (dados.length === 0) {
            grid.innerHTML = `<div class="loading">Você ainda não abriu nenhum chamado.</div>`;
            return;
        }

        grid.innerHTML = dados.map(os => {
            let statusClass = 'analise';
            if (os.status === 'Em Reparo') statusClass = 'reparo';
            if (os.status === 'Finalizado') statusClass = 'finalizado';

            return `
                <div class="card-carro">
                    <h3>#${os.id_os} - ${os.titulo}</h3>
                    <p>${os.marca} ${os.modelo} — <strong>${os.placa.toUpperCase()}</strong></p>
                    <p>${os.descricao || 'Sem descrição adicional.'}</p>
                    <span class="status ${statusClass}">${os.status}</span>
                </div>
            `;
        }).join('');

    } catch (erro) {
        console.error(erro);
        grid.innerHTML = `<div class="loading" style="color:#f75a68;">Erro ao conectar com o servidor.</div>`;
    }
}

async function carregarVeiculosDoCliente() {
    const select = document.getElementById('veiculoSelect');

    try {
        const response = await fetch(`${API_URL}/veiculos?id_cliente=${cliente.id_cliente}`);
        const veiculos = await response.json();

        if (!response.ok) throw new Error(veiculos.erro || 'Erro ao carregar veículos.');

        if (veiculos.length === 0) {
            select.innerHTML = `<option value="">Nenhum veículo cadastrado</option>`;
            return;
        }

        select.innerHTML = veiculos.map(v =>
            `<option value="${v.id_veiculos}">${v.marca} ${v.modelo} - ${v.placa.toUpperCase()}</option>`
        ).join('');

    } catch (erro) {
        console.error(erro);
        select.innerHTML = `<option value="">Erro ao carregar veículos</option>`;
    }
}

function configurarModal() {
    const modal = document.getElementById('modalChamado');
    const btnAbrir = document.getElementById('btnAbrirModal');
    const btnFechar = document.getElementById('btnFecharModal');
    const form = document.getElementById('formAbrirChamado');

    btnAbrir.addEventListener('click', () => {
        modal.classList.add('active');
        carregarVeiculosDoCliente();
    });

    btnFechar.addEventListener('click', () => {
        modal.classList.remove('active');
        form.reset();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id_veiculos = document.getElementById('veiculoSelect').value;
        const titulo = document.getElementById('titulo').value.trim();
        const descricao = document.getElementById('descricao').value.trim();

        if (!id_veiculos) {
            alert('Selecione um veículo.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/chamados`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_cliente: cliente.id_cliente,
                    id_veiculos,
                    titulo,
                    descricao
                })
            });

            const dados = await response.json();

            if (!response.ok) throw new Error(dados.erro || 'Erro ao abrir chamado.');

            alert('Chamado aberto com sucesso!');
            modal.classList.remove('active');
            form.reset();
            carregarChamados();

        } catch (erro) {
            console.error(erro);
            alert(erro.message);
        }
    });
}

function configurarLogout() {
    document.getElementById('btnSair').addEventListener('click', () => {
        localStorage.removeItem('clienteLogado');
        window.location.href = 'login-cliente.html';
    });
}