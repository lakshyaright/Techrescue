const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("TechRescue Backend Running ✅");
});

// Test engineers route
app.get("/engineers", (req, res) => {
  res.json([
    {
      name: "Test Engineer",
      skill: "Networking",
      location: "Delhi",
      availability: "Available"
    }
  ]);
});

// IMPORTANT: Render port
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server running on " + PORT));
