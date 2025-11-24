const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "20mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "20mb" }));
app.use(express.static("public"));

// --- MongoDB ---
mongoose.connect("mongodb+srv://cuong123:cuong123@cluster0.htvcj.mongodb.net/", {
  dbName: "face_database"
});

const UserSchema = new mongoose.Schema({
  name: String,
  image_base64: String
});

const User = mongoose.model("face_data", UserSchema);

// --- Multer upload ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ---------------- ROUTES ----------------

// Trang chủ HTML
app.set("view engine", "ejs");

app.get("/", async (req, res) => {
  const users = await User.find();
  res.render("index", { users });
});

// Upload ảnh file
app.post("/upload_image", upload.single("image"), async (req, res) => {
  const name = req.body.name;
  const imgBase64 = req.file.buffer.toString("base64");

  await User.create({ name, image_base64: imgBase64 });
  res.redirect("/");
});

// Upload từ webcam
app.post("/upload_webcam", async (req, res) => {
  const { name, image } = req.body;

  const encoded = image.split(",")[1];

  await User.create({ name, image_base64: encoded });
  res.json({ message: "Tải ảnh thành công!" });
});

// Xoá user
app.get("/delete/:name", async (req, res) => {
  await User.deleteOne({ name: req.params.name });
  res.redirect("/");
});

// Đổi tên
app.post("/rename", async (req, res) => {
  await User.updateOne({ _id: req.body.user_id }, { name: req.body.new_name });
  res.redirect("/");
});

// ---------- API JSON ----------
app.get("/api/users", async (req, res) => {
  const users = await User.find();
  res.json(
    users.map(u => ({
      _id: u._id,
      name: u.name,
      image_url: `data:image/jpeg;base64,${u.image_base64}`
    }))
  );
});

app.post("/api/upload", upload.single("image"), async (req, res) => {
  const name = req.body.name;
  const imgBase64 = req.file.buffer.toString("base64");
  await User.create({ name, image_base64: imgBase64 });
  res.json({ message: "Upload thành công!" });
});

app.delete("/api/delete_user/:id", async (req, res) => {
  const result = await User.deleteOne({ _id: req.params.id });
  if (result.deletedCount === 0)
    return res.status(404).json({ error: "Không tìm thấy user!" });

  res.json({ message: "Xóa thành công!" });
});

app.post("/api/rename_user", async (req, res) => {
  await User.updateOne({ _id: req.body.user_id }, { name: req.body.new_name });
  res.json({ message: "Đổi tên thành công!" });
});

// Run server
app.listen(10000, () => console.log("Server chạy port 10000"));
