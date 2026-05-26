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
    // Basic details from Roblox
    const detailsRes = await fetch(`https://economy.roblox.com/v2/assets/${id}/details`, { headers: HEADERS });
    if (!detailsRes.ok) throw new Error("Failed to fetch asset details: " + detailsRes.status);
    const details = await detailsRes.json();

    const isLimited = details.IsLimited ?? false;
    const isLimitedUnique = details.IsLimitedUnique ?? false;

    let rap = null;
    let bestPrice = null;
    let remaining = null;

    if (isLimited || isLimitedUnique) {
      // RAP from Rolimons
      try {
        const roliRes = await fetch(`https://www.rolimons.com/itemapi/itemdetails/${id}`, { headers: HEADERS });
        const roliText = await roliRes.text();
        console.log("Rolimons response:", roliText.substring(0, 200));
        const roliData = JSON.parse(roliText);
        if (roliData.success) {
          rap = roliData.rap > 0 ? roliData.rap : null;
        }
      } catch (e) {
        console.log("Rolimons error:", e.message);
      }

      // Best price from resellers
      try {
        const resellRes = await fetch(
          `https://economy.roblox.com/v1/assets/${id}/resellers?limit=1&sortOrder=Asc`,
          { headers: HEADERS }
        );
        const resellText = await resellRes.text();
        console.log("Resellers response:", resellText.substring(0, 200));
        const resellData = JSON.parse(resellText);
        if (resellData.data && resellData.data.length > 0) {
          bestPrice = resellData.data[0].price ?? null;
        }
      } catch (e) {
        console.log("Resellers error:", e.message);
      }

      // Remaining stock
      try {
        const resaleRes = await fetch(`https://economy.roblox.com/v1/assets/${id}/resale-data`, { headers: HEADERS });
        const resaleData = await resaleRes.json();
        remaining = resaleData.numberRemaining ?? null;
      } catch (e) {
        console.log("Resale error:", e.message);
      }
    }

    return res.json({
      id: details.AssetId,
      name: details.Name,
      price: details.PriceInRobux ?? 0,
      isLimited,
      isLimitedUnique,
      rap,
      bestPrice,
      remaining,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
