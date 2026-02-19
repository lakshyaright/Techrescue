const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   SUPABASE CONNECTION
========================= */
const supabase = createClient(
  "https://ailgygurihwgmbzxugrs.supabase.co",
  "sb_publishable_N_Drsk0j2uNXubC89iP__Q_G44AwRLl"
);

/* =========================
   TEST ROUTE
========================= */
app.get("/", (req, res) => {
  res.send("TechRescue Backend Running with Database ✅");
});

/* =========================
   GET ALL ENGINEERS (DB)
========================= */
app.get("/engineers", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("engineers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch engineers" });
  }
});

/* =========================
   ADD ENGINEER (REGISTER)
========================= */
app.post("/add-engineer", async (req, res) => {
  try {
    const { name, email, skill, location } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and Email required" });
    }

    const { error } = await supabase
      .from("engineers")
      .insert([{ name, email, skill, location }]);

    if (error) throw error;

    res.json({ message: "Engineer added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add engineer" });
  }
});

/* =========================
   RENDER PORT (IMPORTANT)
========================= */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("TechRescue Server running on port " + PORT);
});
