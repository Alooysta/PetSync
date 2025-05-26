const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const WebSocket = require("ws");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket state
let currentFoodLevel = 50;
let autoRefillEnabled = false;

// WebSocket connection handling
wss.on("connection", (ws) => {
  console.log("Client connected");

  // Send current state to new client
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

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

function broadcastFoodLevel() {
  const message = JSON.stringify({
    level: currentFoodLevel,
    autoRefill: autoRefillEnabled,
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  })
);
app.use(express.json());

// MongoDB Connection
const uri = process.env.MONGODB_URI;

async function connectDB() {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

// MongoDB Schema
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

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "Pet Feeder API is running!",
    websocket: "Available",
    endpoints: [
      "GET /api/teste",
      "GET /api/listaAgendamentos",
      "POST /api/salvarAgendamento",
      "POST /api/setFoodLevel",
      "GET /api/getFoodLevel",
    ],
  });
});

app.get("/api/teste", (req, res) => {
  res.json({ mensagem: "API funcionando corretamente!" });
});

app.get("/api/getFoodLevel", (req, res) => {
  res.json({
    level: currentFoodLevel,
    autoRefill: autoRefillEnabled,
  });
});

app.post("/api/salvarAgendamento", async (req, res) => {
  try {
    const agendamentos = req.body;

    if (!Array.isArray(agendamentos)) {
      return res.status(400).json({ erro: "Expected array of agendamentos" });
    }

    const results = [];
    const maxIncomingId = Math.max(...agendamentos.map((a) => parseInt(a.id)));

    // Delete agendamentos with IDs greater than the max incoming ID
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
    const agendamentos = await Agendamento.find({}).sort({ id: 1 });
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

  res.status(200).json({ success: true, level: currentFoodLevel });
});

app.post("/api/dispenseFood", (req, res) => {
  const { amount = 20 } = req.body;

  if (typeof amount !== "number" || amount < 0 || amount > 100) {
    return res.status(400).json({
      error: "Invalid amount. Must be a number between 0-100",
    });
  }

  currentFoodLevel = Math.min(currentFoodLevel + amount, 100);
  broadcastFoodLevel();

  res.status(200).json({
    success: true,
    level: currentFoodLevel,
    dispensed: amount,
  });
});

app.post("/api/setAutoRefill", (req, res) => {
  const { enabled } = req.body;

  if (typeof enabled !== "boolean") {
    return res.status(400).json({
      error: "Invalid enabled value. Must be boolean",
    });
  }

  autoRefillEnabled = enabled;
  broadcastFoodLevel();

  res.status(200).json({
    success: true,
    autoRefill: autoRefillEnabled,
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Handle 404
app.use("*", (req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    mongoose.connection.close();
    console.log("Server closed");
  });
});

// Start server
async function startServer() {
  await connectDB();

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket server is active`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

startServer().catch(console.error);
