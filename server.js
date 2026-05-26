const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json",
};

app.get("/item", async (req, res) => {
  const id = req.query.id;
  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid or missing asset ID" });
  }

  try {
    // Rolimons has all limited data we need in one call
    const roliRes = await fetch(`https://www.rolimons.com/itemapi/itemdetails/${id}`, { headers: HEADERS });
    if (!roliRes.ok) {
      console.log("Rolimons status:", roliRes.status);
      return res.status(500).json({ error: "Rolimons fetch failed: " + roliRes.status });
    }

    const roliData = await roliRes.json();
    console.log("Rolimons response:", JSON.stringify(roliData));

    if (!roliData.success) {
      return res.json({ error: "Item not found on Rolimons" });
    }

    return res.json({
      id: parseInt(id),
      rap: roliData.rap > 0 ? roliData.rap : null,
      value: roliData.value > 0 ? roliData.value : null,
    });

  } catch (err) {
    console.error("Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
