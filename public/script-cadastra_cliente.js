const form = document.getElementById("formCliente");
const cepInput = document.getElementById("cep");
const success = document.getElementById("success");
const carroSelect = document.getElementById("carro");

// Função para consultar CEP via API
async function consultarCEP(cep) {
    if (!/^\d{8}$/.test(cep)) {
    alert("CEP inválido! Deve conter exatamente 8 números.");
    return null;
    }
    try {
    const res = await fetch(`/api/cep/${cep}`);
    if (!res.ok) throw new Error("CEP não encontrado");
    const data = await res.json();
    return data;
    } catch (err) {
    alert("Erro ao buscar CEP: " + err.message);
    return null;
    }
}

// Atualizar endereço automaticamente ao sair do campo CEP
cepInput.addEventListener("blur", async () => {
    const cep = cepInput.value.replace(/\D/g, "");
    const data = await consultarCEP(cep);
    if (!data) return;
    document.getElementById("logradouro").value = data.logradouro || "";
    document.getElementById("bairro").value = data.bairro || "";
    document.getElementById("cidade").value = data.localidade || "";
});

// Carregar carros existentes para seleção
async function carregarCarros() {
    try {
    const res = await fetch("/api/carros");
    if (!res.ok) throw new Error("Erro ao carregar carros");
    const carros = await res.json();
    carroSelect.innerHTML = '<option value="">Selecione um carro existente (opcional)</option>';
    carros.forEach(c => {
        const option = document.createElement("option");
        option.value = c.id_carro;
        option.textContent = `${c.marca} ${c.modelo} - ${c.placa}`;
        carroSelect.appendChild(option);
    });
    } catch (err) {
    console.error("Erro ao carregar carros:", err);
    }
}

carregarCarros();

// Cadastrar cliente
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
    nome_cliente: document.getElementById("nome_cliente").value.trim(),
    celular: document.getElementById("celular").value.trim(),
    cep: document.getElementById("cep").value.trim(),
    logradouro: document.getElementById("logradouro").value.trim(),
    numero: document.getElementById("numero").value.trim(),
    complemento: document.getElementById("complemento").value.trim(),
    bairro: document.getElementById("bairro").value.trim(),
    cidade: document.getElementById("cidade").value.trim()
    };

    try {
    const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    if (!res.ok) throw new Error("Erro ao cadastrar cliente");
    const resData = await res.json();

    // Vincular cliente a carro, se selecionado
    const idCarro = carroSelect.value;
    if (idCarro) {
        await fetch(`/api/carros/${idCarro}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_cliente: resData.id }) // Corrigi para resData.id
        });
    }


    success.classList.remove("hidden");
    form.reset();
    carroSelect.value = "";
    carregarCarros();
    } catch (err) {
    alert("Erro ao cadastrar cliente: " + err.message);
    }
});