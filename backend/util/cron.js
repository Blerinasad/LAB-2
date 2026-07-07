import { db } from "../config/db.js";
import { NotificationModel } from "../models/domain.model.js";
import { getIO } from "../socket.js";

export async function checkExpiringInventory() {
  console.log("Running automatic check for expiring inventory items...");
  try {
    const query = `
      SELECT ii.id AS item_id, ii.user_id, i.name AS ingredient_name,
             DATEDIFF(ii.expiry_date, CURDATE()) AS days_left
      FROM InventoryItems ii
      JOIN Ingredients i ON ii.ingredient_id = i.id
      WHERE ii.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)
      AND ii.quantity > 0
    `;
    const [expiringItems] = await db.query(query);
    console.log(`Found ${expiringItems.length} expiring items in user inventories.`);

    for (const item of expiringItems) {
      const { item_id, user_id, ingredient_name, days_left } = item;

      // Check if alert already sent today to prevent duplicate spamming
      const checkQuery = `
        SELECT id FROM Notifications
        WHERE user_id = ? AND type = 'expiry_alert'
        AND title LIKE ? AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `;
      const [existing] = await db.query(checkQuery, [user_id, `%${ingredient_name}%`]);

      if (!existing.length) {
        console.log(`Creating expiry notification for User ${user_id} regarding ${ingredient_name}...`);
        
        // 1. Save alert in MySQL Notifications table
        await NotificationModel.create({
          user_id,
          type: "expiry_alert",
          title: `${ingredient_name} po skadon!`,
          message: `Artikulli ${ingredient_name} skadon pas ${days_left} ditë(ve). Ju lutemi planifikoni konsumimin!`,
        });

        // 2. Emit WebSocket alert live
        getIO()?.to(`user_${user_id}`).emit("expiry:alert", {
          ingredient: ingredient_name,
          daysLeft: days_left,
          itemId: item_id
        });
      }
    }
    console.log("Finished checking expiring items.");
  } catch (error) {
    console.error("Failed checking expiring inventory:", error.message);
  }
}

// Start daily interval (every 24 hours)
export function startExpiryAlertCron() {
  // Run once immediately on start
  setTimeout(checkExpiringInventory, 5000);
  
  // Set interval for every 24 hours
  const INTERVAL_24H = 24 * 60 * 60 * 1000;
  setInterval(checkExpiringInventory, INTERVAL_24H);
  console.log("Expiry checker scheduled to run automatically every 24 hours.");
}
