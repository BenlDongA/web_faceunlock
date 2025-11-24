const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const bodyParser = require("body-parser");
const compression = require("compression");
const helmet = require("helmet");

const app = express();

// ===== MIDDLEWARE TỐI ƯU HIỆU NĂNG =====
app.use(cors());
app.use(helmet());
app.use(compression()); 
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static("public"));

// ===== KẾT NỐI MongoDB =====
mongoose
  .connect("mongodb+srv://cuong123:cuong123@cluster0.htvcj.mongodb.net/", {
    dbName: "face_database",
    serverSelectionTimeoutMS: 5000, 
    socketTimeoutMS: 45000,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Error:", err));

// ===== Schema =====
const UserSchema = new mongoose.Schema({
  name: String,
  image_base64: String
});

const User = mongoose.model("face_data", UserSchema);

// ===== Multer =====
const upload = multer({ storage: multer.memoryStorage() });

// ===== VIEW =====
app.set("view engine", "ejs");

// ===== ROUTES =====

// Trang web chính
app.get("/", async (req, res) => {
  const users = await User.find().lean();
  res.render("index", { users });
});

// Upload từ file
app.post("/upload_image", upload.single("image"), async (req, res) => {
  const imgBase64 = req.file.buffer.toString("base64");
  await User.create({ name: req.body.name, image_base64: imgBase64 });
  res.redirect("/");
});

// Upload webcam
app.post("/upload_webcam", async (req, res) => {
  const encoded = req.body.image.split(",")[1];
  await User.create({ name: req.body.name, image_base64: encoded });
  res.json({ message: "Tải ảnh thành công!" });
});

// Xóa
app.get("/delete/:name", async (req, res) => {
  await User.deleteOne({ name: req.params.name });
  res.redirect("/");
});

// Đổi tên
app.post("/rename", async (req, res) => {
  await User.updateOne({ _id: req.body.user_id }, { name: req.body.new_name });
  res.redirect("/");
});

// ======= API JSON =======
app.get("/api/users", async (req, res) => {
  const users = await User.find().lean();

  res.json(
    users.map(u => ({
      _id: u._id,
      name: u.name,
      image_url: "data:image/jpeg;base64," + u.image_base64
    }))
  );
});

app.post("/api/upload", upload.single("image"), async (req, res) => {
  await User.create({
    name: req.body.name,
    image_base64: req.file.buffer.toString("base64")
  });
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

// ======= SERVER RENDER =======
const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server đang chạy trên port", PORT);
});
