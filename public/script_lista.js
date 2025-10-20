const tabela = document.getElementById('tabela');
const limparBtn = document.getElementById('limpar-concluidos');
const modal = document.getElementById('modal');
const editForm = document.getElementById('edit-form');
let agendamentoEdit = null;

// Formata data MySQL/PostgreSQL (YYYY-MM-DD HH:MM:SS) para BR sem alterar hora
function formatarDataBR(dataString) {
  if (!dataString) return '-';
  const [datePart, timePart] = dataString.split(' ');
  if (!datePart || !timePart) return '-';
  const [y, m, d] = datePart.split('-').map(Number);
  const [h, mn] = timePart.split(':').map(Number);
  const data = new Date(y, m - 1, d, h, mn);
  return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Converte data PostgreSQL para datetime-local (input) sem alterar hora
function paraDatetimeLocal(dataString) {
  if (!dataString) return '';
  const [datePart, timePart] = dataString.split(' ');
  if (!datePart || !timePart) return '';
  const [y, m, d] = datePart.split('-').map(Number);
  const [h, mn] = timePart.split(':').map(Number);
  const pad = n => String(n).padStart(2, '0');
  return `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(mn)}`;
}

async function carregarAgendamentos() {
  let lista = [];
  try {
    const res = await fetch("/api/agendamentos/full");
    if (!res.ok) throw new Error("Erro ao carregar agendamentos");
    lista = await res.json();
  } catch (err) {
    console.error(err);
    tabela.innerHTML = `<tr><td colspan="6" class="text-center">Erro ao carregar agendamentos</td></tr>`;
    return;
  }

  if (lista.length === 0) {
    tabela.innerHTML = `<tr><td colspan="6" class="text-center py-4">Nenhum agendamento encontrado</td></tr>`;
    return;
  }

  lista.sort((a, b) => new Date(a.data_agendada) - new Date(b.data_agendada));
  tabela.innerHTML = "";

  lista.forEach(a => {
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
      <td class="px-2 sm:px-4 py-2">${formatarDataBR(a.data_agendada)}</td>
      <td class="px-2 sm:px-4 py-2 status">${statusAtual}</td>
      <td class="px-2 sm:px-4 py-2 flex gap-1 flex-wrap"></td>
    `;

    tabela.appendChild(tr);
    const tdAcoes = tr.children[5];

    if (statusAtual === "Pendente") {
      const btnFeito = document.createElement('button');
      btnFeito.className = "bg-green-600 px-2 py-1 rounded text-white hover:bg-green-700 text-xs sm:text-sm";
      btnFeito.textContent = "Feito";
      btnFeito.onclick = async () => { await atualizarStatus(a.id, "Feito"); carregarAgendamentos(); };

      const btnCancelar = document.createElement('button');
      btnCancelar.className = "bg-yellow-600 px-2 py-1 rounded text-white hover:bg-yellow-700 text-xs sm:text-sm";
      btnCancelar.textContent = "Cancelar";
      btnCancelar.onclick = async () => { await atualizarStatus(a.id, "Cancelado"); carregarAgendamentos(); };

      const btnEditar = document.createElement('button');
      btnEditar.className = "bg-blue-600 px-2 py-1 rounded text-white hover:bg-blue-700 text-xs sm:text-sm";
      btnEditar.textContent = "Editar";
      btnEditar.onclick = () => abrirModal(a);

      const btnExcluir = document.createElement('button');
      btnExcluir.className = "bg-red-600 px-2 py-1 rounded text-white hover:bg-red-700 text-xs sm:text-sm";
      btnExcluir.textContent = "X";
      btnExcluir.onclick = async () => {
        if (confirm("Deseja excluir este agendamento?")) {
          await fetch(`/api/agendamentos/${a.id}`, { method: "DELETE" });
          carregarAgendamentos();
        }
      };

      tdAcoes.append(btnFeito, btnCancelar, btnEditar, btnExcluir);
    }
  });
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
  const res = await fetch("/api/agendamentos/full");
  const lista = await res.json();
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
}

limparBtn.onclick = limparConcluidos;

document.addEventListener("DOMContentLoaded", () => carregarAgendamentos());
