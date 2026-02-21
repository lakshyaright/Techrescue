const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();

const http = require("http");
const { Server } = require("socket.io");

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
    const { data: existingUser, error: fetchError } = await supabase
      .from("engineers")
      .select("id")
      .eq("email", email)
      .maybeSingle();   // 👈 safer than single()

    if (fetchError) throw fetchError;

    if (existingUser) {
      return res.json({ status: "exists" });
    }

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    // ✅ Insert new engineer
    const { error } = await supabase
      .from("engineers")
      .insert([
        {
          first_name,
          last_name,
          email,
          password: hashedPassword,
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
   SAVE ENGINEER PROFILE
========================= */
app.post("/save-profile", async (req, res) => {
  try {
    console.log("PROFILE DATA =>", req.body);

    const {
      categories,
      subskills,
      manualSkills,
      role,
      experience,
      education,
      summary
    } = req.body;

    // For now email optional (later login session se link karenge)
    const email = req.body.email || "temp@techrescue.com";

    const { error } = await supabase
      .from("engineer_profiles")
      .insert([
        {
          email,
          categories,
          subskills,
          manual_skills: manualSkills,
          role,
          experience,
          education,
          summary
        }
      ]);

    if (error) throw error;

    res.json({ status: "success" });

  } catch (err) {
    console.error("SAVE PROFILE ERROR:", err);
    res.status(500).json({ error: "Failed to save profile" });
  }
});

/* =========================
   LOGIN
========================= */
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: user, error } = await supabase
      .from("engineers")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (error) throw error;

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(400).json({ error: "Invalid password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      "techrescue_secret_key",
      { expiresIn: "1d" }
    );

    res.json({ status: "success", token });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

/* =========================
   GET CURRENT USER (JWT)
========================= */
app.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, "techrescue_secret_key");

    const { data: user, error } = await supabase
      .from("engineers")
      .select("id, first_name, last_name, email")
      .eq("id", decoded.id)
      .maybeSingle();

    if (error) throw error;
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);

  } catch (err) {
    console.error("ME ERROR:", err);
    res.status(401).json({ error: "Invalid token" });
  }
});

/* =========================
   GET TICKET ALERTS
========================= */

app.get("/alerts", async (req, res) => {
  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error });
  res.json(data);
});

/* =========================
   GET JOBS (Logged User Only)
========================= */

app.get("/jobs", async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, "techrescue_secret_key");

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("engineer_id", decoded.id);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(401).json({ error: "Unauthorized" });
  }
});


/* =========================
   GET MESSAGES
========================= */

app.get("/messages", async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, "techrescue_secret_key");

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("receiver_id", decoded.id);

    if (error) throw error;
    res.json(data);
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
});   

/* =========================
   PROFILE
========================= */
app.get("/profile", async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, "techrescue_secret_key");

    const { data, error } = await supabase
      .from("engineer_profiles")
      .select("*")
      .eq("engineer_id", decoded.id)
      .maybeSingle();

    if (error) throw error;
    res.json(data);
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
});
/* =========================
   Logout
========================= */
<script>
function logout(){
  localStorage.removeItem("token");
  window.location.href = "login.html";
}
</script>

/* =========================
   UPDATE PROFILE
========================= */
app.post("/update-profile", async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, "techrescue_secret_key");

    const { role, experience, summary } = req.body;

    const { error } = await supabase
      .from("engineer_profiles")
      .update({ role, experience, summary })
      .eq("engineer_id", decoded.id);

    if (error) throw error;

    res.json({ status: "success" });

  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

/* =========================
   SEND MESSAGE
========================= */
app.post("/send-message", async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, "techrescue_secret_key");

    const { receiver_id, message } = req.body;

    const { error } = await supabase
      .from("messages")
      .insert([
        {
          sender_id: decoded.id,
          receiver_id,
          message
        }
      ]);

    if (error) throw error;

    res.json({ status: "sent" });

  } catch (err) {
    console.error("SEND MSG ERROR:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

/* =========================
   RENDER PORT (IMPORTANT)
========================= */
const http = require("http");
const { Server } = require("socket.io");

// create HTTP server from express
const server = http.createServer(app);

// attach socket.io
const io = new Server(server, {
  cors: { origin: "*" }
});

/* =========================
   SOCKET REALTIME CHAT
========================= */
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (userId) => {
    socket.join("user_" + userId);
  });

  socket.on("sendMessage", async (data) => {
    const { sender_id, receiver_id, message } = data;

    // save in DB
    await supabase.from("messages").insert([
      { sender_id, receiver_id, message }
    ]);

    // send live to receiver
    io.to("user_" + receiver_id).emit("newMessage", {
      sender_id,
      message,
      time: new Date()
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

/* =========================
   UPDATE ONLINE STATUS
========================= */
app.post("/update-status", async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, "techrescue_secret_key");

    const { online } = req.body;

    const { error } = await supabase
      .from("engineers")
      .update({ online })
      .eq("id", decoded.id);

    if (error) throw error;

    // broadcast to all clients
    io.emit("statusChanged", { id: decoded.id, online });

    res.json({ status: "updated" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

/* =========================
   GET ONLINE ENGINEERS
========================= */
app.get("/online-engineers", async (req, res) => {
  const { data, error } = await supabase
    .from("engineers")
    .select("id, first_name, last_name, email")
    .eq("online", true);

  if (error) return res.status(500).json({ error });

  res.json(data);
});
/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log("Realtime Chat Server running on " + PORT);
});
