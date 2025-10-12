// Pega elementos do HTML
const form = document.getElementById("appointment-form");
const successContainer = document.getElementById("success-container");
const appointmentDetails = document.getElementById("appointment-details");
const newAppointmentBtn = document.getElementById("new-appointment-btn");
const appointmentsList = document.getElementById("appointments-list"); // div opcional para listar agendamentos

// URL do backend
const API_URL = "https://fourfun-agendamentos-h9v3.onrender.com";

// --- Função para enviar agendamento ---
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    nome_cliente: document.getElementById("name").value,
    modelo_carro: document.getElementById("car-model").value,
    tipo_lavagem: document.getElementById("wash-type").value,
    data_agendada: document.getElementById("appointment-date").value
  };

  try {
    const res = await fetch(`${API_URL}/agendamentos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Erro desconhecido");
    }


    // Mostrar mensagem de sucesso
    form.style.display = "none";
    appointmentDetails.innerHTML = `
      <p><strong>Nome:</strong> ${data.nome_cliente}</p>
      <p><strong>Carro:</strong> ${data.modelo_carro}</p>
      <p><strong>Tipo de lavagem:</strong> ${data.tipo_lavagem}</p>
      <p><strong>Data agendada:</strong> ${data.data_agendada}</p>
    `;
    successContainer.classList.remove("hidden");

    // Atualiza a lista de agendamentos
    fetchAppointments();

  } catch (err) {
    alert(err.message);
  }
});

// --- Botão para novo agendamento ---
newAppointmentBtn.addEventListener("click", () => {
  form.reset();
  form.style.display = "block";
  successContainer.classList.add("hidden");
});

// --- Função para listar todos os agendamentos ---
async function fetchAppointments() {
  try {
    const res = await fetch(`${API_URL}/agendamentos`);
    const appointments = await res.json();

    if (!appointmentsList) return; // se não houver div para lista, ignora

    appointmentsList.innerHTML = ""; // limpa lista antes de renderizar
    appointments.forEach(app => {
      const div = document.createElement("div");
      div.className = "p-2 border-b border-slate-700";
      div.innerHTML = `
        <p><strong>Nome:</strong> ${app.nome_cliente}</p>
        <p><strong>Carro:</strong> ${app.modelo_carro}</p>
        <p><strong>Tipo:</strong> ${app.tipo_lavagem}</p>
        <p><strong>Data agendada:</strong> ${app.data_agendada}</p>
        <p class="text-sm text-slate-400">Registrado em: ${new Date(app.data_registro).toLocaleString()}</p>
      `;
      appointmentsList.appendChild(div);
    });
  } catch (err) {
    console.error("Erro ao buscar agendamentos:", err);
  }
}

// --- Chamada inicial para carregar lista ao abrir a página ---
fetchAppointments();
