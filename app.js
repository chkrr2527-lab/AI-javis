const $ = id => document.getElementById(id);
const ANALYZE_URL = "https://rading-vision-ai-pro.chkrr2527.workers.dev/analyze";
let selectedFile = null;
let previewUrl = null;
let isAnalyzing = false;

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
  $("analyzeBtn").textContent = "วิเคราะห์ภาพด้วย AI →";
  setStatus("เลือกรูปสำเร็จ กดวิเคราะห์เมื่อพร้อม ภาพจะถูกส่งไปยัง AI เมื่อคุณกดปุ่มเท่านั้น");
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

async function imageToBase64(file) {
  const image = new Image();
  const objectUrl = URL.createObjectURL(file);
  try {
    image.src = objectUrl;
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("เปิดไฟล์ภาพไม่สำเร็จ"));
    });

    const maxSide = 1800;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("เบราว์เซอร์ไม่รองรับการประมวลผลภาพ");

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.84));
    if (!blob) throw new Error("แปลงภาพไม่สำเร็จ");
    if (blob.size > 6 * 1024 * 1024) {
      throw new Error("ภาพหลังย่อแล้วยังใหญ่เกิน 6 MB กรุณาใช้ภาพที่เล็กลง");
    }

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("อ่านภาพไม่สำเร็จ"));
      reader.readAsDataURL(blob);
    });
    return {
      imageBase64: String(dataUrl).split(",")[1],
      mimeType: "image/jpeg"
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function showAnalysis(text) {
  const panel = document.querySelector(".report-empty");
  if (!panel) return;

  panel.replaceChildren();
  const heading = document.createElement("b");
  heading.textContent = "ผลวิเคราะห์จาก Gemini AI";
  const note = document.createElement("p");
  note.className = "sub";
  note.textContent = "วิเคราะห์จากภาพที่ส่งเท่านั้น · ไม่ใช่ข้อมูลตลาดสด";
  const result = document.createElement("pre");
  result.textContent = text;
  result.style.whiteSpace = "pre-wrap";
  result.style.overflowWrap = "anywhere";
  result.style.font = "inherit";
  result.style.lineHeight = "1.7";
  result.style.marginTop = "16px";
  panel.append(heading, note, result);
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

$("analyzeBtn").addEventListener("click", async () => {
  if (!selectedFile || isAnalyzing) return;

  isAnalyzing = true;
  $("analyzeBtn").disabled = true;
  $("analyzeBtn").textContent = "กำลังวิเคราะห์...";
  setStatus("กำลังเตรียมภาพและส่งให้ Gemini AI กรุณารอสักครู่");

  try {
    const image = await imageToBase64(selectedFile);
    const payload = {
      ...image,
      symbol: $("symbol").value,
      timeframe: $("timeframe").value,
      tradeStyle: $("tradeStyle").value,
      currentPrice: $("currentPrice").value.trim(),
      notes: $("notes").value.trim()
    };

    const response = await fetch(ANALYZE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("เซิร์ฟเวอร์ส่งข้อมูลกลับมาไม่ถูกต้อง (HTTP " + response.status + ")");
    }
    if (!response.ok || !result.ok) {
      throw new Error(result.error || "วิเคราะห์ไม่สำเร็จ (HTTP " + response.status + ")");
    }
    if (!result.analysis) throw new Error("AI ไม่ได้ส่งข้อความวิเคราะห์กลับมา");

    showAnalysis(result.analysis);
    setStatus("วิเคราะห์สำเร็จแล้ว · โมเดล " + (result.model || "Gemini") + " · ใช้ภาพเท่านั้น ไม่ได้เชื่อม Datafeed");
  } catch (error) {
    console.error("AI analysis error:", error);
    setStatus("วิเคราะห์ไม่สำเร็จ: " + (error.message || "เกิดข้อผิดพลาด") + " · ตรวจอินเทอร์เน็ตแล้วลองใหม่");
  } finally {
    isAnalyzing = false;
    $("analyzeBtn").disabled = !selectedFile;
    $("analyzeBtn").textContent = "วิเคราะห์ภาพด้วย AI →";
  }
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
