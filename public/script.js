// ====== Variáveis globais ======
const form = document.getElementById("appointment-form");
const successContainer = document.getElementById("success-container");
const appointmentDetails = document.getElementById("appointment-details");
const newAppointmentBtn = document.getElementById("new-appointment-btn");

const buscarBtn = document.getElementById("buscar-placa-btn");
const placaInput = document.getElementById("placa-busca");

let horaSelect = null;
let clientesLista = []; // Lista de clientes carregada

// ====== Função para carregar clientes ======
async function carregarClientes() {
  try {
    const res = await fetch("/api/clientes");
    clientesLista = await res.json(); // Atualiza a lista global
    return clientesLista;
  } catch (err) {
    console.error("Erro ao carregar clientes:", err);
    return [];
  }
}

// ====== Buscar carro pela placa ======
if (buscarBtn) {
  buscarBtn.addEventListener("click", async () => {
    const placa = placaInput.value.toUpperCase().trim();

    if (!placa) return alert("Digite uma placa para buscar.");

    const placaRegex = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;
    if (!placaRegex.test(placa)) return alert("Formato de placa inválido! Use ABC1D23.");

    try {
      const res = await fetch(`/api/carro/${placa}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Carro não encontrado. Cadastre-o antes de agendar.");
        throw new Error("Erro ao buscar o carro. Tente novamente.");
      }
      const data = await res.json();

      // Preenche os campos automaticamente
      document.getElementById("name").value = data.nome_completo || "";
      document.getElementById("car-model").value = `${data.marca || ""} ${data.modelo || ""}`.trim();

      alert(`✅ Carro encontrado: ${data.marca} ${data.modelo} (${data.nome_completo})`);
    } catch (err) {
      alert(err.message);
      document.getElementById("name").value = "";
      document.getElementById("car-model").value = "";
    }
  });
}

// ====== Criação do select de horário ======
const dateInput = document.getElementById("appointment-date");
dateInput.addEventListener("change", () => {
  const selectedDate = dateInput.value;
  if (!selectedDate) return;

  if (horaSelect) horaSelect.remove();

  horaSelect = document.createElement("select");
  horaSelect.id = "appointment-hour";
  horaSelect.name = "appointment-hour";
  horaSelect.required = true;
  horaSelect.className =
    "w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-150 mb-4";

  const optionDefault = document.createElement("option");
  optionDefault.value = "";
  optionDefault.textContent = "Selecione o horário";
  optionDefault.disabled = true;
  optionDefault.selected = true;
  horaSelect.appendChild(optionDefault);

  for (let h = 8; h <= 18; h += 2) {
    const option = document.createElement("option");
    option.value = `${String(h).padStart(2, "0")}:00`;
    option.textContent = `${String(h).padStart(2, "0")}:00`;
    horaSelect.appendChild(option);
  }

  dateInput.parentNode.insertBefore(horaSelect, dateInput.nextSibling);
});

// ====== Envio de agendamento ======
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const hourValue = horaSelect ? horaSelect.value : "";
  if (!hourValue) return alert("Selecione um horário para o agendamento");

  const data = {
    name: document.getElementById("name").value,
    carModel: document.getElementById("car-model").value,
    washType: document.getElementById("wash-type").value,
    appointmentDate: `${document.getElementById("appointment-date").value} ${hourValue}`,
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
      <p><strong>Data e hora agendada:</strong> ${data.appointmentDate}</p>
    `;
    successContainer.classList.remove("hidden");
  } catch (err) {
    alert(err.message || "Erro ao enviar agendamento.");
  }
});

newAppointmentBtn.addEventListener("click", () => {
  form.reset();
  form.style.display = "block";
  successContainer.classList.add("hidden");
  if (horaSelect) horaSelect.remove();
});

// ====== Carregar tabela de agendamentos ======
async function carregarAgendamentos() {
  if (!tabela) return;

  try {
    const res = await fetch("/api/listar");
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) throw new Error("Resposta inesperada do servidor.");

    const lista = await res.json();
    tabela.innerHTML = "";

    lista.forEach(a => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="px-4 py-2">${a.id}</td>
        <td class="px-4 py-2">${a.nome_cliente}</td>
        <td class="px-4 py-2">${a.modelo_carro}</td>
        <td class="px-4 py-2">${a.tipo_lavagem}</td>
        <td class="px-4 py-2">${a.data_agendada}</td>
        <td class="px-4 py-2">${new Date(a.data_registro).toLocaleString()}</td>
        <td class="px-4 py-2">
          <button class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded" onclick="excluirAgendamento(${a.id})">
            Excluir
          </button>
        </td>
      `;
      tabela.prepend(tr);
    });
  } catch (err) {
    console.error("Erro ao carregar agendamentos:", err);
  }
}

// ====== Excluir agendamento ======
async function excluirAgendamento(id) {
  if (!confirm("Deseja realmente excluir este agendamento?")) return;

  try {
    const res = await fetch(`/api/agendar/${id}`, { method: "DELETE" });
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) throw new Error("Resposta inesperada do servidor.");

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao excluir agendamento");

    alert(data.message);
    carregarAgendamentos();
  } catch (err) {
    alert(err.message);
  }
}

// ====== Inicialização ======
async function inicializar() {
  await carregarClientes(); // Garante que clientes estão carregados
  carregarAgendamentos();   // Carrega agendamentos depois
}

inicializar();
