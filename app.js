const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "20mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "20mb" }));
app.use(express.static("public"));

// --- MongoDB ---
mongoose.connect("mongodb+srv://cuong123:cuong123@cluster0.htvcj.mongodb.net/", {
  dbName: "face_database"
});

// --- Schema ---
const UserSchema = new mongoose.Schema({
  name: String,
  image_path: String
});

const User = mongoose.model("face_data", UserSchema);

// --- Multer: lưu file ảnh ---
const storage = multer.diskStorage({
  destination: "public/uploads/",
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + ".jpg");
  }
});
const upload = multer({ storage: storage });

// --- View engine ---
app.set("view engine", "ejs");

// ---------------- ROUTES ----------------

// Trang chủ HTML
app.get("/", async (req, res) => {
  const users = await User.find();
  res.render("index", { users });
});

// Upload ảnh file
app.post("/upload_image", upload.single("image"), async (req, res) => {
  const name = req.body.name;
  const imgPath = "/uploads/" + req.file.filename;

  await User.create({ name, image_path: imgPath });
  res.redirect("/");
});

// Upload từ webcam (base64 → file)
app.post("/upload_webcam", async (req, res) => {
  const { name, image } = req.body;

  const base64 = image.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");

  const filename = `${Date.now()}.jpg`;
  const filepath = path.join("public/uploads/", filename);

  fs.writeFileSync(filepath, buffer);

  await User.create({
    name,
    image_path: "/uploads/" + filename
  });

  res.json({ message: "Tải ảnh thành công!" });
});

// Xoá user
app.get("/delete/:id", async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    const fullPath = path.join("public", user.image_path);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  }

  await User.deleteOne({ _id: req.params.id });
  res.redirect("/");
});

// Đổi tên
app.post("/rename", async (req, res) => {
  await User.updateOne(
    { _id: req.body.user_id },
    { name: req.body.new_name }
  );
  res.redirect("/");
});

// ---------- API JSON ----------
app.get("/api/users", async (req, res) => {
  const users = await User.find();
  res.json(
    users.map(u => ({
      _id: u._id,
      name: u.name,
      image_url: `${req.protocol}://${req.get("host")}${u.image_path}`
    }))
  );
});

app.post("/api/upload", upload.single("image"), async (req, res) => {
  const name = req.body.name;
  const imgPath = "/uploads/" + req.file.filename;

  await User.create({ name, image_path: imgPath });

  res.json({ message: "Upload thành công!" });
});

app.delete("/api/delete_user/:id", async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) return res.status(404).json({ error: "Không tìm thấy user!" });

  const fullPath = path.join("public", user.image_path);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

  await User.deleteOne({ _id: req.params.id });

  res.json({ message: "Xoá thành công!" });
});

app.post("/api/rename_user", async (req, res) => {
  await User.updateOne(
    { _id: req.body.user_id },
    { name: req.body.new_name }
  );

  res.json({ message: "Đổi tên thành công!" });
});

// Run server
app.listen(10000, () => console.log("Server chạy port 10000"));
