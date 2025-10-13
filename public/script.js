const form = document.getElementById("appointment-form");
const successContainer = document.getElementById("success-container");
const appointmentDetails = document.getElementById("appointment-details");
const newAppointmentBtn = document.getElementById("new-appointment-btn");

// --- Campo de busca de placa ---
const buscarBtn = document.getElementById("buscar-placa-btn");
const placaInput = document.getElementById("placa-busca");

// Buscar carro pela placa e preencher os dados automaticamente
if (buscarBtn) {
  buscarBtn.addEventListener("click", async () => {
    const placa = placaInput.value.toUpperCase().trim();
    if (!placa) {
      alert("Digite uma placa para buscar");
      return;
    }

    try {
      const res = await fetch(`/api/carro/${placa}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Carro não encontrado");

      // Preenche os campos automaticamente
      document.getElementById("name").value = data.nome_cliente || "";
      document.getElementById("car-model").value = `${data.marca || ""} ${data.modelo || ""}`.trim();

    } catch (err) {
      alert(err.message);
    }
  });
}

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
    const res = await fetch(`/api/agendar`, {
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

    // ✅ Mostrar mensagem de sucesso
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
