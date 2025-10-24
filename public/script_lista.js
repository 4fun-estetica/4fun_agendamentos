const tabela = document.getElementById('tabela');
const limparBtn = document.getElementById('limpar-concluidos');
const modal = document.getElementById('modal');
const editForm = document.getElementById('edit-form');
const campoBusca = document.getElementById('busca');
const filtroStatus = document.getElementById('filtro-status');
let agendamentoEdit = null;
let listaGlobal = [];

// --- Funções de formatação ---
function formatarDataBR(dataString) {
  if (!dataString) return '-';
  const partes = dataString.split('T')[0].split('-');
  const [y, m, d] = partes;
  return `${d}/${m}/${y}`;
}

function formatarHora(dataString) {
  if (!dataString) return '-';
  const horaPart = dataString.split('T')[1];
  if (!horaPart) return '-';
  const [h, m] = horaPart.split(':');
  return `${h}:${m}`;
}

function paraDatetimeLocal(dataString) {
  if (!dataString) return '';
  const data = new Date(dataString);
  if (isNaN(data)) return '';
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, '0');
  const d = String(data.getDate()).padStart(2, '0');
  const h = String(data.getHours()).padStart(2, '0');
  const mn = String(data.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${mn}`;
}

// --- Carregamento e renderização ---
async function carregarAgendamentos() {
  try {
    const res = await fetch("/api/agendamentos/full");
    if (!res.ok) throw new Error("Erro ao carregar agendamentos");
    listaGlobal = await res.json();
    renderizarTabela();
  } catch (err) {
    console.error(err);
    tabela.innerHTML = `<tr><td colspan="7" class="text-center">Erro ao carregar agendamentos</td></tr>`;
  }
}

function renderizarTabela() {
  let listaFiltrada = [...listaGlobal];

  // --- Aplicar busca ---
  const busca = campoBusca.value.toLowerCase();
  if (busca) {
    listaFiltrada = listaFiltrada.filter(a =>
      (a.nome_cliente || '').toLowerCase().includes(busca) ||
      (a.placa || '').toLowerCase().includes(busca)
    );
  }

  // --- Aplicar filtro de status ---
  const filtro = filtroStatus.value;
  if (filtro !== "Todos") {
    listaFiltrada = listaFiltrada.filter(a => a.status === filtro);
  }

  // --- Renderização ---
  if (listaFiltrada.length === 0) {
    tabela.innerHTML = `<tr><td colspan="7" class="text-center py-4">Nenhum agendamento encontrado</td></tr>`;
    return;
  }

  listaFiltrada.sort((a, b) => new Date(a.data_agendada) - new Date(b.data_agendada));
  tabela.innerHTML = "";

  listaFiltrada.forEach(a => {
    const tr = document.createElement('tr');
    tr.className = "bg-slate-800/80";
    const carroText = a.marca ? `${a.marca} ${a.modelo} (${a.placa || "-"}) ${a.ano || ""}` : "-";
    const statusAtual = a.status || "Pendente";

    if (statusAtual === "Feito") tr.style.backgroundColor = "#064e3b";
    else if (statusAtual === "Cancelado") tr.style.backgroundColor = "#78350f";

    tr.innerHTML = `
      <td class="px-2 sm:px-4 py-2">${a.nome_cliente || '-'}</td>
      <td class="px-2 sm:px-4 py-2">${carroText}</td>
      <td class="px-2 sm:px-4 py-2">${a.tipo_lavagem || '-'}</td>
      <td class="px-2 sm:px-4 py-2">${formatarDataBR(a.data_agendada)} ${formatarHora(a.data_agendada)}</td>
      <td class="px-2 sm:px-4 py-2">${formatarDataBR(a.data_criacao)} ${formatarHora(a.data_criacao)}</td>
      <td class="px-2 sm:px-4 py-2 status">${statusAtual}</td>
      <td class="px-2 sm:px-4 py-2 flex gap-1 flex-wrap"></td>
    `;

    const tdAcoes = tr.children[6];
    if (statusAtual === "Pendente") {
      const btnFeito = criarBotao("Feito", "green", async () => {
        await atualizarStatus(a.id, "Feito");
        carregarAgendamentos();
      });
      const btnCancelar = criarBotao("Cancelar", "yellow", async () => {
        await atualizarStatus(a.id, "Cancelado");
        carregarAgendamentos();
      });
      const btnEditar = criarBotao("Editar", "blue", () => abrirModal(a));
      const btnExcluir = criarBotao("X", "red", async () => {
        if (confirm("Deseja excluir este agendamento?")) {
          await fetch(`/api/agendamentos/${a.id}`, { method: "DELETE" });
          carregarAgendamentos();
        }
      });
      tdAcoes.append(btnFeito, btnCancelar, btnEditar, btnExcluir);
    }

    tabela.appendChild(tr);
  });
}

// --- Funções auxiliares ---
function criarBotao(texto, cor, onClick) {
  const btn = document.createElement('button');
  btn.className = `bg-${cor}-600 px-2 py-1 rounded text-white hover:bg-${cor}-700 text-xs sm:text-sm`;
  btn.textContent = texto;
  btn.onclick = onClick;
  return btn;
}

async function atualizarStatus(id, status) {
  await fetch(`/api/agendamentos/${id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
}

async function limparConcluidos() {
  if (!confirm("Deseja realmente remover todos os registros concluídos ou cancelados?")) return;
  const lista = [...listaGlobal];
  for (const a of lista) {
    if (a.status && a.status !== "Pendente") {
      await fetch(`/api/agendamentos/${a.id}`, { method: "DELETE" });
    }
  }
  carregarAgendamentos();
}

function abrirModal(a) {
  agendamentoEdit = a;
  modal.classList.remove("hidden");
  document.getElementById("edit-name").value = a.nome_cliente || '';
  document.getElementById("edit-car").value = a.marca ? `${a.marca} ${a.modelo}` : '';
  document.getElementById("edit-type").value = a.tipo_lavagem || '';
  document.getElementById("edit-date").value = paraDatetimeLocal(a.data_agendada);
}

document.getElementById("cancel-edit").onclick = () => modal.classList.add("hidden");

editForm.onsubmit = async (e) => {
  e.preventDefault();

  const inputDate = document.getElementById("edit-date").value;
  const dataParaSalvar = inputDate.replace("T", " ") + ":00";

  const body = {
    nome_cliente: document.getElementById("edit-name").value,
    tipo_lavagem: document.getElementById("edit-type").value,
    data_agendada: dataParaSalvar
  };

  await fetch(`/api/agendamentos/${agendamentoEdit.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  modal.classList.add("hidden");
  carregarAgendamentos();
};

// --- Eventos ---
limparBtn.onclick = limparConcluidos;
campoBusca.oninput = renderizarTabela;
filtroStatus.onchange = renderizarTabela;

document.addEventListener("DOMContentLoaded", () => carregarAgendamentos());
