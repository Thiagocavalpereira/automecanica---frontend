const funcionarioData = localStorage.getItem('funcionarioLogado');

if (!funcionarioData) {
    alert('Acesso restrito! Por favor, faça login com suas credenciais de funcionário.');
    window.location.href = 'login-funcionario.html';
}

const funcionario = JSON.parse(funcionarioData);

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

    if (funcionario.cargo.toLowerCase() === 'administrador') {
        const btnCadastro = document.getElementById('btnCadastrarFuncionario');
        if (btnCadastro) {
            btnCadastro.style.display = 'block';
        }
    }

    carregarOrdensServico();
    configurarLogout();
});

async function carregarOrdensServico() {
    const tabela = document.getElementById('tabelaOrdensServico');

    try {
        const response = await fetch('https://autoresgate-backend.onrender.com/api/chamados');
        const dados = await response.json();

        if (!response.ok) throw new Error(dados.erro || 'Erro ao carregar Ordens de Serviço.');

        if (dados.length === 0) {
            tabela.innerHTML = `
                <tr>
                    <td colspan="6" class="table-loading">Nenhuma ordem de serviço ativa no momento.</td>
                </tr>
            `;
            return;
        }

        tabela.innerHTML = dados.map(os => {

            let statusClass = 'analise';
            if (os.status === 'Em Reparo') statusClass = 'reparo';
            if (os.status === 'Finalizado') statusClass = 'finalizado';

            return `
                <tr>
                    <td><strong>#${os.id_os}</strong></td>
                    <td>${os.nome_cliente}</td>
                    <td>${os.marca} ${os.modelo}</td>
                    <td><span style="font-family: monospace; font-size: 14px;">${os.placa.toUpperCase()}</span></td>
                    <td><span class="status ${statusClass}">${os.status}</span></td>
                    <td>${os.nome_funcionario ?? "Não atribuído"}</td>
                    <td>
                        <button class="btn-action" onclick="alterarStatus(${os.id_os}, '${os.status}')">
                            Atualizar
                        </button>

                        <button class="btn-action" onclick="abrirModalFuncionario(${os.id_os})">
                            Atribuir
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (erro) {
        console.error(erro);
        tabela.innerHTML = `
            <tr>
                <td colspan="6" class="table-loading" style="color: #f75a68;">
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
            const response = await fetch(`https://autoresgate-backend.onrender.com/api/chamados/${idOs}`, {
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

function configurarLogout() {
    document.getElementById('btnSairAdmin').addEventListener('click', () => {
        localStorage.removeItem('funcionarioLogado');
        window.location.href = 'login-funcionario.html';
    });
}

async function abrirModalFuncionario(idOS) {

    ordemSelecionada = idOS;

    const modal = document.getElementById("modalFuncionario");
    const select = document.getElementById("selectFuncionario");

    modal.style.display = "flex";

    try {

        const response = await fetch("https://autoresgate-backend.onrender.com/api/funcionarios");
        const funcionarios = await response.json();

        select.innerHTML = `<option value="" disabled selected>Selecione um funcionário</option>` +
            funcionarios.map(funcionario => `
                <option value="${funcionario.id_funcionario}">
                    ${funcionario.nome}
                </option>
            `).join("");

    } catch (erro) {
        console.error(erro);
        alert("Erro ao carregar funcionários.");
    }

}

document.getElementById("btnCancelarFuncionario").addEventListener("click", () => {
    document.getElementById("modalFuncionario").style.display = "none";
});

document.getElementById("btnSalvarFuncionario").addEventListener("click", async () => {
    const select = document.getElementById("selectFuncionario");
    const idFuncionarioSelecionado = select.value;

    if (!idFuncionarioSelecionado) {
        alert("Selecione um Funcionario ao Chamado Solicitado!");
        return;
    }

    try {
        const response = await fetch(`'https://autoresgate-backend.onrender.com/api/chamados/${ordemSelecionada}/funcionario`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idFuncionario: idFuncionarioSelecionado })
        });

        const dados = await response.json();

        if (!response.ok) throw new Error(dados.erro || 'Erro ao atribuir funcionário.');

        alert('Funcionário atribuído com sucesso!');
        document.getElementById("modalFuncionario").style.display = "none";
        carregarOrdensServico();

    } catch (erro) {
        console.error(erro);
        alert(erro.message);
    }
});