import { db } from "../config/db.js";
import { getIO } from "../socket.js";
import { NotificationService } from "./notification.service.js";

const ORDER_LABELS = {
  pending: "Në pritje",
  approved: "U pranua",
  rejected: "U refuzua",
  ready_for_pickup: "Gati për dorëzim",
  picked_up: "U mor nga korrieri",
  delivered: "U dorëzua",
  cancelled: "U anulua",
};

const ROLE = {
  MANAGER: ["Admin", "Manager"],
  COURIER: ["Admin", "Courier"],
};

function hasRole(user, roles) {
  return (user?.roles || []).some((role) => roles.includes(role));
}

async function audit(actorId, action, orderId, oldStatus, newStatus) {
  await db.query(
    "INSERT INTO AuditLogs (user_id,action,entity,entity_id,old_value,new_value) VALUES (?,?,?,?,?,?)",
    [
      actorId,
      action,
      "StoreOrders",
      orderId,
      oldStatus ? JSON.stringify({ status: oldStatus }) : null,
      JSON.stringify({ status: newStatus }),
    ]
  ).catch(() => {});
}

export class MarketplaceService {

  static async getStores() {
    const [rows] = await db.query("SELECT * FROM Stores WHERE is_active=1 ORDER BY name");
    return rows;
  }

  static async getOrderById(id) {
    const [[order]] = await db.query(`
      SELECT so.*, so.total_amount AS estimated_total, 'cash' AS payment_method, s.name AS store_name,
             u.first_name, u.last_name, u.email,
             c.first_name AS courier_first_name, c.last_name AS courier_last_name
      FROM StoreOrders so
      JOIN Stores s ON s.id = so.store_id
      JOIN Users  u ON u.id = so.user_id
      LEFT JOIN Users c ON c.id = so.courier_id
      WHERE so.id=?`, [id]);
    if (!order) throw { status: 404, message: "Porosia nuk u gjet" };

    const [items] = await db.query(`
      SELECT soi.*, soi.quantity AS quantity_needed, soi.total_price AS subtotal,
             i.name AS ingredient_name
      FROM StoreOrderItems soi
      JOIN Ingredients i ON i.id = soi.ingredient_id
      WHERE soi.order_id=?`, [id]);

    return { ...order, items };
  }

  static async getOrderByIdForUser(id, user) {
    const order = await this.getOrderById(id);
    if (hasRole(user, ["Admin", "Manager"])) return order;
    if (hasRole(user, ["Courier"])) {
      const assignedToUser = Number(order.courier_id || 0) === Number(user.id);
      if (assignedToUser || ["ready_for_pickup", "picked_up"].includes(order.status)) return order;
      throw { status: 403, message: "Nuk ke akses në këtë porosi" };
    }
    if (Number(order.user_id) !== Number(user.id)) {
      throw { status: 403, message: "Nuk ke akses në këtë porosi" };
    }
    return order;
  }

  static async getMyOrders(userId) {
    const [rows] = await db.query(`
      SELECT so.id, so.status, so.total_amount AS estimated_total, 'cash' AS payment_method, so.delivery_address,
             so.created_at, s.name AS store_name,
             COUNT(soi.id) AS total_items
      FROM StoreOrders so
      JOIN Stores s ON s.id = so.store_id
      LEFT JOIN StoreOrderItems soi ON soi.order_id = so.id
      WHERE so.user_id=?
      GROUP BY so.id ORDER BY so.created_at DESC`, [userId]);
    return rows;
  }

  static async getPendingOrders() {
    const [rows] = await db.query(`
      SELECT so.id, so.status, so.total_amount AS estimated_total, 'cash' AS payment_method, so.delivery_address, so.created_at,
             s.name AS store_name, u.first_name, u.last_name,
             COUNT(soi.id) AS total_items
      FROM StoreOrders so
      JOIN Stores s ON s.id = so.store_id
      JOIN Users  u ON u.id = so.user_id
      LEFT JOIN StoreOrderItems soi ON soi.order_id = so.id
      WHERE so.status='pending'
      GROUP BY so.id ORDER BY so.created_at ASC LIMIT 50`);
    return rows;
  }

  static async getStoreOrders() {
    const [rows] = await db.query(`
      SELECT so.id, so.status, so.total_amount AS estimated_total, 'cash' AS payment_method, so.delivery_address, so.created_at,
             s.name AS store_name, u.first_name, u.last_name,
             COUNT(soi.id) AS total_items
      FROM StoreOrders so
      JOIN Stores s ON s.id = so.store_id
      JOIN Users  u ON u.id = so.user_id
      LEFT JOIN StoreOrderItems soi ON soi.order_id = so.id
      GROUP BY so.id ORDER BY so.created_at DESC LIMIT 50`);
    return rows;
  }

  static async getAssignedOrders(courierId, includeAll = false) {
    const [rows] = await db.query(`
      SELECT so.id, so.status, so.delivery_address, so.total_amount AS estimated_total, 'cash' AS payment_method,
             so.courier_id, s.name AS store_name,
             u.first_name, u.last_name,
             COUNT(soi.id) AS total_items
      FROM StoreOrders so
      JOIN Stores s ON s.id = so.store_id
      JOIN Users  u ON u.id = so.user_id
      LEFT JOIN StoreOrderItems soi ON soi.order_id = so.id
      WHERE so.status IN ('ready_for_pickup','picked_up')
        AND (? = 1 OR so.courier_id IS NULL OR so.courier_id=?)
      GROUP BY so.id ORDER BY so.created_at ASC`,
      [includeAll ? 1 : 0, courierId]
    );
    return rows;
  }

  static async getCourierOrders(courierId, includeAll = false) {
    return this.getAssignedOrders(courierId, includeAll);
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

    const total = items.reduce((s, i) => s + Number(i.price_per_unit) * Number(i.quantity_needed), 0);

    // Shënim: StoreOrders ka kolonën "notes" (jo "delivery_note"). "payment_method"
    // nuk ruhet ende në DB — sot mbështetet vetëm "cash" (shih shopping.jsx, opsioni
    // "wallet" është disabled), prandaj e kthejmë gjithmonë 'cash' në SELECT-et më poshtë.
    const [r] = await db.query(
      `INSERT INTO StoreOrders (user_id,store_id,shopping_list_id,delivery_address,notes,status,total_amount)
       VALUES (?,?,?,?,?,?,?)`,
      [userId, store_id, shopping_list_id, delivery_address.trim(),
       delivery_note||null, "pending", total.toFixed(2)]);

    for (const item of items) {
      await db.query(
        "INSERT INTO StoreOrderItems (order_id,ingredient_id,quantity,unit,unit_price,total_price) VALUES (?,?,?,?,?,?)",
        [r.insertId, item.ingredient_id, item.quantity_needed, item.unit,
         Number(item.price_per_unit).toFixed(2),
         (Number(item.price_per_unit)*Number(item.quantity_needed)).toFixed(2)]);
    }

    const order = await this.getOrderById(r.insertId);
    await NotificationService.createForRoles(
      ["Admin", "Manager"],
      "order",
      "Porosi e re",
      "Ka ardhur një porosi e re për aprovim."
    );
    await audit(userId, "ORDER_CREATE", r.insertId, null, "pending");
    return order;
  }

  static async setStatus(order, status, actorId, { courierId } = {}) {
    const fields = ["status=?", "updated_by=?", "updated_at=NOW()"];
    const params = [status, actorId];
    if (courierId !== undefined) {
      fields.push("courier_id=?");
      params.push(courierId);
    }
    params.push(order.id);
    await db.query(`UPDATE StoreOrders SET ${fields.join(", ")} WHERE id=?`, params);
    await audit(actorId, "ORDER_STATUS", order.id, order.status, status);
    try {
      getIO()?.to(`user_${order.user_id}`).emit("order:status", {
        order_id: order.id,
        status,
        label: ORDER_LABELS[status] || status,
      });
    } catch {}
    return { order_id: Number(order.id), status, label: ORDER_LABELS[status] || status };
  }

  static assertManager(user) {
    if (!hasRole(user, ROLE.MANAGER)) throw { status: 403, message: "Vetëm manager/admin mund ta bëjë këtë veprim" };
  }

  static assertCourier(user) {
    if (!hasRole(user, ROLE.COURIER)) throw { status: 403, message: "Vetëm korrier/admin mund ta bëjë këtë veprim" };
  }

  static async approveOrder(orderId, user) {
    this.assertManager(user);
    const order = await this.getOrderById(orderId);
    if (order.status !== "pending") throw { status: 409, message: "Mund të aprovohet vetëm porosi në pritje" };
    const result = await this.setStatus(order, "ready_for_pickup", user.id);
    await NotificationService.createAndEmit(
      order.user_id,
      "order",
      "Porosia u pranua",
      "Porosia juaj u pranua nga menaxheri."
    );
    await NotificationService.createForRoles(
      ["Admin", "Courier"],
      "order",
      "Porosi gati për dorëzim",
      "Një porosi është gati për t'u marrë."
    );
    return result;
  }

  static async rejectOrder(orderId, user) {
    this.assertManager(user);
    const order = await this.getOrderById(orderId);
    if (order.status !== "pending") throw { status: 409, message: "Mund të refuzohet vetëm porosi në pritje" };
    const result = await this.setStatus(order, "rejected", user.id);
    await NotificationService.createAndEmit(
      order.user_id,
      "order",
      "Porosia u refuzua",
      "Porosia juaj u refuzua nga menaxheri."
    );
    return result;
  }

  static async readyOrder(orderId, user) {
    this.assertManager(user);
    const order = await this.getOrderById(orderId);
    if (!["pending", "approved"].includes(order.status)) {
      throw { status: 409, message: "Porosia nuk mund të shënohet gati në këtë status" };
    }
    const result = await this.setStatus(order, "ready_for_pickup", user.id);
    await NotificationService.createForRoles(
      ["Admin", "Courier"],
      "order",
      "Porosi gati për dorëzim",
      "Një porosi është gati për t'u marrë."
    );
    return result;
  }

  static async pickupOrder(orderId, user) {
    this.assertCourier(user);
    const order = await this.getOrderById(orderId);
    if (order.status !== "ready_for_pickup") throw { status: 409, message: "Mund të merret vetëm porosi gati për dorëzim" };
    if (order.courier_id && Number(order.courier_id) !== Number(user.id) && !hasRole(user, ["Admin"])) {
      throw { status: 403, message: "Kjo porosi i është caktuar një korrieri tjetër" };
    }
    const result = await this.setStatus(order, "picked_up", user.id, { courierId: order.courier_id || user.id });
    await NotificationService.createAndEmit(
      order.user_id,
      "order",
      "Porosia u mor nga korrieri",
      "Porosia u mor nga korrieri"
    );
    return result;
  }

  static async deliverOrder(orderId, user) {
    this.assertCourier(user);
    const order = await this.getOrderById(orderId);
    if (order.status !== "picked_up") throw { status: 409, message: "Mund të dorëzohet vetëm porosi e marrë nga korrieri" };
    if (order.courier_id && Number(order.courier_id) !== Number(user.id) && !hasRole(user, ["Admin"])) {
      throw { status: 403, message: "Kjo porosi i është caktuar një korrieri tjetër" };
    }
    const result = await this.setStatus(order, "delivered", user.id, { courierId: order.courier_id || user.id });
    await NotificationService.createAndEmit(
      order.user_id,
      "order",
      "Porosia u dorëzua",
      "Porosia u dorëzua"
    );
    return result;
  }

  static async updateStatus(orderId, status, user) {
    const actions = {
      approved: () => this.approveOrder(orderId, user),
      ready_for_pickup: () => this.readyOrder(orderId, user),
      rejected: () => this.rejectOrder(orderId, user),
      picked_up: () => this.pickupOrder(orderId, user),
      delivered: () => this.deliverOrder(orderId, user),
      cancelled: async () => {
        this.assertManager(user);
        const order = await this.getOrderById(orderId);
        if (["delivered", "rejected", "cancelled"].includes(order.status)) throw { status: 409, message: "Porosia nuk mund të anulohet" };
        return this.setStatus(order, "cancelled", user.id);
      },
    };
    if (!actions[status]) throw { status: 400, message: "Status i pavlefshëm" };
    return actions[status]();
  }

  static async claimOrder(orderId, courierId) {
    const order = await this.getOrderById(orderId);
    if (order.courier_id) throw { status: 400, message: "Porosia është marrë tashmë" };
    if (order.status !== "ready_for_pickup")
      throw { status: 400, message: "Porosia nuk është gati për marrje" };
    await db.query(
      "UPDATE StoreOrders SET courier_id=?, updated_at=NOW() WHERE id=?",
      [courierId, orderId]);
    return { order_id: Number(orderId), status: order.status, label: ORDER_LABELS[order.status] };
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
