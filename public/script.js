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
    return await res.json();
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

  // Combina data e hora no formato PostgreSQL: YYYY-MM-DD HH:MM:SS
  const [year, month, day] = dataSelecionada.split("-").map(Number);
  const [hora, minuto] = horaSelecionada.split(":").map(Number);
  const dataAgendada = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')} ${String(hora).padStart(2,'0')}:${String(minuto).padStart(2,'0')}:00`;

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
      <p><strong>Data Agendada:</strong> ${new Date(dataAgendada).toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short' })}</p>
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

// ====== BLOQUEIO DE DATAS E HORÁRIOS ======
async function configurarRestricoesDeData() {
  if (!dateInput || !horaContainer) return;

  // Aviso de horários
  const aviso = document.createElement("div");
  aviso.textContent = "Estamos atendendo somente aos finais de semana no momento";
  aviso.className = "mt-2 p-2 text-center bg-red-700 text-white rounded font-semibold";
  dateInput.insertAdjacentElement("afterend", aviso);

  function getDiaSemanaLocal(dateValue) {
    if (!dateValue) return null;
    const [year, month, day] = dateValue.split("-").map(Number);
    const d = new Date(year, month-1, day);
    return d.getDay();
  }

  // Bloqueio de dias da semana
  dateInput.addEventListener("input", () => {
    const dia = getDiaSemanaLocal(dateInput.value);
    if (dia !== 0 && dia !== 6) {
      alert("Agendamentos disponíveis apenas aos sábados e domingos.");
      dateInput.value = "";
      horaContainer.innerHTML = "";
    }
  });

  // Gerar horários disponíveis
  dateInput.addEventListener("change", async () => {
    horaSelecionada = null;
    horaContainer.innerHTML = "";
    const diaSemana = getDiaSemanaLocal(dateInput.value);
    if (diaSemana === null || (diaSemana !== 0 && diaSemana !== 6)) return;

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

    for (let h = 8; h <= 18; h += 2) {
      const hora = `${String(h).padStart(2,"0")}:00`;
      const btn = document.createElement("button");
      btn.textContent = hora;
      btn.className = "px-3 py-2 rounded text-white m-1 transition-all duration-150 " +
        (ocupados.includes(hora) ? "bg-gray-600 cursor-not-allowed opacity-60" : "bg-blue-600 hover:bg-blue-700");

      if (!ocupados.includes(hora)) {
        btn.onclick = () => {
          horaSelecionada = hora;
          document.querySelectorAll("#hora-container button").forEach(b => b.classList.remove("ring-2", "ring-yellow-400"));
          btn.classList.add("ring-2", "ring-yellow-400");
        };
      }

      horaContainer.appendChild(btn);
    }
  });
}

// ====== Inicialização ======
document.addEventListener("DOMContentLoaded", () => {
  configurarRestricoesDeData();
});
