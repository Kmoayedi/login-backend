const express = require("express");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");
const cors = require("cors");
const Stripe = require("stripe");

let stripe;

if (process.env.STRIPE_SECRET_KEY) {
  const Stripe = require("stripe");
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

const app = express();
app.use(express.json());

const corsOptions = {
  origin: [
    "https://login-frontend-ebon-eta.vercel.app",
    "http://localhost:3000"
  ],
};

//app.use(cors(corsOptions));

app.use(cors({
  origin: "*", // 🔥 erstmal offen zum testen
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// 🔥 ganz wichtig für Preflight
app.options("/*", cors());

// DB (NEON)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// TEST ROUTE
app.get("/", (req, res) => {
  res.send("Backend läuft 🚀");
});

// REGISTER
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email und Passwort erforderlich" });
  }

  try {
    console.log("REGISTER BODY:", req.body);

    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password) 
       VALUES ($1, $2, $3) 
       RETURNING id, email`,
      [name || "User", email, hashed]
    );

    console.log("USER CREATED:", result.rows[0]);

    res.json({
      message: "Registrierung erfolgreich",
      user: result.rows[0],
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);

    // 🔴 WICHTIG: Duplicate Email erkennen
    if (err.code === "23505") {
      return res.status(400).json({ error: "Email existiert bereits" });
    }

    res.status(500).json({ error: "Server Fehler" });
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
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Server Fehler" });
  }
});

// PAYMENT
app.post("/create-checkout", async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: "Stripe nicht konfiguriert" });
  }
  try {
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
  } catch (err) {
    console.error("STRIPE ERROR:", err);
    res.status(500).json({ error: "Payment Fehler" });
  }
});

// START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server läuft auf Port", PORT);
});