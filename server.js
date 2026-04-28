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