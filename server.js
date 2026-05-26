const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/item", async (req, res) => {
  const id = req.query.id;
  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid or missing asset ID" });
  }

  try {
    // Get basic info (name, price, limited status) from Roblox MarketplaceService equivalent
    const detailsRes = await fetch(`https://economy.roblox.com/v2/assets/${id}/details`);
    if (!detailsRes.ok) throw new Error("Failed to fetch asset details");
    const details = await detailsRes.json();

    const isLimited = details.IsLimited ?? false;
    const isLimitedUnique = details.IsLimitedUnique ?? false;

    let rap = null;
    let bestPrice = null;
    let remaining = null;

    if (isLimited || isLimitedUnique) {
      // Get RAP from Rolimons (accurate, works for all limiteds including new system)
      const roliRes = await fetch(`https://www.rolimons.com/itemapi/itemdetails/${id}`);
      if (roliRes.ok) {
        const roliData = await roliRes.json();
        if (roliData.success && roliData.item_id) {
          rap = roliData.rap > 0 ? roliData.rap : null;
        }
      }

      // Get best price (lowest reseller) from Roblox
      const resellRes = await fetch(
        `https://economy.roblox.com/v1/assets/${id}/resellers?limit=1&sortOrder=Asc`
      );
      if (resellRes.ok) {
        const resellData = await resellRes.json();
        if (resellData.data && resellData.data.length > 0) {
          bestPrice = resellData.data[0].price ?? null;
        }
      }

      // Get remaining stock
      const resaleRes = await fetch(`https://economy.roblox.com/v1/assets/${id}/resale-data`);
      if (resaleRes.ok) {
        const resaleData = await resaleRes.json();
        remaining = resaleData.numberRemaining ?? null;
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
