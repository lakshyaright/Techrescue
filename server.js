const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    console.log("BODY =>", req.body);

    const { first_name, last_name, email, password, country, state } = req.body;

    // Required fields
    if (!first_name || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 🔎 Check if email already exists
    const { data: existingUser } = await supabase
      .from("engineers")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return res.json({ status: "exists" });
    }

    // ✅ Insert new engineer
    const { error } = await supabase
      .from("engineers")
      .insert([
        {
          first_name,
          last_name,
          email,
          password,
          country,
          state
        }
      ]);

    if (error) throw error;

    res.json({ status: "success" });

  } catch (err) {
    console.error("ADD ENGINEER ERROR:", err);
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
