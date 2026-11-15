
const message = document.createElement("div");

message.textContent = "🐱 Chrome Pet 실행 성공!";

Object.assign(message.style, {
  position: "fixed",
  bottom: "30px",
  right: "30px",
  padding: "15px 20px",
  backgroundColor: "#222",
  color: "#fff",
  borderRadius: "12px",
  fontSize: "16px",
  zIndex: "2147483647",
  pointerEvents: "none",
});

document.documentElement.appendChild(message);

console.log("[Chrome Pet] Content Script 실행 성공!");
