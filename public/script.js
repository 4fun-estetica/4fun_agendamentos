// ====== ELEMENTOS GLOBAIS ======
const placaInput = document.getElementById('placa-busca');
const buscarBtn = document.getElementById('buscar-placa-btn');
const placaContainer = document.getElementById('placa-container');
const formContainer = document.getElementById('form-container');
const appointmentForm = document.getElementById('appointment-form');
const clienteInput = document.getElementById('cliente');
const telefoneContainer = document.getElementById('telefone-container');
const telefoneInput = document.getElementById('telefone');
const carroInput = document.getElementById('carro');
const washTypeSelect = document.getElementById('wash-type');
const dateInput = document.getElementById('appointment-date');
const horaContainer = document.getElementById('hora-container');
const successContainer = document.getElementById('success-container');
const appointmentDetails = document.getElementById('appointment-details');
const newAppointmentBtn = document.getElementById('new-appointment-btn');

let carroAtual = null;
let horaSelecionada = null;

// ====== Máscara de telefone ======
telefoneInput?.addEventListener('input', () => {
  let valor = telefoneInput.value.replace(/\D/g, "");
  if (valor.length > 10) {
    valor = valor.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
  } else if (valor.length > 5) {
    valor = valor.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
  } else if (valor.length > 2) {
    valor = valor.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  } else {
    valor = valor.replace(/^(\d*)/, "($1");
  }
  telefoneInput.value = valor;
});

// ====== Buscar carro por placa ======
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

  // Se o carro tiver cliente com telefone cadastrado, preenche automaticamente
  if (carro.id_cliente) {
    try {
      const res = await fetch(`/api/clientes`);
      const clientes = await res.json();
      const cliente = clientes.find(c => c.id_cliente === carro.id_cliente);
      if (cliente?.celular) {
        telefoneInput.value = cliente.celular;
        telefoneContainer.classList.add('hidden');
      } else {
        telefoneContainer.classList.remove('hidden');
      }
    } catch (e) {
      console.error("Erro ao buscar telefone:", e);
      telefoneContainer.classList.remove('hidden');
    }
  } else {
    telefoneContainer.classList.remove('hidden');
  }
};

// ====== Cadastrar agendamento ======
appointmentForm.onsubmit = async (e) => {
  e.preventDefault();
  const nomeCliente = clienteInput.value.trim();
  const tipoLavagem = washTypeSelect.value;
  const dataSelecionada = dateInput.value;
  const telefone = telefoneInput.value.trim();

  if (!nomeCliente || !tipoLavagem || !dataSelecionada || !horaSelecionada) {
    return alert("Preencha todos os campos obrigatórios e selecione um horário.");
  }
  if (telefoneContainer.classList.contains('hidden') === false && telefone === '') {
    return alert("Informe o telefone para continuar.");
  }

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
        telefone,
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
      <p><strong>Telefone:</strong> ${telefone || "—"}</p>
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

// ====== BLOQUEIO DE DATAS E HORÁRIOS ======
async function configurarRestricoesDeData() {
  if (!dateInput || !horaContainer) return;

  // Bloquear datas anteriores a hoje
  const hoje = new Date().toISOString().split("T")[0];
  dateInput.setAttribute("min", hoje);

  function getDiaSemanaLocal(dateValue) {
    if (!dateValue) return null;
    const [year, month, day] = dateValue.split("-").map(Number);
    return new Date(year, month-1, day).getDay();
  }

  dateInput.addEventListener("change", async () => {
  horaSelecionada = null;
  horaContainer.innerHTML = "";
  const diaSemana = getDiaSemanaLocal(dateInput.value);
  if (diaSemana !== 0 && diaSemana !== 6) {
    alert("Agendamentos disponíveis apenas aos sábados e domingos.");
    dateInput.value = "";
    return;
  }

  let agendamentos = [];
  try {
    const res = await fetch("/api/agendamentos/full");
    if (res.ok) agendamentos = await res.json();
  } catch (err) {
    console.error("Erro ao buscar agendamentos:", err);
  }

  // Filtra apenas agendamentos da data selecionada e com status 'Pendente'
  const ocupados = agendamentos
    .filter(a => 
      a.data_agendada &&
      a.status &&
      a.status.toLowerCase() === "pendente"
    )
    .map(a => {
      const d = new Date(a.data_agendada);
      const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
      return {
        data: localDate.toISOString().split("T")[0],
        hora: `${String(localDate.getHours()).padStart(2, "0")}:00`
      };
    })
    .filter(a => a.data === dateInput.value)
    .map(a => a.hora);

  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const grid = document.createElement("div");
  grid.className = "grid grid-cols-4 gap-2 mt-2";

  for (let h = 8; h <= 18; h += 2) {
    const hora = `${String(h).padStart(2, "0")}:00`;
    const btn = document.createElement("button");
    btn.textContent = hora;
    btn.className = "px-3 py-2 rounded text-white transition-all duration-150";

    const horaJaPassou = dateInput.value === today && h <= now.getHours();
    const ocupado = ocupados.includes(hora);

    if (ocupado || horaJaPassou) {
      btn.className += " bg-slate-600 cursor-not-allowed opacity-70 font-semibold";
      btn.disabled = true;
      if (ocupado) btn.title = "Horário ocupado";
      else btn.title = "Horário já passou";
    } else {
      btn.className += " bg-blue-600 hover:bg-blue-700";
      btn.type = "button";
      btn.onclick = () => {
        horaSelecionada = hora;
        grid.querySelectorAll("button").forEach(b => b.classList.remove("ring-2", "ring-yellow-400"));
        btn.classList.add("ring-2", "ring-yellow-400");
      };
    }

    grid.appendChild(btn);
  }

  horaContainer.appendChild(grid);
});

}

// ====== Inicialização ======
document.addEventListener("DOMContentLoaded", () => {
  configurarRestricoesDeData();
});