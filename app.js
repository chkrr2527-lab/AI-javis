const $=id=>document.getElementById(id);
function loadChart(){
  const symbol=($("symbol").value||"TVC:XAUUSD").trim().toUpperCase();
  const interval=$("tf").value;
  const host=$("tv-chart");
  host.innerHTML="";
  const iframe=document.createElement("iframe");
  iframe.title="TradingView chart "+symbol;
  iframe.loading="lazy";
  iframe.referrerPolicy="origin";
  iframe.src="https://www.tradingview.com/widgetembed/?symbol="+encodeURIComponent(symbol)+"&interval="+encodeURIComponent(interval)+"&hidesidetoolbar=1&symboledit=1&saveimage=0&toolbarbg=%230b111a&theme=dark&style=1&timezone=Asia%2FBangkok&withdateranges=1&showpopupbutton=0&locale=th";
  host.appendChild(iframe);
}
$("loadChart").addEventListener("click",loadChart);
loadChart();
const promptText=()=>`คุณคือผู้ช่วยวิเคราะห์ XAUUSD แบบมืออาชีพ เน้น Price Action + Smart Money Concepts สำหรับ Scalping หลาย Timeframe (H1/M15/M5/M1)\n\nกติกา:\n1) ใช้เฉพาะข้อมูล/ภาพที่ฉันแนบ ห้ามแต่งราคาหรืออ้างว่าเป็น Real-time หากไม่มี timestamp\n2) แยกแนวโน้ม H1, โครงสร้าง M15/M5 และจุดเข้า M1\n3) ระบุ Support/Resistance, Supply/Demand, BOS/CHOCH/MSS, Liquidity Sweep, OB/FVG เฉพาะที่มีหลักฐาน\n4) ให้แผน BUY, SELL หรือ WAIT พร้อมเหตุผล เงื่อนไขยืนยัน จุดยกเลิกแผน\n5) Entry/SL/TP1/TP2 ต้องคำนวณจากราคาที่ให้มาและตรวจ RR อย่างน้อย 1:2 ก่อนเสนอ\n6) ถ้าข้อมูลไม่พอหรือราคาเก่า ให้ตอบ WAIT และระบุข้อมูลที่ขาด\n7) ห้ามรับประกันกำไร และห้ามส่งคำสั่งเทรดแทนฉัน\n\nข้อมูลเพิ่มเติม:\n${$("notes").value.trim()||"(ไม่มีข้อมูลเพิ่มเติม)"}\n\nกรุณาวิเคราะห์เป็นภาษาไทย โดยสรุป: Bias, Market Structure, Key Zones, Setup, Entry, SL, TP1, TP2, RR, Invalidation, Confidence แบบมีเหตุผล`;
$("copyPrompt").addEventListener("click",async()=>{
  try{await navigator.clipboard.writeText(promptText());$("copyStatus").textContent="คัดลอก Prompt แล้ว เปิด ChatGPT แล้ววางพร้อมแนบภาพกราฟได้เลย";}
  catch(e){$("copyStatus").textContent="เบราว์เซอร์ไม่อนุญาตคัดลอกอัตโนมัติ กรุณาเลือกข้อความจากช่อง Notes แล้วลองอีกครั้ง";}
});
$("saveApi").addEventListener("click",()=>{
  const v=$("apiUrl").value.trim().replace(/\/+$/,"");
  if(v && !/^https:\/\/.+workers\.dev$/.test(v)){ $("apiStatus").textContent="URL ควรเป็น HTTPS ของ Cloudflare Worker";return;}
  localStorage.setItem("goldApiUrl",v);$("apiStatus").textContent=v?"บันทึก URL แล้ว":"ยังไม่ได้ตั้งค่า Cloud URL";
});
const saved=localStorage.getItem("goldApiUrl")||"";$("apiUrl").value=saved;
$("setupKey").value=sessionStorage.getItem("goldSetupKey")||"";
if(saved)$("apiStatus").textContent="บันทึก URL แล้ว (ยังไม่ได้ทดสอบการเชื่อมต่อ)";
$("testTelegram").addEventListener("click",async()=>{
  const base=$("apiUrl").value.trim().replace(/\\/+$/,"");
  const key=$("setupKey").value.trim();
  $("telegramStatus").textContent="กำลังทดสอบ...";
  if(!base || !key){$("telegramStatus").textContent="กรุณาใส่ Cloud Worker URL และ Setup Key ก่อน";return;}
  try{
    const res=await fetch(base+"/api/telegram/test",{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},
      body:JSON.stringify({message:"✅ Personal Gold AI: เชื่อมต่อ Telegram สำเร็จแล้ว"})
    });
    const data=await res.json();
    if(!res.ok || !data.ok) throw new Error(data.error||"HTTP "+res.status);
    sessionStorage.setItem("goldSetupKey",key);
    localStorage.setItem("goldApiUrl",base);
    $("apiStatus").textContent="เชื่อมต่อ Cloud Worker แล้ว";
    $("telegramStatus").textContent="ส่งข้อความทดสอบสำเร็จ ตรวจสอบ Telegram ได้เลย";
  }catch(e){$("telegramStatus").textContent="ทดสอบไม่สำเร็จ: "+e.message;}
});
$("connection").textContent=navigator.onLine?"ออนไลน์ · ยังไม่เชื่อม Feed":"ออฟไลน์";
$("connection").className="pill "+(navigator.onLine?"gold":"muted");
window.addEventListener("online",()=>{$("connection").textContent="ออนไลน์ · ยังไม่เชื่อม Feed";});
window.addEventListener("offline",()=>{$("connection").textContent="ออฟไลน์";});
if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});
