const express = require("express");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
const app = express();
require("dotenv").config();

// Set port from .env or default
const PORT = process.env.PORT || 3000;

// Middleware for rate limiting
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // limit each IP to 5 requests
  message: "Too many requests. Please try again later.",
});
app.use(limiter);

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static file directories
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Setup multer for screenshot upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// Route: Home fallback
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "payment.html"));
});

// Route: Handle form submission
app.post("/submit", upload.single("screenshot"), (req, res) => {
  const { name, email, utr, plan } = req.body;

  if (!name || !email || !utr || !plan) {
    return res.status(400).send("All fields are required.");
  }

  const newEntry = {
    id: Date.now(),
    name,
    email,
    utr,
    plan,
    screenshot: req.file ? req.file.filename : null,
    timestamp: new Date().toISOString(),
  };

  const dataPath = path.join(__dirname, "data.json");
  let existingData = [];

  if (fs.existsSync(dataPath)) {
    existingData = JSON.parse(fs.readFileSync(dataPath));
  }

  existingData.push(newEntry);
  fs.writeFileSync(dataPath, JSON.stringify(existingData, null, 2));

  res.redirect("/success.html");
});

// Route: Admin Dashboard
app.get("/admin", (req, res) => {
  const dataPath = path.join(__dirname, "data.json");

  if (!fs.existsSync(dataPath)) {
    return res.send("<h2>No submissions found.</h2>");
  }

  const data = JSON.parse(fs.readFileSync(dataPath));
  let html = `<h1>UTR Submissions</h1><ul style="list-style:none;">`;

  data.reverse().forEach((entry) => {
    html += `<li>
      <strong>Name:</strong> ${entry.name}<br>
      <strong>Email:</strong> ${entry.email}<br>
      <strong>Plan:</strong> ${entry.plan}<br>
      <strong>UTR:</strong> ${entry.utr}<br>
      <strong>Time:</strong> ${entry.timestamp}<br>
      <strong>Screenshot:</strong> ${
        entry.screenshot
          ? `<a href="/uploads/${entry.screenshot}" target="_blank">View Screenshot</a>`
          : "None"
      }
      <hr>
    </li>`;
  });

  html += `</ul>`;
  res.send(html);
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
