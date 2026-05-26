const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/item", async (req, res) => {
  const id = req.query.id;
  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid or missing asset ID" });
  }

  try {
    // Fetch basic item details
    const detailsRes = await fetch(
      `https://economy.roblox.com/v2/assets/${id}/details`
    );
    if (!detailsRes.ok) throw new Error("Failed to fetch asset details");
    const details = await detailsRes.json();

    const isLimited = details.IsLimited ?? false;
    const isLimitedUnique = details.IsLimitedUnique ?? false;

    let rap = null;
    let bestPrice = null;
    let remaining = null;

    if (isLimited || isLimitedUnique) {
      // RAP from resale data
      const rapRes = await fetch(
        `https://economy.roblox.com/v1/assets/${id}/resale-data`
      );
      if (rapRes.ok) {
        const rapData = await rapRes.json();
        rap = rapData.recentAveragePrice ?? null;
        remaining = rapData.numberRemaining ?? null;
      }

      // Best price (lowest reseller)
      const resellRes = await fetch(
        `https://economy.roblox.com/v1/assets/${id}/resellers?limit=1&cursor=&sortOrder=Asc`
      );
      if (resellRes.ok) {
        const resellData = await resellRes.json();
        if (resellData.data && resellData.data.length > 0) {
          bestPrice = resellData.data[0].price ?? null;
        }
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
    return res.status(500).json({ error: "Failed to fetch item data" });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
