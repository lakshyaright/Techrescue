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
app.use(express.urlencoded({ extended: true });
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
   SAVE / UPDATE ENGINEER PROFILE
========================= */
app.post("/save-profile", async (req, res) => {
  try {
    console.log("PROFILE DATA =>", req.body);

    // 🔐 Token verify
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, "techrescue_secret_key");

    const email = decoded.email;

    const {
      categories,
      subskills,
      manualSkills,
      role,
      experience,
      education,
      summary
    } = req.body;

    // 🔎 Check if profile already exists
    const { data: existingProfile } = await supabase
      .from("engineer_profiles")
      .select("*")
      .eq("email", email)
      .single();

    if (existingProfile) {
      // 🔁 UPDATE
      const { error } = await supabase
        .from("engineer_profiles")
        .update({
          categories,
          subskills,
          manual_skills: manualSkills,
          role,
          experience,
          education,
          summary
        })
        .eq("email", email);

      if (error) throw error;

      return res.json({ status: "updated" });
    } else {
      // ➕ INSERT
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

      return res.json({ status: "created" });
    }

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
      .select("id, first_name, last_name, email, online")
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
    socket.userId = userId;
    socket.join("user_" + userId);
  });

  socket.on("sendMessage", async (data) => {
    const { sender_id, receiver_id, message } = data;

    await supabase.from("messages").insert([
      { sender_id, receiver_id, message }
    ]);

    io.to("user_" + receiver_id).emit("newMessage", {
      sender_id,
      message,
      time: new Date()
    });
  // ✅ Correct disconnect inside connection
  socket.on("disconnect", async () => {
    if (socket.userId) {
      await supabase
        .from("engineers")
        .update({ online: false })
        .eq("id", socket.userId);

      io.emit("statusChanged", { id: socket.userId, online: false });
    }

    console.log("User disconnected");
  });
});

/* =========================
   UPDATE ONLINE STATUS
========================= */
app.post("/update-status", async (req, res) => {
  try {
    console.log("Update status body:", req.body);

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, "techrescue_secret_key");

    const { online } = req.body;

    if (typeof online !== "boolean") {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const { error } = await supabase
      .from("engineers")
      .update({ online })
      .eq("id", decoded.id);

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: "DB update failed" });
    }

    // broadcast live
    io.emit("statusChanged", {
      id: decoded.id,
      online
    });

    res.json({ status: "updated", online });

  } catch (err) {
    console.error("STATUS UPDATE ERROR:", err);
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
   FULL DASHBOARD DATA
========================= */
app.get("/dashboard-data", async (req, res) => {
  try {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, "techrescue_secret_key");

    const email = decoded.email;

    /* ======================
       COMPLETED JOBS
    ====================== */
    const { data: completedJobs } = await supabase
      .from("jobs")
      .select("*")
      .eq("engineer_email", email)
      .eq("status", "completed");

    let totalEarnings = 0;
    completedJobs?.forEach(job => {
      totalEarnings += job.amount || 0;
    });

    /* ======================
       MONTHLY PERFORMANCE
    ====================== */
    const currentMonth = new Date().getMonth();

    const monthlyJobs = completedJobs?.filter(job => {
      const jobMonth = new Date(job.completed_at).getMonth();
      return jobMonth === currentMonth;
    });

    const monthlyEarnings = monthlyJobs?.reduce((sum, job) => sum + (job.amount || 0), 0);

    /* ======================
       NEW ALERTS
    ====================== */
    const { data: newAlerts } = await supabase
      .from("alerts")
      .select("*")
      .eq("engineer_email", email)
      .eq("status", "new");

    res.json({
      totalEarnings,
      completedJobs: completedJobs?.length || 0,
      monthlyEarnings: monthlyEarnings || 0,
      newAlerts: newAlerts || [],
      newAlertCount: newAlerts?.length || 0,
      rating: 4.9
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Dashboard load failed" });
  }
});

   /* =========================
   RAISE QUERY (PRO LEVEL)
========================= */
app.post("/raise-query", async (req, res) => {
  try {

    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, "techrescue_secret_key");
    const email = decoded.email;

    const {
      category,
      subcategory,
      impact,
      urgency,
      short_description,
      detailed_description,
      assignment_group
    } = req.body;

    // 🔥 Priority Logic
    let priority = "P4";

    if (impact === "Organization" && urgency === "High") priority = "P1";
    else if (impact === "Multiple Users" && urgency === "High") priority = "P2";
    else if (impact === "Single User" && urgency === "Medium") priority = "P3";

    // 🔥 Generate Ticket Number
    const ticketNumber = "INC" + Date.now();

    const { error } = await supabase
      .from("queries")
      .insert([
        {
          ticket_number: ticketNumber,
          client_email: email,
          category,
          subcategory,
          impact,
          urgency,
          priority,
          short_description,
          detailed_description,
          assignment_group
        }
      ]);

    if (error) throw error;

    res.json({
      message: "Ticket created successfully",
      ticket_number: ticketNumber
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to create ticket" });
  }
});
/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log("Realtime Chat Server running on " + PORT);
});
