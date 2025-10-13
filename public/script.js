const form = document.getElementById("appointment-form");
const successContainer = document.getElementById("success-container");
const appointmentDetails = document.getElementById("appointment-details");
const newAppointmentBtn = document.getElementById("new-appointment-btn");
const placaInput = document.createElement("input");

// Criar input para placa no formulário
const placaDiv = document.createElement("div");
placaDiv.innerHTML = `
  <label for="placa" class="block text-sm font-medium text-slate-300 mb-2">Placa do Veículo</label>
  <input type="text" id="placa" name="placa" placeholder="AAA9999"
         class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-150">
  <button type="button" id="buscar-placa"
          class="mt-2 bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 transition duration-150">Consultar Placa</button>
`;
form.prepend(placaDiv);

const placaBtn = document.getElementById("buscar-placa");

// --- Consulta de placa ---
placaBtn.addEventListener("click", async () => {
  const placa = document.getElementById("placa").value.trim().toUpperCase();
  if (!placa) {
    alert("Informe a placa para consulta");
    return;
  }

  try {
    const res = await fetch("/api/consulta-placa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placa })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao consultar placa");

    // Preencher automaticamente o campo "Modelo do Carro"
    const modeloInput = document.getElementById("car-model");
    modeloInput.value = data.marca + " " + data.modelo;

  } catch (err) {
    console.error("Erro na consulta de placa:", err);
    alert(err.message || "Erro ao consultar placa");
  }
});

// --- Envio de agendamento ---
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    name: document.getElementById("name").value,
    carModel: document.getElementById("car-model").value,
    washType: document.getElementById("wash-type").value,
    appointmentDate: document.getElementById("appointment-date").value
  };

  try {
    const res = await fetch("/api/agendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Resposta inesperada do servidor.");
    }

    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || "Erro ao enviar agendamento");

    form.style.display = "none";
    appointmentDetails.innerHTML = `
      <p><strong>Nome:</strong> ${data.name}</p>
      <p><strong>Carro:</strong> ${data.carModel}</p>
      <p><strong>Tipo de lavagem:</strong> ${data.washType}</p>
      <p><strong>Data agendada:</strong> ${data.appointmentDate}</p>
    `;
    successContainer.classList.remove("hidden");

  } catch (err) {
    console.error("Erro ao enviar:", err);
    alert(err.message || "Erro ao enviar agendamento. Tente novamente.");
  }
});

// --- Novo agendamento ---
newAppointmentBtn.addEventListener("click", () => {
  form.reset();
  form.style.display = "block";
  successContainer.classList.add("hidden");
});
