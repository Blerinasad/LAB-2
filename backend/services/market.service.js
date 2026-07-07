import { db } from "../config/db.js";
import { getIO } from "../socket.js";

const ORDER_LABELS = {
  pending:"Në pritje", accepted:"U pranua", rejected:"U refuzua",
  preparing:"Në përgatitje", out_for_delivery:"Në rrugë",
  delivered:"U dorëzua", cancelled:"U anulua",
};

const UI_TO_DB_STATUS = {
  accepted: "approved",
  preparing: "ready_for_pickup",
  out_for_delivery: "picked_up",
};

const DB_TO_UI_STATUS = {
  approved: "accepted",
  ready_for_pickup: "preparing",
  picked_up: "out_for_delivery",
};

let statusEnumCache = null;
const UNIT_ALIASES = { cope: "piece" };

function normalizeUnit(unit) {
  const allowed = ["piece","g","kg","ml","l","pack","box","bottle","can","slice"];
  const normalized = UNIT_ALIASES[unit] || unit;
  return allowed.includes(normalized) ? normalized : "piece";
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 7));
  return date.toISOString().slice(0, 10);
}

function storageLocationFor(categoryName) {
  const category = String(categoryName || "").toLowerCase();
  if (category.includes("bulmet") || category.includes("mish") || category.includes("peshk")) return "Frigorifer";
  if (category.includes("ngrir")) return "Ngrirës";
  if (category.includes("drith") || category.includes("konserv")) return "Qilar";
  return "Qilar";
}

function normalizeOrderStatusOut(order) {
  if (!order) return order;
  return { ...order, status: DB_TO_UI_STATUS[order.status] || order.status };
}

function normalizeOrderRows(rows) {
  return Array.isArray(rows) ? rows.map(normalizeOrderStatusOut) : [];
}

async function getAllowedOrderStatuses() {
  if (statusEnumCache) return statusEnumCache;
  const [[column]] = await db.query("SHOW COLUMNS FROM StoreOrders LIKE 'status'");
  const match = String(column?.Type || "").match(/^enum\((.*)\)$/i);
  statusEnumCache = match
    ? match[1].split(",").map((value) => value.trim().replace(/^'|'$/g, ""))
    : ["pending","accepted","rejected","preparing","out_for_delivery","delivered","cancelled"];
  return statusEnumCache;
}

async function toDbStatus(status) {
  const allowed = await getAllowedOrderStatuses();
  if (allowed.includes(status)) return status;
  const mapped = UI_TO_DB_STATUS[status];
  if (mapped && allowed.includes(mapped)) return mapped;
  throw { status: 400, message: "Status i pavlefshëm" };
}

async function getDeliveryFee() {
  const [rows] = await db.query(
    "SELECT `key`, value FROM Settings WHERE `key` IN ('delivery_fee','market_delivery_fee','delivery_fee_base')"
  ).catch(() => [[]]);
  const preferred = ["delivery_fee", "market_delivery_fee", "delivery_fee_base"];
  const row = preferred.map((key) => rows.find((item) => item.key === key)).find(Boolean);
  const fee = Number(row?.value);
  return Number.isFinite(fee) && fee >= 0 ? fee : 0;
}

async function audit(actorId, action, entity, entityId, oldValue, newValue) {
  await db.query(
    "INSERT INTO AuditLogs (user_id,action,entity,entity_id,old_value,new_value) VALUES (?,?,?,?,?,?)",
    [
      actorId || null,
      action,
      entity,
      entityId || null,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
    ]
  ).catch(() => {});
}

export class MarketService {

  // ── Njoftime ─────────────────────────────────────────────
  // Njofto një përdorues të vetëm: ruaj në DB + emit te room user_<id>
  static async _notifyUser(userId, title, message) {
    try {
      await db.query(
        "INSERT INTO Notifications (user_id,type,title,message) VALUES (?,?,?,?)",
        [userId, "order", title, message]);
      getIO()?.to(`user_${userId}`).emit("notification:new", { title, message });
    } catch { /* mos e ndal workflow-in nëse njoftimi dështon */ }
  }

  // Njofto të gjithë përdoruesit me një rol (Manager=2, Courier=4)
  static async _notifyRole(roleId, title, message) {
    try {
      const [users] = await db.query(
        "SELECT user_id FROM UserRoles WHERE role_id=?", [roleId]);
      for (const { user_id } of users) {
        await db.query(
          "INSERT INTO Notifications (user_id,type,title,message) VALUES (?,?,?,?)",
          [user_id, "order", title, message]);
        getIO()?.to(`user_${user_id}`).emit("notification:new", { title, message });
      }
    } catch { /* mos e ndal workflow-in */ }
  }

  static async getStores() {
    const [rows] = await db.query("SELECT * FROM Stores WHERE is_active=1 ORDER BY name");
    return normalizeOrderRows(rows);
  }

  static async getOrderById(id) {
    const [[order]] = await db.query(`
      SELECT so.*, so.total_amount AS estimated_total, 'cash' AS payment_method, s.name AS store_name,
             u.first_name, u.last_name, u.email,
             c.first_name AS courier_first_name, c.last_name AS courier_last_name
      FROM StoreOrders so
      JOIN Stores s ON s.id = so.store_id
      JOIN Users u ON u.id = so.user_id
      LEFT JOIN Users c ON c.id = so.courier_id
      WHERE so.id=?`, [id]);
    if (!order) throw { status: 404, message: "Porosia nuk u gjet" };

    const [items] = await db.query(`
      SELECT soi.*, soi.quantity AS quantity_needed, soi.total_price AS subtotal,
             i.name AS ingredient_name
      FROM StoreOrderItems soi
      JOIN Ingredients i ON i.id = soi.ingredient_id
      WHERE soi.order_id=?`, [id]);

    const itemsSubtotal = items.reduce((sum, item) => sum + Number(item.total_price || 0), 0);
    return normalizeOrderStatusOut({
      ...order,
      subtotal: Number(itemsSubtotal.toFixed(2)),
      delivery_fee: Number(order.delivery_fee || 0),
      items: items.map((item) => ({ ...item, unit: normalizeUnit(item.unit) })),
    });
  }

  static async getMyOrders(userId) {
    const [rows] = await db.query(`
      SELECT so.id, so.status, so.total_amount AS estimated_total, so.delivery_fee, 'cash' AS payment_method, so.delivery_address,
             so.created_at, s.name AS store_name,
             COUNT(soi.id) AS total_items
      FROM StoreOrders so
      JOIN Stores s ON s.id = so.store_id
      LEFT JOIN StoreOrderItems soi ON soi.order_id = so.id
      WHERE so.user_id=?
      GROUP BY so.id ORDER BY so.created_at DESC`, [userId]);
    return normalizeOrderRows(rows);
  }

  static async getStoreOrders(userId) {
    const [rows] = await db.query(`
      SELECT so.id, so.status, so.total_amount AS estimated_total, so.delivery_fee, 'cash' AS payment_method, so.delivery_address, so.created_at,
             s.name AS store_name, u.first_name, u.last_name,
             COUNT(soi.id) AS total_items
      FROM StoreOrders so
      JOIN Stores s ON s.id = so.store_id
      JOIN Users u ON u.id = so.user_id
      LEFT JOIN StoreOrderItems soi ON soi.order_id = so.id
      GROUP BY so.id ORDER BY so.created_at DESC LIMIT 50`);
    return normalizeOrderRows(rows);
  }

  static async getCourierOrders(courierId, includeAll = false) {
    const [rows] = await db.query(`
      SELECT so.id, so.status, so.delivery_address, so.total_amount AS estimated_total, so.delivery_fee, 'cash' AS payment_method,
             so.courier_id, s.name AS store_name,
             u.first_name, u.last_name,
             so.created_at, so.updated_at,
             COUNT(soi.id) AS total_items
      FROM StoreOrders so
      JOIN Stores s ON s.id = so.store_id
      JOIN Users u ON u.id = so.user_id
      LEFT JOIN StoreOrderItems soi ON soi.order_id = so.id
      WHERE (
        so.status IN ('accepted','preparing','out_for_delivery','approved','ready_for_pickup','picked_up')
        OR (so.status='delivered' AND DATE(so.updated_at)=CURDATE())
      )
      AND (
        ? = 1
        OR so.courier_id IS NULL
        OR so.courier_id=?
      )
      GROUP BY so.id
      ORDER BY FIELD(so.status,'out_for_delivery','picked_up','accepted','approved','preparing','ready_for_pickup','delivered'), so.updated_at DESC`,
      [includeAll ? 1 : 0, courierId]);
    return normalizeOrderRows(rows);
  }

  static async createOrder(userId, { shopping_list_id, store_id, delivery_address, delivery_note, payment_method }) {
    if (!store_id || !delivery_address?.trim())
      throw { status: 400, message: "store_id dhe delivery_address janë të detyrueshme" };

    const [[store]] = await db.query("SELECT id FROM Stores WHERE id=? AND is_active=1", [store_id]);
    if (!store) throw { status: 404, message: "Dyqani nuk ekziston" };

    const [[list]] = await db.query(
      "SELECT id FROM ShoppingLists WHERE id=? AND user_id=? AND status='active'",
      [shopping_list_id, userId]);
    if (!list) throw { status: 404, message: "Lista nuk u gjet ose nuk është aktive" };

    const [items] = await db.query(`
      SELECT sli.ingredient_id, sli.quantity_needed, sli.unit,
             COALESCE(spp.price, 1.50) AS price_per_unit
      FROM ShoppingListItems sli
      LEFT JOIN StoreProductPrices spp ON spp.ingredient_id=sli.ingredient_id AND spp.store_id=?
      WHERE sli.shopping_list_id=? AND sli.is_purchased=0`, [store_id, shopping_list_id]);

    if (!items.length) throw { status: 400, message: "Lista nuk ka artikuj të pablerë" };

    const itemsTotal = items.reduce((s, i) => s + Number(i.price_per_unit) * Number(i.quantity_needed), 0);
    const deliveryFee = await getDeliveryFee();
    const total = itemsTotal + deliveryFee;

    // Shënim: StoreOrders ka kolonën "notes" (jo "delivery_note"). "payment_method"
    // nuk ruhet ende në DB — sot mbështetet vetëm "cash" (shih Shopping.jsx, opsioni
    // "wallet" është disabled), prandaj e kthejmë gjithmonë 'cash' në SELECT-et më poshtë.
    const [r] = await db.query(
      `INSERT INTO StoreOrders (user_id,store_id,shopping_list_id,delivery_address,notes,status,delivery_fee,total_amount)
       VALUES (?,?,?,?,?,?,?,?)`,
      [userId, store_id, shopping_list_id, delivery_address.trim(),
       delivery_note||null, "pending", deliveryFee.toFixed(2), total.toFixed(2)]);

    for (const item of items) {
      await db.query(
        "INSERT INTO StoreOrderItems (order_id,ingredient_id,quantity,unit,unit_price,total_price) VALUES (?,?,?,?,?,?)",
        [r.insertId, item.ingredient_id, item.quantity_needed, normalizeUnit(item.unit),
         Number(item.price_per_unit).toFixed(2),
         (Number(item.price_per_unit)*Number(item.quantity_needed)).toFixed(2)]);
    }

    // Njofto VETËM menaxherët për porosinë e re
    await this._notifyRole(2, "Porosi e re", "Ka ardhur një porosi e re për aprovim.");

    return this.getOrderById(r.insertId);
  }

  static async addDeliveredItemsToOwnerInventory(order, actorId) {
    const ownerId = order.user_id;
    const today = new Date().toISOString().slice(0, 10);
    let added = 0;
    const warnings = [];

    for (const item of Array.isArray(order.items) ? order.items : []) {
      if (!item.ingredient_id) {
        warnings.push(`Order item ${item.id || "unknown"} has no ingredient_id`);
        continue;
      }

      const [[ingredient]] = await db.query(
        `SELECT i.id, i.name, i.unit, i.shelf_life_days, c.name AS category_name
         FROM Ingredients i
         LEFT JOIN Categories c ON c.id=i.category_id
         WHERE i.id=?`,
        [item.ingredient_id]
      );
      if (!ingredient) {
        warnings.push(`Ingredient ${item.ingredient_id} not found`);
        continue;
      }

      const unit = normalizeUnit(item.unit || ingredient.unit);
      const quantity = Number(item.quantity || item.quantity_needed || 0);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        warnings.push(`Invalid quantity for ingredient ${item.ingredient_id}`);
        continue;
      }

      const location = storageLocationFor(ingredient.category_name);
      const expiryDate = addDays(ingredient.shelf_life_days || 7);
      const [[existing]] = await db.query(
        `SELECT id, quantity
         FROM InventoryItems
         WHERE user_id=? AND ingredient_id=? AND COALESCE(unit,'')=? AND COALESCE(location,'')=?
         ORDER BY expiry_date DESC
         LIMIT 1`,
        [ownerId, ingredient.id, unit, location]
      );

      if (existing) {
        await db.query(
          `UPDATE InventoryItems
           SET quantity=quantity+?, purchase_date=?, expiry_date=GREATEST(expiry_date, ?), updated_by=?, updated_at=NOW()
           WHERE id=?`,
          [quantity, today, expiryDate, actorId || null, existing.id]
        );
        await audit(actorId, "INVENTORY_ORDER_DELIVERED_UPDATE", "InventoryItems", existing.id,
          { quantity: existing.quantity },
          { added_quantity: quantity, order_id: order.id });
      } else {
        const [created] = await db.query(
          `INSERT INTO InventoryItems (user_id,ingredient_id,quantity,unit,purchase_date,expiry_date,location,notes,created_by,updated_by)
           VALUES (?,?,?,?,?,?,?,?,?,?)`,
          [
            ownerId,
            ingredient.id,
            quantity,
            unit,
            today,
            expiryDate,
            location,
            `Shtuar automatikisht nga porosia #${order.id}`,
            actorId || null,
            actorId || null,
          ]
        );
        await audit(actorId, "INVENTORY_ORDER_DELIVERED_CREATE", "InventoryItems", created.insertId,
          null,
          { ingredient_id: ingredient.id, quantity, unit, order_id: order.id });
      }
      added += 1;
    }

    await audit(actorId, "ORDER_DELIVERED_INVENTORY_SYNC", "StoreOrders", order.id,
      null,
      { user_id: ownerId, added_items: added, warnings });
    return { added, warnings };
  }

  static async updateStatus(orderId, status, actor) {
    const actorId = typeof actor === "object" ? actor.id : actor;
    const actorRoles = typeof actor === "object" ? (actor.roles || []) : [];
    const order = await this.getOrderById(orderId);
    const validStatuses = ["accepted","approved","rejected","preparing","ready_for_pickup","out_for_delivery","picked_up","delivered","cancelled"];
    if (!validStatuses.includes(status))
      throw { status: 400, message: "Status i pavlefshëm" };
    const uiStatus = DB_TO_UI_STATUS[status] || status;
    const isManager = actorRoles.includes("Admin") || actorRoles.includes("Manager");
    const isCourier = actorRoles.includes("Admin") || actorRoles.includes("Courier");
    if (["accepted", "rejected", "preparing", "cancelled"].includes(uiStatus) && !isManager) {
      throw { status: 403, message: "Vetëm manager/admin mund ta ndryshojë këtë status" };
    }
    if (["out_for_delivery", "delivered"].includes(uiStatus) && !isCourier) {
      throw { status: 403, message: "Vetëm courier/admin mund ta ndryshojë këtë status" };
    }
    const dbStatus = await toDbStatus(uiStatus);

    await db.query("UPDATE StoreOrders SET status=?, updated_at=NOW(), updated_by=? WHERE id=?", [dbStatus, actorId || null, orderId]);
    await audit(actorId, "ORDER_STATUS", "StoreOrders", orderId, { status: order.status }, { status: uiStatus });

    // Emit live te owneri (statusi ndryshoi)
    try {
      getIO()?.to(`user_${order.user_id}`).emit("order:status", {
        order_id: orderId, status: uiStatus, label: ORDER_LABELS[uiStatus] || uiStatus,
      });
    } catch {}

    // Njoftime specifike sipas tranzicionit — VETËM te marrësit e duhur
    if (uiStatus === "accepted") {
      // Owneri: u pranua
      await this._notifyUser(order.user_id, "Porosia u pranua",
        "Porosia juaj u pranua nga menaxheri.");
      // Korrierët: porosi gati për dorëzim
      await this._notifyRole(4, "Porosi gati për dorëzim",
        "Një porosi është gati për t'u marrë.");
    } else if (uiStatus === "rejected") {
      await this._notifyUser(order.user_id, "Porosia u refuzua",
        "Porosia juaj u refuzua nga menaxheri.");
    } else if (uiStatus === "out_for_delivery") {
      // Korrieri e mori porosinë
      await this._notifyUser(order.user_id, "Porosia u mor nga korrieri",
        "Porosia juaj është marrë nga korrieri.");
    } else if (uiStatus === "delivered") {
      if (order.status !== "delivered") {
        await this.addDeliveredItemsToOwnerInventory(order, actorId);
      }
      await this._notifyUser(order.user_id, "Porosia u dorëzua",
        "Porosia juaj u dorëzua me sukses.");
    }

    return { order_id: orderId, status: uiStatus, label: ORDER_LABELS[uiStatus] };
  }

  static async claimOrder(orderId, courierId) {
    const order = await this.getOrderById(orderId);
    if (order.courier_id) throw { status: 400, message: "Porosia është marrë tashmë" };
    if (!["accepted","preparing"].includes(order.status))
      throw { status: 400, message: "Porosia nuk është gati për marrje" };
    const dbStatus = await toDbStatus("out_for_delivery");
    await db.query(
      "UPDATE StoreOrders SET courier_id=?, status=? WHERE id=?",
      [courierId, dbStatus, orderId]);
    return this.updateStatus(orderId, "out_for_delivery", { id: courierId, roles: ["Courier"] });
  }

  static async rebuy(orderId, userId) {
    const order = await this.getOrderById(orderId);
    if (order.user_id !== userId) throw { status: 403, message: "Nuk ke akses" };

    const title = `Riblerje nga Porosia #${orderId}`;
    const [r] = await db.query(
      "INSERT INTO ShoppingLists (user_id,title,status) VALUES (?,?,?)",
      [userId, title, "active"]);

    for (const item of order.items) {
      await db.query(
        "INSERT INTO ShoppingListItems (shopping_list_id,ingredient_id,quantity_needed,unit) VALUES (?,?,?,?)",
        [r.insertId, item.ingredient_id, item.quantity, item.unit]);
    }
    return { shopping_list_id: r.insertId };
  }

  static async budgetForecast(userId) {
    const [history] = await db.query(`
      SELECT YEAR(created_at) AS yr, MONTH(created_at) AS mo,
             SUM(total_amount) AS total
      FROM StoreOrders
      WHERE user_id=? AND status='delivered'
      GROUP BY yr, mo ORDER BY yr DESC, mo DESC LIMIT 6`, [userId]);

    if (!history.length) return { predicted_amount: 0, recommended_reserve: 0, method: "Pa histori" };
    const avg = history.reduce((s,r) => s+Number(r.total), 0) / history.length;
    return {
      predicted_amount: Number(avg.toFixed(2)),
      recommended_reserve: Number((avg * 1.15).toFixed(2)),
      method: `Mesatare e ${history.length} muajve të fundit`,
    };
  }

  static async getSpending(userId) {
    const [rows] = await db.query(`
      SELECT DATE_FORMAT(created_at,'%Y-%m') AS month,
             SUM(total_amount) AS total,
             COUNT(*) AS orders
      FROM StoreOrders
      WHERE user_id=? AND status='delivered'
      GROUP BY month ORDER BY month DESC LIMIT 12`, [userId]);
    return rows;
  }
}
