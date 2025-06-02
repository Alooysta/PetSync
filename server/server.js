const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const WebSocket = require("ws");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 10000;

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Constants
const MAX_FOOD_GRAMS = 200; // 100% = 200 grams

let currentFoodGrams = 0; // Now storing in grams instead of percentage
let autoRefillEnabled = false;

// Helper functions
const gramsToPercentage = (grams) => {
  return Math.round((grams / MAX_FOOD_GRAMS) * 100);
};

const percentageToGrams = (percentage) => {
  return Math.round((percentage / 100) * MAX_FOOD_GRAMS);
};

// Function to parse food level from various formats
const parseFoodLevel = (data) => {
  if (typeof data === "string") {
    // Handle "20 gramas" format
    const gramsMatch = data.match(/(\d+)\s*gramas?/i);
    if (gramsMatch) {
      return parseInt(gramsMatch[1]);
    }

    // Handle plain number as string
    const num = parseInt(data);
    if (!isNaN(num)) {
      // If it's a reasonable gram amount (0-200), treat as grams
      // If it's 0-100, treat as percentage for backward compatibility
      return num <= 100 ? percentageToGrams(num) : num;
    }
  }

  if (typeof data === "number") {
    // If it's a reasonable gram amount (0-200), treat as grams
    // If it's 0-100, treat as percentage for backward compatibility
    return data <= 100 ? percentageToGrams(data) : data;
  }

  return 0;
};

wss.on("connection", async (ws) => {
  console.log("Cliente conectado");

  try {
    const agendamentos = await Agendamento.find({}).sort({ id: 1 });

    ws.send(
      JSON.stringify({
        level: gramsToPercentage(currentFoodGrams), // Send percentage for backward compatibility
        grams: currentFoodGrams, // Send grams as new field
        autoRefill: autoRefillEnabled,
        agendamentos: agendamentos,
      })
    );
  } catch (error) {
    console.error("Erro encontrado:", error);
    ws.send(
      JSON.stringify({
        level: gramsToPercentage(currentFoodGrams),
        grams: currentFoodGrams,
        autoRefill: autoRefillEnabled,
        agendamentos: [],
      })
    );
  }

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log("Received message:", data);

      // Handle direct gramas updates - PRIORITY HANDLER
      if (data.gramas !== undefined) {
        const newGrams = Number(data.gramas); // Direct number conversion, no parsing logic
        if (!isNaN(newGrams) && newGrams >= 0 && newGrams <= MAX_FOOD_GRAMS) {
          currentFoodGrams = newGrams; // Direct assignment of grams
          broadcastFoodLevel();

          broadcastMessage({
            type: "gramasUpdate",
            message: `Peso atualizado - ${currentFoodGrams}g`,
            grams: currentFoodGrams,
            timestamp: new Date().toISOString(),
          });

          console.log(
            `Food weight set directly to ${currentFoodGrams}g via gramas field`
          );
        }
        return; // Exit early to prevent other handlers from interfering
      }

      // Handle gram-based level setting
      if (data.grams !== undefined) {
        const newGrams = parseFoodLevel(data.grams);
        if (!isNaN(newGrams) && newGrams >= 0 && newGrams <= MAX_FOOD_GRAMS) {
          currentFoodGrams = newGrams;
          broadcastFoodLevel();
        }
      }

      // Handle percentage-based level setting (backward compatibility)
      if (data.level !== undefined && data.grams === undefined) {
        const newGrams = parseFoodLevel(data.level);
        if (!isNaN(newGrams) && newGrams >= 0 && newGrams <= MAX_FOOD_GRAMS) {
          currentFoodGrams = newGrams;
          broadcastFoodLevel();
        }
      }

      if (data.autoRefill !== undefined) {
        autoRefillEnabled = data.autoRefill;
        broadcastFoodLevel();
      }

      // Handle fill bowl action (sets to 200g)
      if (data.action === "fillBowl") {
        console.log("Fill bowl command received");
        currentFoodGrams = MAX_FOOD_GRAMS;
        broadcastFoodLevel();

        // Broadcast "Encher pote" message to all clients
        broadcastMessage({
          gramas: currentFoodGrams,
        });
      }

      // Handle legacy dispense food action
      if (data.action === "dispenseFood") {
        console.log("Legacy food dispense command received");
        // For legacy compatibility, add some food but don't fill completely
        currentFoodGrams = Math.min(currentFoodGrams + 40, MAX_FOOD_GRAMS); // Add 40g (20% of 200g)
        broadcastFoodLevel();

        // Broadcast message to all clients
        broadcastMessage({
          type: "dispenseFood",
          message: `Comida adicionada - ${currentFoodGrams}g`,
          grams: currentFoodGrams,
          timestamp: new Date().toISOString(),
        });
      }

      // Handle agendamentos data sent from frontend
      if (data.agendamentos && Array.isArray(data.agendamentos)) {
        console.log(
          "Agendamentos data received via WebSocket:",
          data.agendamentos
        );

        // Broadcast the agendamentos to all connected clients
        broadcastMessage({
          type: "agendamentosUpdate",
          agendamentos: data.agendamentos,
          timestamp: new Date().toISOString(),
        });
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
    level: gramsToPercentage(currentFoodGrams), // Send percentage for backward compatibility
    grams: currentFoodGrams, // Send grams as new field
    autoRefill: autoRefillEnabled,
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function broadcastMessage(messageData) {
  const message = JSON.stringify(messageData);

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
      serverSelectionTimeoutMS: 5000, // Render has timeout limits
      socketTimeoutMS: 45000,
    });
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    // Don't exit process on Render, let it retry
    console.log("Retrying connection in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
}

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
    enabled: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  { versionKey: false }
);

const Agendamento = mongoose.model("Agendamento", agendamentoSchema);

app.get("/", (req, res) => {
  res.json({
    message: "Pet Feeder está rodando!",
    websocket: "Disponível",
    currentFood: `${currentFoodGrams}g (${gramsToPercentage(
      currentFoodGrams
    )}%)`,
    endpoints: [
      "GET /api/listaAgendamentos",
      "POST /api/salvarAgendamento",
      "POST /api/setFoodLevel",
      "POST /api/setFoodGrams",
      "GET /api/getFoodLevel",
      "POST /api/fillBowl",
    ],
  });
});

app.get("/api/teste", (req, res) => {
  res.json({ mensagem: "API funcionando corretamente!" });
});

app.get("/api/getFoodLevel", (req, res) => {
  res.json({
    level: gramsToPercentage(currentFoodGrams), // Percentage for backward compatibility
    grams: currentFoodGrams, // Grams as new field
    autoRefill: autoRefillEnabled,
  });
});

// New endpoint to set food level in grams
app.post("/api/setFoodGrams", (req, res) => {
  const { grams } = req.body;

  if (typeof grams !== "number" || grams < 0 || grams > MAX_FOOD_GRAMS) {
    return res.status(400).json({
      error: `Invalid food grams. Must be a number between 0-${MAX_FOOD_GRAMS}`,
    });
  }

  currentFoodGrams = grams;
  broadcastFoodLevel();

  res.status(200).json({
    success: true,
    grams: currentFoodGrams,
    level: gramsToPercentage(currentFoodGrams),
  });
});

// Updated endpoint to handle both percentage and grams
app.post("/api/setFoodLevel", (req, res) => {
  const { level, grams } = req.body;

  if (grams !== undefined) {
    if (typeof grams !== "number" || grams < 0 || grams > MAX_FOOD_GRAMS) {
      return res.status(400).json({
        error: `Invalid food grams. Must be a number between 0-${MAX_FOOD_GRAMS}`,
      });
    }
    currentFoodGrams = grams;
  } else if (level !== undefined) {
    if (typeof level !== "number" || level < 0 || level > 100) {
      return res
        .status(400)
        .json({ error: "Invalid food level. Must be a number between 0-100" });
    }
    currentFoodGrams = percentageToGrams(level);
  } else {
    return res
      .status(400)
      .json({ error: "Must provide either 'level' or 'grams'" });
  }

  broadcastFoodLevel();

  res.status(200).json({
    success: true,
    grams: currentFoodGrams,
    level: gramsToPercentage(currentFoodGrams),
  });
});

// New endpoint to fill bowl to maximum (200g)
app.post("/api/fillBowl", (req, res) => {
  currentFoodGrams = MAX_FOOD_GRAMS;
  broadcastFoodLevel();

  // Broadcast "Fill bowl" message to all clients
  broadcastMessage({
    type: "fillBowl",
    message: "Pote cheio - 200g",
    grams: currentFoodGrams,
    timestamp: new Date().toISOString(),
  });

  res.status(200).json({
    success: true,
    grams: currentFoodGrams,
    level: gramsToPercentage(currentFoodGrams),
    message: "Bowl filled to maximum capacity",
  });
});

app.post("/api/dispenseFood", (req, res) => {
  const { amount = 40, grams } = req.body; // Default 40g instead of 20%

  let amountToAdd;
  if (grams !== undefined) {
    if (typeof grams !== "number" || grams < 0 || grams > MAX_FOOD_GRAMS) {
      return res.status(400).json({
        error: `Invalid grams amount. Must be a number between 0-${MAX_FOOD_GRAMS}`,
      });
    }
    amountToAdd = grams;
  } else {
    // Handle legacy percentage-based amount
    if (typeof amount !== "number" || amount < 0 || amount > 100) {
      return res.status(400).json({
        error: "Invalid amount. Must be a number between 0-100",
      });
    }
    amountToAdd = amount <= 100 ? percentageToGrams(amount) : amount;
  }

  currentFoodGrams = Math.min(currentFoodGrams + amountToAdd, MAX_FOOD_GRAMS);
  broadcastFoodLevel();

  // Broadcast message to all clients
  broadcastMessage({
    type: "dispenseFood",
    message: `Comida adicionada - ${currentFoodGrams}g`,
    grams: currentFoodGrams,
    dispensed: amountToAdd,
    timestamp: new Date().toISOString(),
  });

  res.status(200).json({
    success: true,
    grams: currentFoodGrams,
    level: gramsToPercentage(currentFoodGrams),
    dispensed: amountToAdd,
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
      const { id, hora, hasAutomatico, enabled } = agendamento;

      if (!id || !hora || typeof hasAutomatico !== "boolean") {
        return res.status(400).json({ erro: "Dados inválidos" });
      }

      const updatedAgendamento = await Agendamento.findOneAndUpdate(
        { id },
        { hora, hasAutomatico, enabled },
        { new: true, upsert: true }
      );

      results.push(updatedAgendamento);
    }

    // Broadcast the saved agendamentos to all connected WebSocket clients
    broadcastMessage({
      type: "agendamentosUpdate",
      agendamentos: results,
      timestamp: new Date().toISOString(),
    });

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
    currentFood: `${currentFoodGrams}g (${gramsToPercentage(
      currentFoodGrams
    )}%)`,
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
    console.log(`Food system: 100% = ${MAX_FOOD_GRAMS}g`);
  });
}

startServer().catch(console.error);
