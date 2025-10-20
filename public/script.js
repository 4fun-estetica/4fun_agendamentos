// ====== ELEMENTOS GLOBAIS ======
const placaInput = document.getElementById('placa-busca');
const buscarBtn = document.getElementById('buscar-placa-btn');
const placaContainer = document.getElementById('placa-container');
const formContainer = document.getElementById('form-container');
const appointmentForm = document.getElementById('appointment-form');
const clienteInput = document.getElementById('cliente');
const carroInput = document.getElementById('carro');
const washTypeSelect = document.getElementById('wash-type');
const dateInput = document.getElementById('appointment-date');
const horaContainer = document.getElementById('hora-container');
const successContainer = document.getElementById('success-container');
const appointmentDetails = document.getElementById('appointment-details');
const newAppointmentBtn = document.getElementById('new-appointment-btn');

let carroAtual = null;
let horaSelecionada = null;

// ====== BUSCAR CARRO POR PLACA ======
async function buscarCarro(placa) {
  try {
    const res = await fetch(`/api/carros/${placa}`);
    if (res.status === 404) {
      if (confirm("Carro não encontrado. Deseja cadastrar?")) {
        window.location.href = "/cadastra_carro.html";
      }
      return null;
    }
    if (!res.ok) throw new Error("Erro ao buscar carro");
    const carro = await res.json();
    return carro;
  } catch (err) {
    console.error(err);
    alert("Erro ao buscar carro.");
    return null;
  }
}

buscarBtn.onclick = async () => {
  const placa = placaInput.value.trim().toUpperCase();
  if (!placa) return alert("Informe a placa do carro.");

  const carro = await buscarCarro(placa);
  if (!carro) return;

  carroAtual = carro;
  placaContainer.classList.add('hidden');
  formContainer.classList.remove('hidden');

  clienteInput.value = carro.nome_cliente || '';
  carroInput.value = `${carro.marca || ''} ${carro.modelo || ''} (${carro.placa}) ${carro.ano || ''}`;
};

// ====== CADASTRAR AGENDAMENTO ======
appointmentForm.onsubmit = async (e) => {
  e.preventDefault();

  const nomeCliente = clienteInput.value.trim();
  const tipoLavagem = washTypeSelect.value;
  const dataSelecionada = dateInput.value;

  if (!nomeCliente || !tipoLavagem || !dataSelecionada || !horaSelecionada) {
    return alert("Preencha todos os campos obrigatórios e selecione um horário.");
  }

  // Combina data e hora em ISO para enviar ao servidor
  const [year, month, day] = dataSelecionada.split("-").map(Number);
  const [hora, minuto] = horaSelecionada.split(":").map(Number);
  const dataAgendada = new Date(year, month - 1, day, hora, minuto, 0, 0).toISOString();

  try {
    const res = await fetch("/api/agendamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_carro: carroAtual.id_carro,
        id_cliente: carroAtual.id_cliente,
        nome_cliente: nomeCliente,
        tipo_lavagem: tipoLavagem,
        data_agendada: dataAgendada
      })
    });

    if (!res.ok) {
      const err = await res.json();
      return alert(err.error || "Erro ao cadastrar agendamento.");
    }

    formContainer.classList.add('hidden');
    successContainer.classList.remove('hidden');
    appointmentDetails.innerHTML = `
      <p><strong>Cliente:</strong> ${nomeCliente}</p>
      <p><strong>Carro:</strong> ${carroInput.value}</p>
      <p><strong>Serviço:</strong> ${tipoLavagem}</p>
      <p><strong>Data Agendada:</strong> ${new Date(dataAgendada).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>
    `;
  } catch (err) {
    console.error(err);
    alert("Erro ao cadastrar agendamento.");
  }
};

// ====== NOVO AGENDAMENTO ======
newAppointmentBtn.onclick = () => {
  successContainer.classList.add('hidden');
  placaContainer.classList.remove('hidden');
  placaInput.value = '';
  carroInput.value = '';
  clienteInput.value = '';
  washTypeSelect.value = '';
  dateInput.value = '';
  horaContainer.innerHTML = '';
  carroAtual = null;
  horaSelecionada = null;
};

// ====== FORMATAÇÃO DE DATAS ======
function formatarDataBR(dataString) {
  if (!dataString) return '-';
  const data = new Date(dataString);
  if (isNaN(data)) return '-';
  return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ====== AGENDAMENTOS ======
async function carregarAgendamentos() {
  const tabela = document.getElementById('tabela-agendamentos');
  if (!tabela) return;

  try {
    const res = await fetch("/api/agendamentos/full");
    if (!res.ok) throw new Error("Erro ao carregar agendamentos");
    const lista = await res.json();

    tabela.innerHTML = '';
    lista.sort((a,b) => new Date(b.data_agendada) - new Date(a.data_agendada));

    lista.forEach(a => {
      const tr = document.createElement('tr');
      tr.className = "bg-slate-800/80";

      const carroText = a.marca ? `${a.marca} ${a.modelo} (${a.placa || "-"}) ${a.ano || ""}` : "-";
      const statusAtual = a.status || "Pendente";

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

      if(statusAtual === "Feito") tr.style.backgroundColor = "#064e3b";
      else if(statusAtual === "Cancelado") tr.style.backgroundColor = "#78350f";

      if(statusAtual === "Pendente"){
        const btnFeito = document.createElement('button');
        btnFeito.className = "bg-green-600 px-2 py-1 rounded text-white hover:bg-green-700 text-xs sm:text-sm";
        btnFeito.textContent = "Feito";
        btnFeito.onclick = async () => { await atualizarStatus(a.id_agendamento,"Feito"); carregarAgendamentos(); };

        const btnCancelar = document.createElement('button');
        btnCancelar.className = "bg-yellow-600 px-2 py-1 rounded text-white hover:bg-yellow-700 text-xs sm:text-sm";
        btnCancelar.textContent = "Cancelar";
        btnCancelar.onclick = async () => { await atualizarStatus(a.id_agendamento,"Cancelado"); carregarAgendamentos(); };

        const btnEditar = document.createElement('button');
        btnEditar.className = "bg-blue-600 px-2 py-1 rounded text-white hover:bg-blue-700 text-xs sm:text-sm";
        btnEditar.textContent = "Editar";
        btnEditar.onclick = () => abrirModal(a);

        const btnExcluir = document.createElement('button');
        btnExcluir.className = "bg-red-600 px-2 py-1 rounded text-white hover:bg-red-700 text-xs sm:text-sm";
        btnExcluir.textContent = "X";
        btnExcluir.onclick = async () => {
          if(confirm("Deseja excluir este agendamento?")){
            await fetch(`/api/agendamentos/${a.id_agendamento}`, { method:"DELETE" });
            carregarAgendamentos();
          }
        };

        tdAcoes.append(btnFeito, btnCancelar, btnEditar, btnExcluir);
      }
    });

  } catch (err) {
    console.error(err);
    alert("Erro ao carregar agendamentos.");
  }
}

async function atualizarStatus(id,status){
  await fetch(`/api/agendamentos/${id}/status`, {
    method:"PUT",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({status})
  });
}

// ====== BLOQUEIO DE DATAS E HORÁRIOS ======
async function configurarRestricoesDeData() {
  if (!dateInput || !horaContainer) return;

  // Mensagem de aviso
  const aviso = document.createElement("div");
  aviso.textContent = "Estamos atendendo somente aos finais de semana no momento";
  aviso.className = "mt-2 p-2 text-center bg-red-700 text-white rounded font-semibold";
  dateInput.insertAdjacentElement("afterend", aviso);

  // Função para pegar dia da semana
  function getDiaSemanaLocal(dateValue) {
    if (!dateValue) return null;
    const [year, month, day] = dateValue.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    return d.getDay();
  }

  // Evitar dias de semana
  dateInput.addEventListener("input", () => {
    const dia = getDiaSemanaLocal(dateInput.value);
    if (dia !== 0 && dia !== 6) {
      alert("Agendamentos disponíveis apenas aos sábados e domingos.");
      dateInput.value = "";
      horaContainer.innerHTML = "";
    }
  });

  // Carregar horários
  dateInput.addEventListener("change", async () => {
    horaSelecionada = null;
    horaContainer.innerHTML = "";
    const diaSemana = getDiaSemanaLocal(dateInput.value);
    if (diaSemana === null || (diaSemana !== 0 && diaSemana !== 6)) return;

    // Buscar agendamentos ocupados
    let agendamentos = [];
    try {
      const res = await fetch("/api/agendamentos/full");
      if (res.ok) agendamentos = await res.json();
    } catch (err) {
      console.error("Erro ao buscar agendamentos:", err);
    }

    const ocupados = agendamentos
      .filter(a => a.data_agendada?.startsWith(dateInput.value))
      .map(a => {
        const d = new Date(a.data_agendada);
        return `${String(d.getHours()).padStart(2,'0')}:00`;
      });

    // Criar botões de horário (08:00 - 18:00 de 2h em 2h)
    for (let h = 8; h <= 18; h += 2) {
      const hora = `${String(h).padStart(2,"0")}:00`;
      const btn = document.createElement("button");
      btn.textContent = hora;
      btn.className = "px-3 py-2 rounded text-white m-1 transition-all duration-150 " +
        (ocupados.includes(hora)
          ? "bg-gray-600 cursor-not-allowed opacity-60"
          : "bg-blue-600 hover:bg-blue-700");

      if (!ocupados.includes(hora)) {
        btn.onclick = () => {
          horaSelecionada = hora; // salva apenas hora
          document.querySelectorAll("#hora-container button").forEach(b =>
            b.classList.remove("ring-2", "ring-yellow-400")
          );
          btn.classList.add("ring-2", "ring-yellow-400");
        };
      }

      horaContainer.appendChild(btn);
    }
  });
}

// ====== Inicialização ======
document.addEventListener("DOMContentLoaded", () => {
  carregarAgendamentos();
  configurarRestricoesDeData();
});
