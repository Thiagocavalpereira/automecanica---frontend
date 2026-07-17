const API_URL = 'https://autoresgate-backend.onrender.com/api';

const funcionarioData = localStorage.getItem('funcionarioLogado');

if (!funcionarioData) {
    alert('Acesso restrito! Por favor, faça login com suas credenciais de funcionário.');
    window.location.href = 'login-funcionario.html';
}

const funcionario = JSON.parse(funcionarioData);

function isAdmin() {
    return (funcionario.cargo || '').toLowerCase() === 'administrador';
}

if (!isAdmin()) {
    alert('Acesso restrito! Apenas administradores podem gerenciar funcionários.');
    window.location.href = 'dashboard-funcionario.html';
}

window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        const dadosAtuais = localStorage.getItem('funcionarioLogado');
        if (!dadosAtuais) {
            window.location.href = 'login-funcionario.html';
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('nomeFuncionario').textContent = funcionario.nome;
    document.getElementById('cargoFuncionario').textContent = funcionario.cargo || 'Funcionário';

    carregarFuncionarios();
    configurarModalEdicao();
    configurarLogout();
});

let funcionariosCache = [];

async function carregarFuncionarios() {
    const grid = document.getElementById('gridFuncionarios');

    try {
        const response = await fetch(`${API_URL}/funcionarios`);
        const dados = await response.json();

        if (!response.ok) throw new Error(dados.erro || 'Erro ao carregar funcionários.');

        funcionariosCache = dados;

        if (dados.length === 0) {
            grid.innerHTML = '<div class="empty-state">Nenhum funcionário cadastrado.</div>';
            return;
        }

        grid.innerHTML = dados.map(f => {
            const isVoceMesmo = String(f.id_funcionario) === String(funcionario.id_funcionario);
            const cargoClasse = (f.cargo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const iniciais = (f.nome || '?').trim().split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();

            return `
                <div class="funcionario-card surface-card">
                    <div class="funcionario-card-header">
                        <div class="funcionario-nome-bloco">
                            <div class="funcionario-avatar">${iniciais}</div>
                            <div>
                                <h4>${f.nome}</h4>
                                <span class="funcionario-email">${f.email}</span>
                            </div>
                        </div>
                        <div class="card-actions">
                            <button class="icon-btn icon-btn--edit" title="Editar funcionário" onclick='abrirEdicaoFuncionario(${JSON.stringify(f)})'>
                                ${iconEditar()}
                            </button>
                            <button class="icon-btn icon-btn--delete" title="${isVoceMesmo ? 'Você não pode excluir seu próprio usuário' : 'Excluir funcionário'}"
                                ${isVoceMesmo ? 'disabled' : ''}
                                onclick="excluirFuncionario(${f.id_funcionario}, '${(f.nome || '').replace(/'/g, '')}')">
                                ${iconExcluir()}
                            </button>
                        </div>
                    </div>
                    <div class="funcionario-card-footer">
                        <span class="role-badge ${cargoClasse}">${f.cargo}</span>
                        ${isVoceMesmo ? '<span class="voce-badge">Você</span>' : ''}
                    </div>
                </div>
            `;
        }).join('');

    } catch (erro) {
        console.error(erro);
        grid.innerHTML = '<div class="empty-state" style="color: var(--danger);">Erro ao conectar com o servidor.</div>';
    }
}

function abrirEdicaoFuncionario(f) {
    document.getElementById('editarFuncionarioId').value = f.id_funcionario;
    document.getElementById('editarNome').value = f.nome;
    document.getElementById('editarEmail').value = f.email;
    document.getElementById('editarCargo').value = f.cargo;
    document.getElementById('editarSenha').value = '';
    document.getElementById('modalEditarFuncionario').classList.add('active');
}

function configurarModalEdicao() {
    const modal = document.getElementById('modalEditarFuncionario');
    const btnFechar = document.getElementById('btnFecharModalEditar');
    const form = document.getElementById('formEditarFuncionario');

    btnFechar.addEventListener('click', () => modal.classList.remove('active'));

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('editarFuncionarioId').value;
        const senha = document.getElementById('editarSenha').value;

        const payload = {
            nome: document.getElementById('editarNome').value.trim(),
            email: document.getElementById('editarEmail').value.trim(),
            cargo: document.getElementById('editarCargo').value
        };

        if (senha) payload.senha = senha;

        try {
            const response = await fetch(`${API_URL}/funcionarios/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const dados = await response.json().catch(() => ({}));

            if (!response.ok) throw new Error(dados.erro || 'Erro ao atualizar funcionário.');

            alert('Funcionário atualizado com sucesso!');
            modal.classList.remove('active');

            if (String(id) === String(funcionario.id_funcionario)) {
                const atualizado = { ...funcionario, ...payload };
                delete atualizado.senha;
                localStorage.setItem('funcionarioLogado', JSON.stringify(atualizado));
            }

            carregarFuncionarios();

        } catch (erro) {
            console.error(erro);
            alert(erro.message);
        }
    });
}

async function excluirFuncionario(id, nome) {
    if (String(id) === String(funcionario.id_funcionario)) {
        alert('Você não pode excluir seu próprio usuário.');
        return;
    }

    if (!confirm(`Deseja realmente excluir o funcionário ${nome}? Esta ação não pode ser desfeita.`)) return;

    try {
        const response = await fetch(`${API_URL}/funcionarios/${id}`, { method: 'DELETE' });

        if (!response.ok) {
            const dados = await response.json().catch(() => ({}));
            throw new Error(dados.erro || 'Erro ao excluir funcionário.');
        }

        alert('Funcionário excluído com sucesso!');
        carregarFuncionarios();

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
    document.getElementById('btnSairAdmin').addEventListener('click', () => {
        localStorage.removeItem('funcionarioLogado');
        window.location.href = 'login-funcionario.html';
    });
}
