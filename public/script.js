const form = document.getElementById("appointment-form");
const successContainer = document.getElementById("success-container");
const appointmentDetails = document.getElementById("appointment-details");
const newAppointmentBtn = document.getElementById("new-appointment-btn");

// URL do backend no Render
const API_URL = "https://fourfun-agendamentos-h9v3.onrender.com";

// --- Envio de agendamento ---
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

    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error || "Erro ao enviar agendamento");

    // Mostrar mensagem de sucesso
    form.style.display = "none";
    appointmentDetails.innerHTML = `
      <p><strong>Nome:</strong> ${data.nome_cliente}</p>
      <p><strong>Carro:</strong> ${data.modelo_carro}</p>
      <p><strong>Tipo de lavagem:</strong> ${data.tipo_lavagem}</p>
      <p><strong>Data agendada:</strong> ${data.data_agendada}</p>
    `;
    successContainer.classList.remove("hidden");

  } catch (err) {
    alert(err.message);
  }
});

// --- Novo agendamento ---
newAppointmentBtn.addEventListener("click", () => {
  form.reset();
  form.style.display = "block";
  successContainer.classList.add("hidden");
});
