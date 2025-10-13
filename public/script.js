const form = document.getElementById("appointment-form");
const successContainer = document.getElementById("success-container");
const appointmentDetails = document.getElementById("appointment-details");
const newAppointmentBtn = document.getElementById("new-appointment-btn");

// --- Envio de agendamento ---
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // ✅ Nomes de campos compatíveis com o backend
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

    // Caso o servidor retorne HTML por algum erro, evita o parse incorreto
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
