const express = require("express");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");
const cors = require("cors");
const app = express();

app.use(cors({
  origin: "https://login-frontend-eta.vercel.app",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// Middleware
app.use(express.json());

// PostgreSQL Connection (Beispiel)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// ROUTE: Register
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const hashed = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3)",
      [name, email, hashed]
    );

    res.json({ message: `Willkommen ${name}! 🎉` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});