const $ = id => document.getElementById(id);
let selectedFile = null;
let previewUrl = null;

function setStatus(message) {
  $("scanStatus").textContent = message;
}
function showImage(file) {
  if (!file || !file.type.startsWith("image/")) {
    setStatus("ไฟล์นี้ไม่ใช่รูปภาพ กรุณาเลือก JPG, PNG หรือ WEBP");
    return;
  }
  if (file.size > 12 * 1024 * 1024) {
    setStatus("ภาพมีขนาดเกิน 12 MB กรุณาเลือกภาพที่เล็กลง");
    return;
  }
  selectedFile = file;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  $("imagePreview").src = previewUrl;
  $("imageMeta").textContent = file.name + " · " + (file.size / 1024 / 1024).toFixed(2) + " MB";
  $("previewWrap").hidden = false;
  $("analyzeBtn").disabled = false;
  $("analyzeBtn").textContent = "เตรียมวิเคราะห์ภาพ (AI ยังไม่เชื่อมต่อ) →";
  setStatus("เลือกรูปสำเร็จ ภาพยังอยู่ในเครื่องและยังไม่ได้ส่งไปที่ใด");
}
$("pickImage").addEventListener("click", () => $("galleryInput").click());
$("takePhoto").addEventListener("click", () => $("cameraInput").click());
$("galleryInput").addEventListener("change", e => showImage(e.target.files[0]));
$("cameraInput").addEventListener("change", e => showImage(e.target.files[0]));
$("removeImage").addEventListener("click", () => {
  selectedFile = null;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  $("imagePreview").removeAttribute("src");
  $("previewWrap").hidden = true;
  $("galleryInput").value = "";
  $("cameraInput").value = "";
  $("analyzeBtn").disabled = true;
  $("analyzeBtn").textContent = "วิเคราะห์ภาพด้วย AI →";
  setStatus("เลือกภาพกราฟก่อน เพื่อเตรียมส่งวิเคราะห์");
});
$("analyzeBtn").addEventListener("click", () => {
  if (!selectedFile) return;
  setStatus("ขั้นตอนรับภาพพร้อมแล้ว แต่ยังไม่ได้เชื่อม Vision AI จึงยังไม่สร้างสัญญาณหรือราคา Entry/SL/TP");
});
const connection = () => {
  $("connection").textContent = navigator.onLine ? "ออนไลน์ · DATA FEED ยังไม่เชื่อม" : "ออฟไลน์";
  $("connection").className = "pill " + (navigator.onLine ? "gold" : "muted");
};
connection();
window.addEventListener("online", connection);
window.addEventListener("offline", connection);
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" })
    .then(registration => registration.update())
    .catch(err => console.warn("Service worker:", err));
}
