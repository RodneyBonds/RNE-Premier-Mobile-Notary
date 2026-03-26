const res = await fetch("http://localhost:3000/api/nonexistent");
const text = await res.text();
console.log(res.status, res.headers.get("content-type"));
console.log(text.substring(0, 200));
