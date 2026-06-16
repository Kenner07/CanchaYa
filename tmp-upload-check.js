const fs = require("fs");
const path = require("path");

async function main() {
  const { FormData, Blob } = globalThis;
  const filePath = path.join(
    "uploads",
    "profiles",
    "1781385085443-791898822.jpg",
  );
  const form = new FormData();
  form.append("userId", "1");
  form.append(
    "photo",
    new Blob([fs.readFileSync(filePath)], { type: "image/jpeg" }),
    "profile.jpg",
  );

  const res = await fetch("http://127.0.0.1:3001/api/profile/upload-photo", {
    method: "POST",
    body: form,
  });

  const text = await res.text();
  console.log("STATUS=" + res.status);
  console.log("BODY=" + text);
}

main().catch((err) => {
  console.error("ERR=" + err);
  process.exitCode = 1;
});
