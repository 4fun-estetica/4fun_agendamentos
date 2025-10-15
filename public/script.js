// ====== Variáveis globais ======
const form = document.getElementById("appointment-form");
const successContainer = document.getElementById("success-container");
const appointmentDetails = document.getElementById("appointment-details");
const newAppointmentBtn = document.getElementById("new-appointment-btn");

const buscarBtn = document.getElementById("buscar-placa-btn");
const placaInput = document.getElementById("placa-busca");
const horaContainer = document.getElementById("hora-container");
const dateInput = document.getElementById("appointment-date");
const dateWarning = document.getElementById("date-warning");

let horaSelect = null;
let clientesLista = [];
let agendamentosLista = [];

// ====== Função para carregar clientes ======
async function carregarClientes() {
  try {
    const res = await fetch("/api/clientes");
    clientesLista = await res.json();
  } catch (err) {
    console.error("Erro ao carregar clientes:", err);
  }
}

// ====== Função para carregar agendamentos ======
async function carregarAgendamentos() {
  try {
    const res = await fetch("/api/listar");
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json"))
      throw new Error("Resposta inesperada do servidor.");

    const lista = await res.json();
    agendamentosLista = lista;
  } catch (err) {
    console.error("Erro ao carregar agendamentos:", err);
  }
}

// ====== Buscar carro pela placa ======
if (buscarBtn && placaInput) {
  async function buscarCarroPorPlaca(placa) {
    if (!placa) return alert("Digite uma placa para buscar.");

    const placaRegex = /^[A-Z]{3}\d{4}$|^[A-Z]{3}\d[A-Z0-9]\d{2}$/;
    if (!placaRegex.test(placa))
      return alert("Formato de placa inválido! Use ABC1234 ou ABC1D23.");

    try {
      const res = await fetch(`/api/carro/${placa}`);
      if (!res.ok) {
        if (res.status === 404)
          throw new Error("Carro não encontrado. Cadastre-o antes de agendar.");
        throw new Error("Erro ao buscar o carro. Tente novamente.");
      }

      const data = await res.json();
      document.getElementById("name").value = data.nome_completo || "";
      document.getElementById("car-model").value = `${data.marca || ""} ${data.modelo || ""}`.trim();

      buscarBtn.textContent = "Encontrado ✅";
      buscarBtn.classList.add("bg-green-600");
      setTimeout(() => {
        buscarBtn.textContent = "Buscar";
        buscarBtn.classList.remove("bg-green-600");
      }, 2000);
    } catch (err) {
      alert(err.message);
      document.getElementById("name").value = "";
      document.getElementById("car-model").value = "";
    }
  }

  buscarBtn.addEventListener("click", async () => {
    await buscarCarroPorPlaca(placaInput.value.toUpperCase().trim());
  });

  placaInput.addEventListener("blur", async () => {
    const placa = placaInput.value.toUpperCase().trim();
    if (placa.length >= 7) await buscarCarroPorPlaca(placa);
  });

  placaInput.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      await buscarCarroPorPlaca(placaInput.value.toUpperCase().trim());
    }
  });
}

// ====== Seleção de horário ======
dateInput.addEventListener("change", () => {
  if (!dateInput.value) return;

  const selectedDate = new Date(dateInput.value + "T12:00"); // Meio-dia para evitar problemas de fuso
  const day = selectedDate.getDay(); // 0 = Domingo, 6 = Sábado

  // Permite apenas sábado ou domingo
  if (day !== 0 && day !== 6) {
    dateWarning.textContent =
      "Atualmente atendemos apenas nos finais de semana (sábado e domingo). Por favor, escolha outra data.";
    dateWarning.classList.remove("hidden");
    if (horaSelect) horaSelect.remove();
    return;
  } else {
    dateWarning.classList.add("hidden");
  }

  // Remove select anterior
  if (horaSelect) horaSelect.remove();

  // Criação do select de horário
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

  const todosHorarios = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"];
  const dataSelecionada = dateInput.value;
  const horariosOcupados = agendamentosLista
    .filter((a) => a.data_agendada.startsWith(dataSelecionada))
    .map((a) => a.data_agendada.slice(11, 16));

  todosHorarios.forEach((h) => {
    const option = document.createElement("option");
    option.value = h;
    option.textContent = h;

    if (horariosOcupados.includes(h)) {
      option.disabled = true;
      option.className = "hora-ocupada";
      option.textContent = h + " (ocupado)";
    }

    horaSelect.appendChild(option);
  });

  horaContainer.innerHTML = "";
  horaContainer.appendChild(horaSelect);
});

// ====== Envio de agendamento ======
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const hourValue = horaSelect ? horaSelect.value : "";
  if (!hourValue) return alert("Selecione um horário para o agendamento");

  const dataHoraLocal = new Date(`${dateInput.value}T${hourValue}:00`);
  const offset = dataHoraLocal.getTimezoneOffset() * 60000;
  const dataHoraUTC = new Date(dataHoraLocal.getTime() - offset)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  const data = {
    name: document.getElementById("name").value,
    carModel: document.getElementById("car-model").value,
    washType: document.getElementById("wash-type").value,
    appointmentDate: dataHoraUTC,
  };

  try {
    const res = await fetch("/api/agendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || "Erro ao enviar agendamento");

    form.style.display = "none";
    appointmentDetails.innerHTML = `
      <p><strong>Nome:</strong> ${data.name}</p>
      <p><strong>Carro:</strong> ${data.carModel}</p>
      <p><strong>Tipo de lavagem:</strong> ${data.washType}</p>
      <p><strong>Data e hora agendada:</strong> ${dateInput.value} ${hourValue}</p>
    `;
    successContainer.classList.remove("hidden");

    await carregarAgendamentos();
  } catch (err) {
    alert(err.message || "Erro ao enviar agendamento.");
  }
});

// ====== Resetar formulário ======
newAppointmentBtn.addEventListener("click", () => {
  form.reset();
  form.style.display = "block";
  successContainer.classList.add("hidden");
  if (horaSelect) horaSelect.remove();
});

// ====== Excluir agendamento ======
async function excluirAgendamento(id) {
  if (!confirm("Deseja realmente excluir este agendamento?")) return;

  try {
    const res = await fetch(`/api/agendar/${id}`, { method: "DELETE" });
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json"))
      throw new Error("Resposta inesperada do servidor.");

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao excluir agendamento");

    alert(data.message);
    await carregarAgendamentos();
  } catch (err) {
    alert(err.message);
  }
}

// ====== Inicialização ======
async function inicializar() {
  await carregarClientes();
  await carregarAgendamentos();
}

inicializar();
