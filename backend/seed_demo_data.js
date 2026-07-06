// seed_demo_data.js — Demo data bazuar në emrat SHQIP të ingredientëve
import { db } from "./config/db.js";
import dotenv from "dotenv";
dotenv.config();

async function seed() {
  console.log("🌱 Duke shtuar demo të dhëna...");

  await db.query(`
    ALTER TABLE StoreOrders
    MODIFY status ENUM('pending','accepted','preparing','out_for_delivery','approved','rejected','ready_for_pickup','picked_up','delivered','cancelled')
    NOT NULL DEFAULT 'pending'
  `).catch(() => {});
  await db.query("UPDATE StoreOrders SET status='approved' WHERE status='accepted'").catch(() => {});
  await db.query("UPDATE StoreOrders SET status='ready_for_pickup' WHERE status='preparing'").catch(() => {});
  await db.query("UPDATE StoreOrders SET status='picked_up' WHERE status='out_for_delivery'").catch(() => {});
  await db.query(`
    ALTER TABLE StoreOrders
    MODIFY status ENUM('pending','approved','rejected','ready_for_pickup','picked_up','delivered','cancelled')
    NOT NULL DEFAULT 'pending'
  `).catch(() => {});

  // Inventory — emrat saktë sipas 02_seed.sql
  const inventoryData = [
    { name:"Domate",          qty:1.5,  unit:"kg",   location:"Fridge",   daysLeft:2  },
    { name:"Spinaq",          qty:0.3,  unit:"kg",   location:"Fridge",   daysLeft:1  },
    { name:"Speca",           qty:0.8,  unit:"kg",   location:"Fridge",   daysLeft:5  },
    { name:"Karrota",         qty:1.0,  unit:"kg",   location:"Fridge",   daysLeft:20 },
    { name:"Patate",          qty:2.0,  unit:"kg",   location:"Pantry",   daysLeft:30 },
    { name:"Qepë",            qty:1.5,  unit:"kg",   location:"Pantry",   daysLeft:25 },
    { name:"Hudhër",          qty:0.2,  unit:"kg",   location:"Pantry",   daysLeft:45 },
    { name:"Kastravec",       qty:0.5,  unit:"kg",   location:"Fridge",   daysLeft:4  },
    { name:"Mollë",           qty:1.2,  unit:"kg",   location:"Fridge",   daysLeft:14 },
    { name:"Banane",          qty:0.6,  unit:"kg",   location:"Counter",  daysLeft:4  },
    { name:"Limon",           qty:0.3,  unit:"kg",   location:"Fridge",   daysLeft:18 },
    { name:"Mish pule",       qty:0.8,  unit:"kg",   location:"Fridge",   daysLeft:2  },
    { name:"Vezë",            qty:6,    unit:"cope", location:"Fridge",   daysLeft:21 },
    { name:"Mish viçi",       qty:0.5,  unit:"kg",   location:"Fridge",   daysLeft:3  },
    { name:"Qumësht",         qty:1.0,  unit:"l",    location:"Fridge",   daysLeft:5  },
    { name:"Djathë i bardhë", qty:0.3,  unit:"kg",   location:"Fridge",   daysLeft:12 },
    { name:"Kos",             qty:0.5,  unit:"l",    location:"Fridge",   daysLeft:7  },
    { name:"Gjalpë",          qty:0.2,  unit:"kg",   location:"Fridge",   daysLeft:25 },
    { name:"Oriz",            qty:1.0,  unit:"kg",   location:"Pantry",   daysLeft:180},
    { name:"Pasta",           qty:0.5,  unit:"kg",   location:"Pantry",   daysLeft:180},
    { name:"Bukë",            qty:0.4,  unit:"cope", location:"Counter",  daysLeft:3  },
    { name:"Vaj ulliri",      qty:0.5,  unit:"l",    location:"Pantry",   daysLeft:300},
    { name:"Kripë",           qty:0.3,  unit:"kg",   location:"Pantry",   daysLeft:999},
    { name:"Piper i zi",      qty:0.05, unit:"kg",   location:"Pantry",   daysLeft:365},
    { name:"Majdanoz",        qty:0.02, unit:"kg",   location:"Fridge",   daysLeft:4  },
  ];

  const today = new Date();
  let insertedInv = 0;

  for (const item of inventoryData) {
    const [[ing]] = await db.query("SELECT id, unit FROM Ingredients WHERE name=?", [item.name]);
    if (!ing) { console.log(`  ⚠ Ingredient nuk u gjet: "${item.name}"`); continue; }

    const [[exists]] = await db.query(
      "SELECT id FROM InventoryItems WHERE user_id=3 AND ingredient_id=?", [ing.id]);
    if (exists) continue;

    const purchase = new Date(today);
    const expiry = new Date(today);
    expiry.setDate(expiry.getDate() + item.daysLeft);

    await db.query(
      `INSERT INTO InventoryItems (user_id, ingredient_id, quantity, unit, purchase_date, expiry_date, location)
       VALUES (3,?,?,?,?,?,?)`,
      [ing.id, item.qty, item.unit || ing.unit,
       purchase.toISOString().slice(0,10),
       expiry.toISOString().slice(0,10),
       item.location]
    );
    insertedInv++;
  }
  console.log(`  ✅ Inventory: ${insertedInv} artikuj shtuar`);

  // Recipes — vetëm nëse nuk ekzistojnë
  const [[recCount]] = await db.query("SELECT COUNT(*) AS c FROM Recipes");
  if (recCount.c >= 5) {
    console.log(`  ✅ Recipes: ${recCount.c} receta ekzistojnë`);
  } else {
    console.log(`  ℹ Recipes: do shtohen nga 02_seed.sql`);
  }

  // Shopping Lists demo
  const [[slExists]] = await db.query(
    "SELECT id FROM ShoppingLists WHERE user_id=3 AND title='Blerjet e Javës' LIMIT 1");
  if (!slExists) {
    const [sl] = await db.query(
      "INSERT INTO ShoppingLists (user_id, title, status) VALUES (3,'Blerjet e Javës','active')");
    // Shto disa artikuj
    const toBuy = ["Domate","Bukë","Qumësht","Vezë"];
    for (const name of toBuy) {
      const [[ing]] = await db.query("SELECT id, unit FROM Ingredients WHERE name=?", [name]);
      if (!ing) continue;
      await db.query(
        "INSERT INTO ShoppingListItems (shopping_list_id, ingredient_id, quantity_needed, unit) VALUES (?,?,?,?)",
        [sl.insertId, ing.id, 1, ing.unit]);
    }
    console.log(`  ✅ Shopping list krijuar me ${toBuy.length} artikuj`);
  } else {
    console.log(`  ✅ Shopping list ekziston`);
  }

  // Marketplace demo orders
  const ensureOrder = async ({ userId, title, status, courierId = null }) => {
    const [[existing]] = await db.query(
      "SELECT id FROM StoreOrders WHERE user_id=? AND notes=? LIMIT 1",
      [userId, title]
    );
    if (existing) return existing.id;

    const [list] = await db.query(
      "INSERT INTO ShoppingLists (user_id, title, status) VALUES (?,?,?)",
      [userId, title, "active"]
    );
    const names = ["Domate", "Bukë", "Qumësht"];
    const items = [];
    for (const name of names) {
      const [[ing]] = await db.query("SELECT id, unit FROM Ingredients WHERE name=?", [name]);
      if (!ing) continue;
      await db.query(
        "INSERT INTO ShoppingListItems (shopping_list_id, ingredient_id, quantity_needed, unit) VALUES (?,?,?,?)",
        [list.insertId, ing.id, 1, ing.unit]
      );
      items.push(ing);
    }

    const [order] = await db.query(
      `INSERT INTO StoreOrders (user_id, store_id, shopping_list_id, status, delivery_address, total_amount, notes, courier_id, created_by, updated_by)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [userId, 1, list.insertId, status, "Rr. Demo 12, Prishtine", "6.50", title, courierId, userId, userId]
    );
    for (const item of items) {
      await db.query(
        "INSERT INTO StoreOrderItems (order_id, ingredient_id, quantity, unit, unit_price, total_price) VALUES (?,?,?,?,?,?)",
        [order.insertId, item.id, 1, item.unit, "2.00", "2.00"]
      );
    }
    return order.insertId;
  };

  const pendingOrderId = await ensureOrder({ userId: 3, title: "Demo order pending approval", status: "pending" });
  const readyOrderId = await ensureOrder({ userId: 4, title: "Demo order ready for courier", status: "ready_for_pickup" });
  console.log(`  ✅ Marketplace orders: pending #${pendingOrderId}, ready #${readyOrderId}`);

  // Notifications demo
  const [[notifCount]] = await db.query(
    "SELECT COUNT(*) AS c FROM Notifications WHERE user_id=3");
  if (notifCount.c === 0) {
    const notifs = [
      { type:"expiry_alert", title:"Spinaq po skadon!", message:"Spinaqi skadon nesër — planifiko recetë." },
      { type:"expiry_alert", title:"Domate po skadon!", message:"Domatet skadojnë pas 2 ditëve." },
      { type:"system",       title:"Mirë se vjen!",    message:"Smart Kitchen është gati. Fillo duke shtuar inventarin." },
    ];
    for (const n of notifs) {
      await db.query(
        "INSERT INTO Notifications (user_id, type, title, message) VALUES (3,?,?,?)",
        [n.type, n.title, n.message]);
    }
    console.log(`  ✅ Notifications: ${notifs.length} shtuar`);
  }

  const roleNotifications = [
    { user_id: 2, type: "order", title: "Porosi e re", message: "Ka ardhur një porosi e re për aprovim." },
    { user_id: 3, type: "order", title: "Porosia u pranua", message: "Porosia juaj u pranua nga menaxheri." },
    { user_id: 6, type: "order", title: "Porosi gati për dorëzim", message: "Një porosi është gati për t'u marrë." },
  ];
  for (const n of roleNotifications) {
    const [[exists]] = await db.query(
      "SELECT id FROM Notifications WHERE user_id=? AND title=? AND message=? LIMIT 1",
      [n.user_id, n.title, n.message]
    );
    if (exists) continue;
    await db.query(
      "INSERT INTO Notifications (user_id, type, title, message) VALUES (?,?,?,?)",
      [n.user_id, n.type, n.title, n.message]
    );
  }

  // Settings — nëse tabela është bosh
  const [[settCount]] = await db.query("SELECT COUNT(*) AS c FROM Settings");
  if (settCount.c === 0) {
    const settings = [
      { key:"app_name",          value:"Smart Kitchen",  description:"Emri i aplikacionit" },
      { key:"expiry_alert_days", value:"3",              description:"Ditë para skadimit për alert" },
      { key:"max_upload_mb",     value:"5",              description:"Madhësia max e upload (MB)" },
      { key:"default_language",  value:"sq",             description:"Gjuha e paracaktuar" },
    ];
    for (const s of settings) {
      await db.query(
        "INSERT INTO Settings (`key`, value, description) VALUES (?,?,?)",
        [s.key, s.value, s.description]);
    }
    console.log(`  ✅ Settings: ${settings.length} shtuar`);
  }

  await db.end();
  console.log("✅ Demo data u shtuan me sukses!");
}

seed().catch(e => { console.error("❌ Error:", e.message); process.exit(1); });
