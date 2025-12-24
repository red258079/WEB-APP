// Sử dụng apiGet từ api.js
apiGet("/api/test").catch(err => console.error("API test failed:", err))
  .then(res => res.json())
  .then(data => console.log(data));
