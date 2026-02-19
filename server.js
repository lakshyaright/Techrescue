const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json());

// 🔹 Supabase connection
const supabase = createClient(
  "https://ailgygurihwgmbzxugrs.supabase.co",
  "sb_publishable_N_Drsk0j2uNXubC89iP__Q_G44AwRLl"
);

// Test route
app.get("/", (req, res) => {
  res.send("TechRescue Backend Running with Database ✅");
});

// 🔹 Get Engineers from DB
app.get("/engineers", async (req, res) => {
  const { data, error } = await supabase.from("engineers").select("*");

  if (error) return res.status(500).json(error);
  res.json(data);
});

// 🔹 Add Engineer (Register)
app.post("/add-engineer", async (req, res) => {
  const { name, email, skill, location } = req.body;

  const { error } = await supabase
    .from("engineers")
    .insert([{ name, email, skill, location }]);

  if (error) return res.status(500).json(error);
  res.json({ message: "Engineer added" });
});

// Render port
const PORT = process.
