// ===== Variáveis Globais =====
const placaContainer = document.getElementById("placa-container");
const buscarBtn = document.getElementById("buscar-placa-btn");
const placaInput = document.getElementById("placa-busca");

const formContainer = document.getElementById("form-container");
const form = document.getElementById("appointment-form");
const clienteInput = document.getElementById("cliente");
const carroInput = document.getElementById("carro");

const successContainer = document.getElementById("success-container");
const appointmentDetails = document.getElementById("appointment-details");
const newAppointmentBtn = document.getElementById("new-appointment-btn");

const dateInput = document.getElementById("appointment-date");
const dateWarning = document.getElementById("date-warning");
const horaContainer = document.getElementById("hora-container");

let horaSelect = null;
let agendamentosLista = [];
let carroSelecionado = null;

// ===== Carregar Agendamentos =====
async function carregarAgendamentos() {
  try {
    const res = await fetch("/api/agendamentos");
    if (!res.ok) throw new Error("Erro ao carregar agendamentos");
    agendamentosLista = await res.json();
  } catch (err) {
    console.error(err);
    agendamentosLista = [];
  }
}

// ===== Buscar carro pela placa =====
async function buscarCarroPorPlaca(placa) {
  if (!placa) return alert("Digite uma placa para buscar.");

  const placaRegex = /^[A-Z]{3}\d{4}$|^[A-Z]{3}\d[A-Z0-9]\d{2}$/;
  if (!placaRegex.test(placa)) return alert("Formato de placa inválido!");

  try {
    const res = await fetch(`/api/carros/${placa.toUpperCase()}`);
    if (!res.ok) {
      if (res.status === 404) {
        alert("Carro não encontrado. Cadastre-o antes de agendar.");
      } else {
        alert("Erro ao buscar carro. Tente novamente.");
      }
      resetBusca();
      return;
    }

    const carro = await res.json();

    carroSelecionado = {
      id_carro: carro.id_carro,
      placa: carro.placa,
      marca: carro.marca,
      modelo: carro.modelo,
      nome_cliente: carro.nome_cliente || ""
    };

    carroInput.value = `${carro.marca} ${carro.modelo}`;
    clienteInput.value = carro.nome_cliente || "";
    clienteInput.disabled = !!carro.nome_cliente;

    placaContainer.classList.add("hidden");
    formContainer.classList.remove("hidden");

    if (!carro.nome_cliente) clienteInput.focus();

  } catch (err) {
    alert("Erro ao buscar carro. Tente novamente.");
    console.error(err);
    resetBusca();
  }
}

// ===== Resetar busca =====
function resetBusca() {
  formContainer.classList.add("hidden");
  placaContainer.classList.remove("hidden");
  carroInput.value = "";
  clienteInput.value = "";
  carroSelecionado = null;
}

// ===== Eventos Buscar Placa =====
buscarBtn.addEventListener("click", async () => await buscarCarroPorPlaca(placaInput.value.toUpperCase().trim()));
placaInput.addEventListener("blur", async () => {
  if (placaInput.value.length >= 7) await buscarCarroPorPlaca(placaInput.value.toUpperCase().trim());
});
placaInput.addEventListener("keydown", async (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    await buscarCarroPorPlaca(placaInput.value.toUpperCase().trim());
  }
});

// ===== Seleção de horário =====
dateInput.addEventListener("change", () => {
  if (!dateInput.value) return;

  const selectedDate = new Date(dateInput.value + "T12:00");
  const day = selectedDate.getDay();

  if (day !== 0 && day !== 6) {
    dateWarning.classList.remove("hidden");
    if (horaSelect) horaSelect.remove();
    return;
  } else dateWarning.classList.add("hidden");

  if (horaSelect) horaSelect.remove();
  horaSelect = document.createElement("select");
  horaSelect.id = "appointment-hour";
  horaSelect.name = "appointment-hour";
  horaSelect.required = true;
  horaSelect.className =
    "w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-150 mb-4";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Selecione o horário";
  defaultOption.disabled = true;
  defaultOption.selected = true;
  horaSelect.appendChild(defaultOption);

  const todosHorarios = ["08:00","10:00","12:00","14:00","16:00","18:00"];
  const dataSelecionada = dateInput.value;

  const horariosOcupados = agendamentosLista
    .filter(a => a.data_agendada.startsWith(dataSelecionada))
    .map(a => a.data_agendada.substring(11,16));

  todosHorarios.forEach(h => {
    const option = document.createElement("option");
    option.value = h;
    option.textContent = h;
    if (horariosOcupados.includes(h)) {
      option.disabled = true;
      option.className = "hora-ocupada";
      option.textContent = `${h} (ocupado)`;
    }
    horaSelect.appendChild(option);
  });

  horaContainer.innerHTML = "";
  horaContainer.appendChild(horaSelect);
});

// ===== Envio de agendamento =====
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const hourValue = horaSelect ? horaSelect.value : "";
  if (!hourValue) return alert("Selecione um horário");
  if (!carroSelecionado) return alert("Selecione um carro válido");

  const nomeCliente = clienteInput.value.trim();
  if (!nomeCliente) return alert("Informe o nome do cliente.");

  const washType = document.getElementById("wash-type").value;
  if (!washType) return alert("Selecione o tipo de lavagem.");

  const [year, month, day] = dateInput.value.split("-");
  const dataHoraFormatada = `${year}-${month}-${day} ${hourValue}:00`;

  const data = {
    id_carro: carroSelecionado.id_carro,
    id_cliente: null, // por enquanto o cliente não precisa de ID
    tipo_lavagem: washType,
    data_agendada: dataHoraFormatada
  };

  try {
    const res = await fetch("/api/agendamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || "Erro ao enviar agendamento");

    const [datePart, timePart] = dataHoraFormatada.split(" ");
    const [yyyy, mm, dd] = datePart.split("-");
    const dataFormatadaBR = `${dd}/${mm}/${yyyy} ${timePart.substring(0, 5)}`;

    form.style.display = "none";
    appointmentDetails.innerHTML = `
      <p><strong>Cliente / Carro:</strong> ${nomeCliente} (${carroSelecionado.marca} ${carroSelecionado.modelo})</p>
      <p><strong>Tipo de lavagem:</strong> ${washType}</p>
      <p><strong>Data e hora agendada:</strong> ${dataFormatadaBR}</p>
    `;
    successContainer.classList.remove("hidden");
    await carregarAgendamentos();
  } catch (err) {
    alert(err.message || "Erro ao enviar agendamento.");
    console.error(err);
  }
});

// ===== Resetar formulário =====
newAppointmentBtn.addEventListener("click", () => {
  form.reset();
  form.style.display = "block";
  successContainer.classList.add("hidden");
  if (horaSelect) horaSelect.remove();
  placaContainer.classList.remove("hidden");
  placaInput.value = "";
  carroSelecionado = null;
  clienteInput.value = "";
  clienteInput.disabled = false;
  carroInput.value = "";
});

// ===== Inicialização =====
async function inicializar() {
  await carregarAgendamentos();
}
inicializar();
