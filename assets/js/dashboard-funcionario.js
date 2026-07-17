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

window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        const dadosAtuais = localStorage.getItem('funcionarioLogado');
        if (!dadosAtuais) {
            window.location.href = 'login-funcionario.html';
        }
    }
});

let ordemSelecionada = null;

document.addEventListener('DOMContentLoaded', () => {

    document.getElementById('nomeFuncionario').textContent = funcionario.nome;
    document.getElementById('cargoFuncionario').textContent = funcionario.cargo || 'Funcionário';

    if (isAdmin()) {
        const btnCadastro = document.getElementById('btnCadastrarFuncionario');
        if (btnCadastro) btnCadastro.style.display = 'block';

        const linkFuncionarios = document.getElementById('linkFuncionarios');
        if (linkFuncionarios) linkFuncionarios.style.display = 'inline-block';
    }

    carregarOrdensServico();
    configurarLogout();
    configurarModalFuncionario();
    configurarModalEdicaoOs();
});

async function carregarOrdensServico() {
    const tabela = document.getElementById('tabelaOrdensServico');

    try {
        const response = await fetch(`${API_URL}/chamados`);
        const dados = await response.json();

        if (!response.ok) throw new Error(dados.erro || 'Erro ao carregar Ordens de Serviço.');

        if (dados.length === 0) {
            tabela.innerHTML = `
                <tr>
                    <td colspan="7" class="table-loading">Nenhuma ordem de serviço ativa no momento.</td>
                </tr>
            `;
            return;
        }

        tabela.innerHTML = dados.map(os => {

            let statusClass = 'analise';
            if (os.status === 'Em Reparo') statusClass = 'reparo';
            if (os.status === 'Finalizado') statusClass = 'finalizado';

            const finalizado = os.status === 'Finalizado';
            const funcionarioTexto = os.nome_funcionario ?? 'Não atribuído';

            const acoesAdmin = isAdmin() ? `
                        <button class="icon-btn icon-btn--assign icon-btn--wide" title="Atribuir funcionário" onclick="abrirModalFuncionario(${os.id_os})">
                            Atribuir
                        </button>
                        <button class="icon-btn icon-btn--edit" title="Editar chamado" onclick='abrirEdicaoOs(${JSON.stringify({ id_os: os.id_os, titulo: os.titulo, descricao: os.descricao || '' })})'>
                            ${iconEditar()}
                        </button>
                        <button class="icon-btn icon-btn--delete" title="Excluir chamado" onclick="excluirOs(${os.id_os})">
                            ${iconExcluir()}
                        </button>
            ` : '';

            return `
                <tr>
                    <td><strong>#${os.id_os}</strong></td>
                    <td>${os.nome_cliente}</td>
                    <td>${os.marca} ${os.modelo}</td>
                    <td><span class="placa-mono">${os.placa.toUpperCase()}</span></td>
                    <td><span class="status ${statusClass}">${os.status}</span></td>
                    <td><span class="funcionario-atribuido ${os.nome_funcionario ? 'atribuido' : ''}">${funcionarioTexto}</span></td>
                    <td>
                        <div class="card-actions">
                            <button class="icon-btn icon-btn--advance icon-btn--wide" title="Avançar status" onclick="alterarStatus(${os.id_os}, '${os.status}')" ${finalizado ? 'disabled' : ''}>
                                Atualizar
                            </button>
                            ${acoesAdmin}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (erro) {
        console.error(erro);
        tabela.innerHTML = `
            <tr>
                <td colspan="7" class="table-loading" style="color: var(--danger);">
                    Erro ao conectar com o banco de dados.
                </td>
            </tr>
        `;
    }
}

async function alterarStatus(idOs, statusAtual) {
    let novoStatus = '';

    if (statusAtual === 'Em Análise') novoStatus = 'Em Reparo';
    else if (statusAtual === 'Em Reparo') novoStatus = 'Finalizado';
    else {
        alert('Esta Ordem de Serviço já está finalizada!');
        return;
    }

    if (confirm(`Deseja alterar o status da Ordem de Serviço #${idOs} para "${novoStatus}"?`)) {
        try {
            const response = await fetch(`${API_URL}/chamados/${idOs}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: novoStatus })
            });

            if (response.ok) {
                alert('Status atualizado com sucesso!');
                carregarOrdensServico();
            } else {
                alert('Erro ao atualizar status da OS.');
            }
        } catch (erro) {
            console.error(erro);
            alert('Erro de conexão com o servidor.');
        }
    }
}

async function excluirOs(idOs) {
    if (!isAdmin()) return;
    if (!confirm(`Deseja realmente excluir a Ordem de Serviço #${idOs}? Esta ação não pode ser desfeita.`)) return;

    try {
        const response = await fetch(`${API_URL}/chamados/${idOs}`, { method: 'DELETE' });

        if (!response.ok) {
            const dados = await response.json().catch(() => ({}));
            throw new Error(dados.erro || 'Erro ao excluir ordem de serviço.');
        }

        alert('Ordem de serviço excluída com sucesso!');
        carregarOrdensServico();

    } catch (erro) {
        console.error(erro);
        alert(erro.message);
    }
}

function configurarModalEdicaoOs() {
    const modal = document.getElementById('modalEditarChamado');
    const btnSalvar = document.getElementById('btnSalvarEdicaoOs');
    const btnCancelar = document.getElementById('btnCancelarEdicaoOs');

    btnCancelar.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    btnSalvar.addEventListener('click', async () => {
        if (!ordemSelecionada) return;

        const titulo = document.getElementById('editarOsTitulo').value.trim();
        const descricao = document.getElementById('editarOsDescricao').value.trim();

        try {
            const response = await fetch(`${API_URL}/chamados/${ordemSelecionada}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ titulo, descricao })
            });

            const dados = await response.json().catch(() => ({}));

            if (!response.ok) throw new Error(dados.erro || 'Erro ao atualizar ordem de serviço.');

            alert('Ordem de serviço atualizada com sucesso!');
            modal.style.display = 'none';
            carregarOrdensServico();

        } catch (erro) {
            console.error(erro);
            alert(erro.message);
        }
    });
}

function abrirEdicaoOs(os) {
    if (!isAdmin()) return;

    ordemSelecionada = os.id_os;
    document.getElementById('editarOsTitulo').value = os.titulo;
    document.getElementById('editarOsDescricao').value = os.descricao;
    document.getElementById('modalEditarChamado').style.display = 'flex';
}

function configurarLogout() {
    document.getElementById('btnSairAdmin').addEventListener('click', () => {
        localStorage.removeItem('funcionarioLogado');
        window.location.href = 'login-funcionario.html';
    });
}

async function abrirModalFuncionario(idOS) {
    if (!isAdmin()) return;

    ordemSelecionada = idOS;

    const modal = document.getElementById('modalFuncionario');
    const select = document.getElementById('selectFuncionario');

    modal.style.display = 'flex';

    try {
        const response = await fetch(`${API_URL}/funcionarios`);
        const funcionarios = await response.json();

        select.innerHTML = `<option value="" disabled selected>Selecione um funcionário</option>` +
            funcionarios.map(f => `
                <option value="${f.id_funcionario}">
                    ${f.nome}
                </option>
            `).join('');

    } catch (erro) {
        console.error(erro);
        alert('Erro ao carregar funcionários.');
    }
}

function configurarModalFuncionario() {
    document.getElementById('btnCancelarFuncionario').addEventListener('click', () => {
        document.getElementById('modalFuncionario').style.display = 'none';
    });

    document.getElementById('btnSalvarFuncionario').addEventListener('click', async () => {
        const select = document.getElementById('selectFuncionario');
        const idFuncionarioSelecionado = select.value;

        if (!idFuncionarioSelecionado) {
            alert('Selecione um Funcionário para o chamado.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/chamados/${ordemSelecionada}/funcionario`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idFuncionario: idFuncionarioSelecionado })
            });

            const dados = await response.json();

            if (!response.ok) throw new Error(dados.erro || 'Erro ao atribuir funcionário.');

            alert('Funcionário atribuído com sucesso!');
            document.getElementById('modalFuncionario').style.display = 'none';
            carregarOrdensServico();

        } catch (erro) {
            console.error(erro);
            alert(erro.message);
        }
    });
}

function iconEditar() {
    return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>`;
}

function iconExcluir() {
    return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg>`;
}
