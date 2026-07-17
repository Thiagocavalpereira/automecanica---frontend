const API_URL = 'https://autoresgate-backend.onrender.com/api';

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
    configurarModalEdicao();
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
            const response = await fetch(`${API_URL}/veiculos/cadastro`, {
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

function configurarModalEdicao() {
    const modal = document.getElementById('modalEditarCarro');
    const btnFechar = document.getElementById('btnFecharModalEditar');
    const form = document.getElementById('formEditarCarro');

    btnFechar.addEventListener('click', () => modal.classList.remove('active'));

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('editarVeiculoId').value;
        const dadosCarro = {
            marca: document.getElementById('editarMarca').value.trim(),
            modelo: document.getElementById('editarModelo').value.trim(),
            ano: document.getElementById('editarAno').value,
            placa: document.getElementById('editarPlaca').value.trim()
        };

        try {
            const response = await fetch(`${API_URL}/veiculos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosCarro)
            });

            const dados = await response.json().catch(() => ({}));

            if (!response.ok) throw new Error(dados.erro || 'Erro ao atualizar veículo.');

            alert('Veículo atualizado com sucesso!');
            modal.classList.remove('active');
            carregarVeiculos();

        } catch (erro) {
            console.error(erro);
            alert(erro.message);
        }
    });
}

function abrirEdicaoVeiculo(veiculo) {
    document.getElementById('editarVeiculoId').value = veiculo.id_veiculos;
    document.getElementById('editarMarca').value = veiculo.marca;
    document.getElementById('editarModelo').value = veiculo.modelo;
    document.getElementById('editarAno').value = veiculo.ano;
    document.getElementById('editarPlaca').value = veiculo.placa;
    document.getElementById('modalEditarCarro').classList.add('active');
}

async function excluirVeiculo(id, descricao) {
    if (!confirm(`Deseja realmente excluir o veículo ${descricao}? Esta ação não pode ser desfeita.`)) return;

    try {
        const response = await fetch(`${API_URL}/veiculos/${id}`, { method: 'DELETE' });

        if (!response.ok) {
            const dados = await response.json().catch(() => ({}));
            throw new Error(dados.erro || 'Erro ao excluir veículo.');
        }

        alert('Veículo excluído com sucesso!');
        carregarVeiculos();

    } catch (erro) {
        console.error(erro);
        alert(erro.message);
    }
}

let veiculosCache = [];

async function carregarVeiculos() {
    const grid = document.getElementById('gridCarros');

    try {
        const response = await fetch(`${API_URL}/veiculos?id_cliente=${cliente.id_cliente}`);
        const carros = await response.json();

        if (!response.ok) throw new Error(carros.erro || 'Erro ao buscar veículos.');

        veiculosCache = carros;

        if (carros.length === 0) {
            grid.innerHTML = '<div class="empty-state">Você ainda não possui veículos cadastrados.</div>';
            return;
        }

        grid.innerHTML = carros.map(carro => `
            <div class="car-card surface-card">
                <div class="car-card-header">
                    <h4>${carro.marca} ${carro.modelo}</h4>
                    <div class="card-actions">
                        <button class="icon-btn icon-btn--edit" title="Editar veículo" onclick='abrirEdicaoVeiculo(${JSON.stringify(carro)})'>
                            ${iconEditar()}
                        </button>
                        <button class="icon-btn icon-btn--delete" title="Excluir veículo" onclick="excluirVeiculo(${carro.id_veiculos}, '${carro.marca} ${carro.modelo}')">
                            ${iconExcluir()}
                        </button>
                    </div>
                </div>
                <p class="car-info">Ano <span>${carro.ano}</span></p>
                <div class="car-placa">${carro.placa.toUpperCase()}</div>
            </div>
        `).join('');

    } catch (erro) {
        console.error(erro);
        grid.innerHTML = '<div class="empty-state" style="color: var(--danger);">Erro ao carregar dados do servidor.</div>';
    }
}

function iconEditar() {
    return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>`;
}

function iconExcluir() {
    return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg>`;
}

function configurarLogout() {
    document.getElementById('btnSair').addEventListener('click', () => {
        localStorage.removeItem('clienteLogado');
        window.location.href = 'login-cliente.html';
    });
}
