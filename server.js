const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test
app.get("/", (req, res) => {
  res.send("Server läuft!");
});

// Register
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  const hashed = await bcrypt.hash(password, 10);

  await pool.query(
    "INSERT INTO users (email, password) VALUES ($1, $2)",
    [email, hashed]
  );

  res.json({ message: "User erstellt" });
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  if (result.rows.length === 0) {
    return res.json({ error: "User nicht gefunden" });
  }

  const user = result.rows[0];

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    return res.json({ error: "Falsches Passwort" });
  }

  const token = jwt.sign(
    { id: user.id },
    process.env.JWT_SECRET
  );

  res.json({ token });
});

app.listen(5000, () => {
  console.log("Server läuft auf 5000");
});