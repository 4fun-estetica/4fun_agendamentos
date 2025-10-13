const form = document.getElementById("appointment-form");
const successContainer = document.getElementById("success-container");
const appointmentDetails = document.getElementById("appointment-details");
const newAppointmentBtn = document.getElementById("new-appointment-btn");

// Campo e botão de consulta de placa
const plateInput = document.getElementById("plate");
const checkPlateBtn = document.getElementById("check-plate");
const placaResult = document.getElementById("placa-result");
const carModelInput = document.getElementById("car-model");

// --- Consulta de placa ---
checkPlateBtn.addEventListener("click", async () => {
  const placa = plateInput.value.trim().toUpperCase();
  if (!placa) {
    placaResult.innerHTML = "<p class='text-red-500'>Digite a placa</p>";
    return;
  }

  try {
    const res = await fetch("/api/consulta-placa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placa })
    });

    const data = await res.json();

    if (res.ok) {
      placaResult.innerHTML = `
        <p><strong>Marca:</strong> ${data.marca}</p>
        <p><strong>Modelo:</strong> ${data.modelo}</p>
        <p><strong>Ano Modelo:</strong> ${data.ano_modelo}</p>
        <p><strong>Cor:</strong> ${data.cor}</p>
        <p><strong>Município/UF:</strong> ${data.municipio} / ${data.uf_municipio}</p>
      `;
      carModelInput.value = data.modelo; // preenche automaticamente
    } else {
      placaResult.innerHTML = `<p class="text-red-500">${data.error || "Erro ao consultar placa"}</p>`;
      carModelInput.value = "";
    }

  } catch (err) {
    console.error("Erro ao consultar placa:", err);
    placaResult.innerHTML = `<p class="text-red-500">Não foi possível consultar a placa</p>`;
    carModelInput.value = "";
  }
});

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
      <p><strong>Nome:</strong> ${data.nome_cliente}</p>
      <p><strong>Carro:</strong> ${data.modelo_carro}</p>
      <p><strong>Tipo de lavagem:</strong> ${data.tipo_lavagem}</p>
      <p><strong>Data agendada:</strong> ${data.data_agendada}</p>
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
  placaResult.innerHTML = "";
});
