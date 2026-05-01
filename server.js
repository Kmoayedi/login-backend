const express = require("express");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");
const cors = require("cors");
const Stripe = require("stripe");
const stripe = new Stripe("DEIN_SECRET_KEY");

const app = express();
app.use(express.json());
// 👇 HIER DEFINIEREN (WICHTIG!)
const corsOptions = {
  origin: [
    "https://login-frontend-ebon-eta.vercel.app",
    "http://localhost:3000"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("Backend läuft 🚀");
});

// DB
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// REGISTER
// app.post("/register", async (req, res) => {
//   const { name, email, password } = req.body;

//   try {
//     const hashed = await bcrypt.hash(password, 10);

//     await pool.query(
//       "INSERT INTO users (name, email, password) VALUES ($1, $2, $3)",
//       [name, email, hashed]
//     );

//     res.json({ message: `Willkommen ${name}! 🎉` });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    console.log("BODY:", req.body); // 👈 zeigt ob Daten ankommen

    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *",
      [name, email, hashed]
    );

    console.log("USER:", result.rows[0]); // 👈 zeigt ob Insert klappt

    res.json({ message: `Willkommen ${name}! 🎉` });
  } catch (err) {
    console.error("REGISTER ERROR:", err); // 👈 DAS IST DER SCHLÜSSEL
    res.status(500).json({ error: err.message });
  }
});
// LOGIN
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "User nicht gefunden" });
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({ error: "Falsches Passwort" });
    }

    res.json({ token: "ok" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
//Payment
app.post("/create-checkout", async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: "Premium Zugang",
          },
          unit_amount: 500,
        },
        quantity: 1,
      },
    ],
    success_url: "https://deinfrontend.vercel.app/success",
    cancel_url: "https://deinfrontend.vercel.app",
  });

  res.json({ url: session.url });
});
// START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server läuft auf Port", PORT);
});