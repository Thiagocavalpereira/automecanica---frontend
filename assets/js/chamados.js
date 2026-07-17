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
    configurarModalEdicao();
    configurarLogout();
});

async function carregarChamados() {
    const grid = document.getElementById('gridChamados');

    try {
        const response = await fetch(`${API_URL}/chamados/cliente/${cliente.id_cliente}`);
        const dados = await response.json();

        if (!response.ok) throw new Error(dados.erro || 'Erro ao carregar chamados.');

        if (dados.length === 0) {
            grid.innerHTML = `<div class="empty-state">Você ainda não abriu nenhum chamado.</div>`;
            return;
        }

        grid.innerHTML = dados.map(os => {
            let statusClass = 'analise';
            if (os.status === 'Em Reparo') statusClass = 'reparo';
            if (os.status === 'Finalizado') statusClass = 'finalizado';

            const podeEditar = os.status === 'Em Análise';

            return `
                <div class="card-carro surface-card status-border-${statusClass}">
                    <div class="card-carro-header">
                        <h3>#${os.id_os} - ${os.titulo}</h3>
                        <div class="card-actions">
                            <button class="icon-btn icon-btn--edit" title="${podeEditar ? 'Editar chamado' : 'Só é possível editar enquanto o chamado está em análise'}"
                                ${podeEditar ? '' : 'disabled'}
                                onclick='abrirEdicaoChamado(${JSON.stringify({ id_os: os.id_os, titulo: os.titulo, descricao: os.descricao || '' })})'>
                                ${iconEditar()}
                            </button>
                            <button class="icon-btn icon-btn--delete" title="${podeEditar ? 'Excluir chamado' : 'Só é possível excluir enquanto o chamado está em análise'}"
                                ${podeEditar ? '' : 'disabled'}
                                onclick="excluirChamado(${os.id_os})">
                                ${iconExcluir()}
                            </button>
                        </div>
                    </div>
                    <p class="chamado-veiculo">${os.marca} ${os.modelo} — <strong>${os.placa.toUpperCase()}</strong></p>
                    <p class="chamado-desc">${os.descricao || 'Sem descrição adicional.'}</p>
                    <div class="card-carro-footer">
                        <span class="status ${statusClass}">${os.status}</span>
                    </div>
                </div>
            `;
        }).join('');

    } catch (erro) {
        console.error(erro);
        grid.innerHTML = `<div class="empty-state" style="color: var(--danger);">Erro ao conectar com o servidor.</div>`;
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

function configurarModalEdicao() {
    const modal = document.getElementById('modalEditarChamado');
    const btnFechar = document.getElementById('btnFecharModalEditar');
    const form = document.getElementById('formEditarChamado');

    btnFechar.addEventListener('click', () => modal.classList.remove('active'));

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('editarChamadoId').value;
        const titulo = document.getElementById('editarTitulo').value.trim();
        const descricao = document.getElementById('editarDescricao').value.trim();

        try {
            const response = await fetch(`${API_URL}/chamados/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ titulo, descricao })
            });

            const dados = await response.json().catch(() => ({}));

            if (!response.ok) throw new Error(dados.erro || 'Erro ao atualizar chamado.');

            alert('Chamado atualizado com sucesso!');
            modal.classList.remove('active');
            carregarChamados();

        } catch (erro) {
            console.error(erro);
            alert(erro.message);
        }
    });
}

function abrirEdicaoChamado(chamado) {
    document.getElementById('editarChamadoId').value = chamado.id_os;
    document.getElementById('editarTitulo').value = chamado.titulo;
    document.getElementById('editarDescricao').value = chamado.descricao;
    document.getElementById('modalEditarChamado').classList.add('active');
}

async function excluirChamado(id) {
    if (!confirm(`Deseja realmente excluir o chamado #${id}? Esta ação não pode ser desfeita.`)) return;

    try {
        const response = await fetch(`${API_URL}/chamados/${id}`, { method: 'DELETE' });

        if (!response.ok) {
            const dados = await response.json().catch(() => ({}));
            throw new Error(dados.erro || 'Erro ao excluir chamado.');
        }

        alert('Chamado excluído com sucesso!');
        carregarChamados();

    } catch (erro) {
        console.error(erro);
        alert(erro.message);
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
