const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  "https://YOUR_PROJECT_ID.supabase.co",
  "YOUR_PUBLIC_ANON_KEY"
);

// 🔹 Get Engineers
app.get("/engineers", async (req, res) => {
  const { data, error } = await supabase.from("engineers").select("*");
  if (error) return res.status(500).json(error);
  res.json(data);
});

// 🔹 Add Engineer (Signup)
app.post("/add-engineer", async (req, res) => {
  const { name, email, skill, location } = req.body;

  const { error } = await supabase
    .from("engineers")
    .insert([{ name, email, skill, location }]);

  if (error) return res.status(500).json(error);
  res.json({ message: "Engineer added" });
});

app.listen(10000, () => console.log("TechRescue API running"));
