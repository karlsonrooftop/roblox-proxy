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
    let rap = null;
    let bestPrice = null;
    let remaining = null;

    // RAP + value from Rolimons (public API, works fine)
    try {
      const roliRes = await fetch(`https://www.rolimons.com/itemapi/itemdetails/${id}`, { headers: HEADERS });
      if (roliRes.ok) {
        const roliData = await roliRes.json();
        console.log("Rolimons data:", JSON.stringify(roliData).substring(0, 300));
        if (roliData.success) {
          rap = roliData.rap > 0 ? roliData.rap : null;
        }
      } else {
        console.log("Rolimons status:", roliRes.status);
      }
    } catch (e) {
      console.log("Rolimons error:", e.message);
    }

    // Best price + remaining from catalog (not economy, less likely to be blocked)
    try {
      const catalogRes = await fetch(
        `https://catalog.roblox.com/v1/catalog/items/details`,
        {
          method: "POST",
          headers: { ...HEADERS, "Content-Type": "application/json" },
          body: JSON.stringify({ items: [{ itemType: "Asset", id: parseInt(id) }] })
        }
      );
      if (catalogRes.ok) {
        const catalogData = await catalogRes.json();
        console.log("Catalog data:", JSON.stringify(catalogData).substring(0, 300));
        const item = catalogData?.data?.[0];
        if (item) {
          bestPrice = item.lowestPrice ?? item.price ?? null;
          remaining = item.remainingStock ?? null;
          // Use catalog RAP if Rolimons didn't give us one
          if (!rap && item.recentAveragePrice) {
            rap = item.recentAveragePrice;
          }
        }
      } else {
        console.log("Catalog status:", catalogRes.status);
      }
    } catch (e) {
      console.log("Catalog error:", e.message);
    }

    // Basic details (name, price, limited) — this endpoint works
    const detailsRes = await fetch(`https://economy.roblox.com/v2/assets/${id}/details`, { headers: HEADERS });
    if (!detailsRes.ok) throw new Error("Details failed: " + detailsRes.status);
    const details = await detailsRes.json();
    console.log("Details:", JSON.stringify(details).substring(0, 300));

    const isLimited = details.IsLimited ?? false;
    const isLimitedUnique = details.IsLimitedUnique ?? false;

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
    console.error("Fatal error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
