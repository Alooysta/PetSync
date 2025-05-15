const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const WebSocket = require("ws");
require("dotenv").config();

const app = express();
const PORT = 5000;

const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

let currentFoodLevel = 50;
let autoRefillEnabled = false;

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.send(
    JSON.stringify({
      level: currentFoodLevel,
      autoRefill: autoRefillEnabled,
    })
  );

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log("Received message:", data);

      if (data.level !== undefined) {
        const newLevel = parseInt(data.level);
        if (!isNaN(newLevel) && newLevel >= 0 && newLevel <= 100) {
          currentFoodLevel = newLevel;
          broadcastFoodLevel();
        }
      }

      if (data.autoRefill !== undefined) {
        autoRefillEnabled = data.autoRefill;
        broadcastFoodLevel();
      }

      if (data.action === "dispenseFood") {
        console.log("Food dispense command received");
        currentFoodLevel = Math.min(currentFoodLevel + 20, 100);
        broadcastFoodLevel();
      }
    } catch (err) {
      console.error("Error parsing message:", err);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

function broadcastFoodLevel() {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          level: currentFoodLevel,
          autoRefill: autoRefillEnabled,
        })
      );
    }
  });
}

// Middleware
app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;

async function connect() {
  try {
    await mongoose.connect(uri);
    console.log("Conectado ao MongoDB");
  } catch (error) {
    console.error(error);
  }
}

connect();

const agendamentoSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    hora: {
      type: String,
      required: true,
      match: /^[0-2][0-9]:[0-5][0-9]$/,
    },
    hasAutomatico: {
      type: Boolean,
      required: true,
    },
    peso: {
      type: String,
      required: false,
    },
    enabled: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  { versionKey: false }
);

const Agendamento = mongoose.model("Agendamento", agendamentoSchema);

// Rota de teste
app.get("/api/teste", (req, res) => {
  res.json({ mensagem: "API funcionando corretamente!" });
});

app.post("/api/salvarAgendamento", async (req, res) => {
  try {
    const agendamentos = req.body;
    const results = [];

    const maxIncomingId = Math.max(...agendamentos.map((a) => parseInt(a.id)));

    await Agendamento.deleteMany({
      id: {
        $gt: maxIncomingId.toString(),
      },
    });

    for (const agendamento of agendamentos) {
      const { id, hora, hasAutomatico, peso, enabled } = agendamento;

      if (!id || !hora || typeof hasAutomatico !== "boolean") {
        return res.status(400).json({ erro: "Dados inválidos" });
      }

      const updatedAgendamento = await Agendamento.findOneAndUpdate(
        { id },
        { hora, hasAutomatico, peso, enabled },
        { new: true, upsert: true }
      );

      results.push(updatedAgendamento);
    }

    res.status(200).json(results);
  } catch (error) {
    console.error("Erro ao salvar agendamento:", error);
    res.status(500).json({ erro: "Erro interno no servidor" });
  }
});

app.get("/api/listaAgendamentos", async (req, res) => {
  try {
    const agendamentos = await Agendamento.find({});
    res.status(200).json(agendamentos);
  } catch (error) {
    console.error("Erro ao buscar agendamentos:", error);
    res.status(500).json({ erro: "Erro interno no servidor" });
  }
});

app.post("/api/setFoodLevel", (req, res) => {
  const { level } = req.body;

  if (typeof level !== "number" || level < 0 || level > 100) {
    return res
      .status(400)
      .json({ error: "Invalid food level. Must be a number between 0-100" });
  }

  currentFoodLevel = level;

  broadcastFoodLevel();

  res.status(200).json({ success: true, level });
});

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`WebSocket server está ativo`);
});
