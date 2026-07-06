import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/auth.context.jsx";
import api from "../services/api.js";
import { getSocket } from "../services/socket.js";
import { Badge, Card, Modal, Spinner, Empty, FormGroup, Input, Select, SearchBar, Textarea } from "../components/ui.jsx";
import { useToast } from "../hooks/use-toast.js";
import styles from "./page.module.css";

const STATUS_COLOR = { active: "sage", completed: "copper", archived: "ash" };
const STATUS_LABEL = { active: "Aktive", completed: "Kompletuar", archived: "Arkivuar" };

const ORDER_LABEL = {
  pending: "Në pritje",
  approved: "U pranua",
  rejected: "U refuzua",
  ready_for_pickup: "Gati për dorëzim",
  picked_up: "U mor nga korrieri",
  delivered: "U dorëzua",
  cancelled: "U anulua",
};

const ORDER_COLOR = {
  pending: "gold",
  approved: "sage",
  rejected: "danger",
  ready_for_pickup: "gold",
  picked_up: "copper",
  delivered: "sage",
  cancelled: "ash",
};

const MANAGER_NEXT = {
  pending: ["approve", "reject"],
  approved: ["ready"],
};

const COURIER_NEXT = {
  ready_for_pickup: ["pickup"],
  picked_up: ["deliver"],
};

const ACTION_LABEL = {
  approve: "Aprovo",
  reject: "Refuzo",
  ready: "Gati",
  pickup: "Marrë",
  deliver: "Dorëzuar",
};

function pct(done, total) {
  if (!total) return 0;
  return Math.round((Number(done || 0) / Number(total || 1)) * 100);
}

function money(value) {
  return `${Number(value || 0).toFixed(2)}€`;
}

function isPositive(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

export function Shopping() {
  const toast = useToast();
  const { user } = useAuth();
  const roles = user?.roles || [];
  const isManager = roles.includes("Admin") || roles.includes("Manager");
  const isCourier = roles.includes("Admin") || roles.includes("Courier");

  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [listModal, setListModal] = useState(false);
  const [itemModal, setItemModal] = useState(false);
  const [orderModal, setOrderModal] = useState(false);
  const [orderDetail, setOrderDetail] = useState(null);

  const [title, setTitle] = useState("");
  const [itemForm, setItemForm] = useState({ ingredient_id: "", quantity_needed: "", unit: "" });
  const [orderForm, setOrderForm] = useState({ store_id: "", delivery_address: "", delivery_note: "", payment_method: "cash" });
  const [filters, setFilters] = useState({ search: "", status: "", from_date: "", to_date: "", sort: "created_at", order: "desc" });

  const [ingredients, setIngredients] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [stores, setStores] = useState([]);
  const [orders, setOrders] = useState([]);
  const [storeOrders, setStoreOrders] = useState([]);
  const [courierOrders, setCourierOrders] = useState([]);
  const [spending, setSpending] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [marketEnabled, setMarketEnabled] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const activeLists = useMemo(() => lists.filter((l) => l.status === "active").length, [lists]);
  const pendingItems = useMemo(() => lists.reduce((sum, l) => sum + Number(l.pending_items || 0), 0), [lists]);
  const totalSpent = useMemo(() => orders.reduce((sum, o) => sum + Number(o.estimated_total || 0), 0), [orders]);

  const load = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ""));
      const { data } = await api.get("/shopping-lists", { params });
      const nextLists = data.data || [];
      setLists(nextLists);
      if (selected?.id && !nextLists.some((list) => list.id === selected.id)) {
        setSelected(null);
        setDetail(null);
      }
    } catch (e) {
      toast.danger("Gabim", e.response?.data?.message || "Listat nuk u lexuan");
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id) => {
    const { data } = await api.get(`/shopping-lists/${id}`);
    setDetail(data.data);
    setSelected(data.data);
  };

  const loadSuggestions = async () => {
    const { data } = await api.get("/shopping-lists/suggestions", { params: { limit: 10 } });
    setSuggestions(data.data || []);
  };

  const loadMarket = async () => {
    try {
      const requests = [
        api.get("/market/stores"),
        api.get("/market/orders/my"),
        api.get("/market/orders/spending"),
        api.get("/market/orders/forecast"),
      ];
      if (isManager) requests.push(api.get("/market/orders/pending"));
      if (isCourier) requests.push(api.get("/market/orders/assigned"));

      const responses = await Promise.all(requests);
      const [storesRes, ordersRes, spendingRes, forecastRes] = responses;
      let index = 4;

      setStores(storesRes.data.data || []);
      setOrders(ordersRes.data.data || []);
      setSpending(spendingRes.data.data || []);
      setForecast(forecastRes.data.data || null);
      if (isManager) setStoreOrders(responses[index++]?.data?.data || []);
      if (isCourier) setCourierOrders(responses[index++]?.data?.data || []);
      setMarketEnabled(true);
    } catch {
      setMarketEnabled(false);
    }
  };

  useEffect(() => { load(); }, [filters]);

  useEffect(() => {
    api.get("/ingredients").then(({ data }) => setIngredients(data.data || [])).catch(() => {});
    loadSuggestions().catch(() => {});
    loadMarket();
  }, [isManager, isCourier]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const refreshOrders = () => loadMarket();
    socket.on("notification:new", refreshOrders);
    socket.on("order:status", refreshOrders);
    return () => {
      socket.off("notification:new", refreshOrders);
      socket.off("order:status", refreshOrders);
    };
  }, [isManager, isCourier]);

  useEffect(() => {
    const listId = sessionStorage.getItem("sk_open_shopping_list");
    if (!listId || !lists.some((list) => String(list.id) === listId)) return;
    sessionStorage.removeItem("sk_open_shopping_list");
    loadDetail(listId).catch(() => {});
  }, [lists]);

  const refreshAll = async () => {
    await Promise.allSettled([load(), loadMarket(), loadSuggestions()]);
    if (detail?.id) await loadDetail(detail.id).catch(() => {});
  };

  const createList = async (event) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (cleanTitle.length < 3) return toast.warn("Titull i shkurtër", "Titulli duhet të ketë së paku 3 karaktere.");
    try {
      const { data } = await api.post("/shopping-lists", { title: cleanTitle });
      toast.success("Lista u krijua", cleanTitle);
      setListModal(false);
      setTitle("");
      await load();
      if (data.data?.id) await loadDetail(data.data.id);
    } catch (e) {
      toast.danger("Gabim", e.response?.data?.message || "Lista nuk u krijua");
    }
  };

  const addItem = async (event) => {
    event.preventDefault();
    if (!detail?.id) return toast.warn("Zgjidh listë", "Zgjidh një listë para se të shtosh artikull.");
    if (detail.status !== "active") return toast.warn("Lista nuk është aktive", "Mund të shtosh artikuj vetëm në listë aktive.");
    if (!itemForm.ingredient_id || !isPositive(itemForm.quantity_needed) || !itemForm.unit.trim()) return toast.warn("Të dhëna jo të plota", "Zgjidh ingredientin, sasinë dhe njësinë.");

    try {
      await api.post(`/shopping-lists/${detail.id}/items`, {
        ingredient_id: Number(itemForm.ingredient_id),
        quantity_needed: Number(itemForm.quantity_needed),
        unit: itemForm.unit.trim(),
      });
      setItemModal(false);
      setItemForm({ ingredient_id: "", quantity_needed: "", unit: "" });
      await refreshAll();
    } catch (e) {
      toast.danger("Gabim", e.response?.data?.message || "Artikulli nuk u shtua");
    }
  };

  const addSuggested = async (ingredient) => {
    if (!detail?.id) return toast.warn("Zgjidh listë", "Zgjidh një listë aktive para se të shtosh sugjerimin.");
    if (detail.status !== "active") return toast.warn("Lista nuk është aktive", "Sugjerimet shtohen vetëm në lista aktive.");
    try {
      await api.post(`/shopping-lists/${detail.id}/items`, {
        ingredient_id: ingredient.ingredient_id,
        quantity_needed: Math.max(1, Number(ingredient.current_quantity || 0) < 1 ? 2 : 1),
        unit: ingredient.unit,
      });
      toast.success("Sugjerimi u shtua", ingredient.ingredient_name);
      await refreshAll();
    } catch (e) {
      toast.danger("Gabim", e.response?.data?.message || "Sugjerimi nuk u shtua");
    }
  };

  const togglePurchased = async (listId, itemId) => {
    try {
      await api.patch(`/shopping-lists/${listId}/items/${itemId}/purchase`);
      await refreshAll();
    } catch (e) {
      toast.danger("Gabim", e.response?.data?.message || "Artikulli nuk u përditësua");
    }
  };

  const removeItem = async (listId, itemId) => {
    if (!confirm("Hiqe artikullin nga lista?")) return;
    try {
      await api.delete(`/shopping-lists/${listId}/items/${itemId}`);
      toast.warn("Artikulli u hoq");
      await refreshAll();
    } catch (e) {
      toast.danger("Gabim", e.response?.data?.message || "Artikulli nuk u hoq");
    }
  };

  const updateListStatus = async (id, status) => {
    try {
      await api.patch(`/shopping-lists/${id}/status`, { status });
      toast.success("Lista u përditësua", STATUS_LABEL[status] || status);
      await refreshAll();
    } catch (e) {
      toast.danger("Gabim", e.response?.data?.message || "Lista nuk u përditësua");
    }
  };

  const exportList = async (id) => {
    try {
      const res = await api.get(`/shopping-lists/${id}/export`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `shopping_list_${id}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.danger("Gabim", e.response?.data?.message || "Eksportimi dështoi");
    }
  };

  const createOrder = async (event) => {
    event.preventDefault();
    if (!detail?.id) return;
    if (!orderForm.store_id) return toast.warn("Zgjidh dyqanin", "Porosia duhet të ketë dyqan/market.");
    if (orderForm.delivery_address.trim().length < 8) return toast.warn("Adresë e shkurtër", "Shkruaj adresë më të qartë për dorëzim.");

    try {
      const { data } = await api.post("/market/orders", {
        shopping_list_id: detail.id,
        store_id: Number(orderForm.store_id),
        delivery_address: orderForm.delivery_address.trim(),
        delivery_note: orderForm.delivery_note.trim(),
        payment_method: orderForm.payment_method,
      });
      toast.success("Porosia u dërgua te dyqani", `Totali i parashikuar: ${money(data.data?.estimated_total)}`);
      setOrderModal(false);
      setOrderForm({ store_id: "", delivery_address: "", delivery_note: "", payment_method: "cash" });
      await loadMarket();
    } catch (e) {
      toast.danger("Gabim", e.response?.data?.message || "Porosia nuk u krijua");
    }
  };

  const openOrder = async (id) => {
    try {
      const { data } = await api.get(`/market/orders/${id}`);
      setOrderDetail(data.data);
    } catch (e) {
      toast.danger("Gabim", e.response?.data?.message || "Porosia nuk u lexua");
    }
  };

  const runOrderAction = async (id, action) => {
    const endpoint = {
      approve: `/market/orders/${id}/approve`,
      reject: `/market/orders/${id}/reject`,
      ready: `/market/orders/${id}/ready`,
      pickup: `/market/orders/${id}/pickup`,
      deliver: `/market/orders/${id}/deliver`,
    }[action];
    if (!endpoint) return;
    setUpdatingOrderId(id);
    try {
      const { data } = await api.patch(endpoint);
      const nextStatus = data.data?.status;
      toast.success("Statusi u përditësua", ORDER_LABEL[nextStatus] || ACTION_LABEL[action] || action);
      await loadMarket();
      if (orderDetail?.id === id) await openOrder(id);
    } catch (e) {
      toast.danger("Gabim", e.response?.data?.message || "Statusi nuk u përditësua");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const claimOrder = async (id) => {
    setUpdatingOrderId(id);
    try {
      await api.post(`/market/orders/${id}/claim`);
      toast.success("Porosia u mor nga korrieri");
      await loadMarket();
      if (orderDetail?.id === id) await openOrder(id);
    } catch (e) {
      toast.danger("Gabim", e.response?.data?.message || "Porosia nuk u mor");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const rebuy = async (id) => {
    try {
      const { data } = await api.post(`/market/orders/${id}/rebuy`);
      toast.success("Lista për riblerje u krijua", `Lista #${data.data?.shopping_list_id}`);
      await load();
      if (data.data?.shopping_list_id) await loadDetail(data.data.shopping_list_id);
    } catch (e) {
      toast.danger("Gabim", e.response?.data?.message || "Riblerja dështoi");
    }
  };

  const activeItems = detail?.items?.filter((item) => !item.is_purchased) || [];

  return (
    <div className={styles.shopPage}>
      <div className={styles.shopStats}>
        <Card><div className={styles.shopStat}><span>{lists.length}</span><p>Lista gjithsej</p></div></Card>
        <Card><div className={styles.shopStat}><span>{activeLists}</span><p>Aktive</p></div></Card>
        <Card><div className={styles.shopStat}><span>{pendingItems}</span><p>Artikuj për blerje</p></div></Card>
        <Card><div className={styles.shopStat}><span>{money(totalSpent)}</span><p>Porosi historike</p></div></Card>
      </div>

      <Card title="Rrjedha e porosisë" sub="Lista krijohet nga përdoruesi, dërgohet te dyqani dhe statusi përditësohet në kohë reale.">
        <div className={styles.shopFlow}>
          <span>1. Përdoruesi krijon listën</span>
          <span>2. Lista dërgohet te marketi</span>
          <span>3. Marketi pranon ose refuzon</span>
          <span>4. Marketi përgatit porosinë</span>
          <span>5. Korrieri e merr porosinë</span>
          <span>6. Përdoruesi njoftohet deri në dorëzim</span>
        </div>
      </Card>

      <div className={styles.shopLayout}>
        <div className={styles.shopSidebar}>
          <Card title="Filtrat" action={<button className="btn-primary btn-sm" onClick={() => setListModal(true)}>Listë e Re</button>}>
            <div className={styles.shopFilters}>
              <SearchBar value={filters.search} onChange={(value) => setFilters({ ...filters, search: value })} placeholder="Kërko listë..." />
              <Select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
                <option value="">Të gjitha statuset</option>
                <option value="active">Aktive</option>
                <option value="completed">Kompletuar</option>
                <option value="archived">Arkivuar</option>
              </Select>
              <div className={styles.shopFilterRow}>
                <Input type="date" value={filters.from_date} onChange={(event) => setFilters({ ...filters, from_date: event.target.value })} />
                <Input type="date" value={filters.to_date} onChange={(event) => setFilters({ ...filters, to_date: event.target.value })} />
              </div>
              <div className={styles.shopFilterRow}>
                <Select value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value })}>
                  <option value="created_at">Data</option>
                  <option value="title">Titulli</option>
                  <option value="status">Statusi</option>
                  <option value="total_items">Artikuj</option>
                </Select>
                <Select value={filters.order} onChange={(event) => setFilters({ ...filters, order: event.target.value })}>
                  <option value="desc">Zbritës</option>
                  <option value="asc">Rritës</option>
                </Select>
              </div>
            </div>
          </Card>

          <Card title="Listat e blerjeve">
            {loading ? <Spinner center /> : lists.length === 0 ? <Empty title="Nuk ka lista" /> : (
              <div className={styles.shopListStack}>
                {lists.map((list) => (
                  <button key={list.id} className={`${styles.shopListCard} ${selected?.id === list.id ? styles.shopListActive : ""}`} onClick={() => loadDetail(list.id)}>
                    <div className={styles.shopListHead}>
                      <span>{list.title}</span>
                      <Badge variant={STATUS_COLOR[list.status] || "ash"}>{STATUS_LABEL[list.status] || list.status}</Badge>
                    </div>
                    <p className={styles.shopListMeta}>{Number(list.purchased_items || 0)} nga {Number(list.total_items || 0)} artikuj të blerë</p>
                    <div className={styles.shopProgress}><span style={{ width: `${pct(list.purchased_items, list.total_items)}%` }} /></div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className={styles.shopMainPanel}>
          <Card title={detail ? detail.title : "Detajet e listës"} sub={detail ? `${detail.items?.length || 0} artikuj në listë` : "Zgjidh një listë nga ana e majtë"} action={detail && (
            <div className={styles.shopActions}>
              <button className="btn-primary btn-sm" variant="ghost" onClick={() => exportList(detail.id)}>Eksporto CSV</button>
              {marketEnabled && detail.status === "active" && activeItems.length > 0 && <button className="btn-primary btn-sm" onClick={() => setOrderModal(true)}>Dërgo te Dyqani</button>}
              {detail.status === "active" && <button className="btn-primary btn-sm" variant="ghost" onClick={() => setItemModal(true)}>Shto Artikull</button>}
              {detail.status === "active" && <button className="btn-primary btn-sm" variant="success" onClick={() => updateListStatus(detail.id, "completed")}>Kompleto</button>}
              {detail.status !== "archived" && <button className="btn-primary btn-sm" variant="ghost" onClick={() => updateListStatus(detail.id, "archived")}>Arkivo</button>}
            </div>
          )}>
            {!detail ? <Empty title="Asnjë listë e zgjedhur" /> : detail.items?.length === 0 ? <Empty title="Lista është bosh" sub="Shto artikuj manualisht ose gjeneroje nga një plan javor." /> : (
              <div className={styles.shopItemsGrid}>
                {detail.items.map((item) => (
                  <div key={item.id} className={`${styles.shopItemCard} ${item.is_purchased ? styles.purchased : ""}`}>
                    <button className={`${styles.shopCheck} ${item.is_purchased ? styles.done : ""}`} onClick={() => togglePurchased(detail.id, item.id)} aria-label="Ndrysho statusin e artikullit">{item.is_purchased ? "✓" : ""}</button>
                    <div className={styles.shopItemText}>
                      <p className={styles.shopName}>{item.ingredient_name}</p>
                      <p className={styles.shopCat}>{item.category_name}</p>
                    </div>
                    <div className={styles.shopItemActions}>
                      <span className={styles.shopQty}>{item.quantity_needed} {item.unit}</span>
                      {detail.status === "active" && <button className="btn-danger btn-xs" onClick={() => removeItem(detail.id, item.id)}>Hiq</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className={styles.shopBottomGrid}>
            <Card title="Sugjerime inteligjente" sub="Bazuar në stok të ulët dhe artikuj afër skadimit">
              {suggestions.length === 0 ? <Empty title="Nuk ka sugjerime" /> : (
                <div className={styles.shopSuggestGrid}>
                  {suggestions.map((item) => (
                    <div key={item.ingredient_id} className={styles.shopSuggestion}>
                      <div>
                        <p>{item.ingredient_name}</p>
                        <span>{item.category_name} · stok {Number(item.current_quantity).toFixed(2)} {item.unit} · skadon për {item.days_until_expiry} ditë</span>
                      </div>
                      <button className="btn-primary btn-sm" variant="ghost" onClick={() => addSuggested(item)}>Shto</button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Buxheti i ushqimeve" sub="Parashikim nga historiku i porosive">
              {!marketEnabled ? <p className={styles.shopHint}>Ekzekuto migrimin e marketit për ta aktivizuar.</p> : !forecast ? <Empty title="Nuk ka parashikim" /> : (
                <div className={styles.budgetBox}>
                  <div><span>{money(forecast.predicted_amount)}</span><p>Parashikim për muajin tjetër</p></div>
                  <div><span>{money(forecast.recommended_reserve)}</span><p>Shumë e rekomanduar për ta ndarë</p></div>
                  <p className={styles.shopHint}>Metoda: {forecast.method}. Sa më shumë porosi reale, aq më i saktë bëhet parashikimi.</p>
                </div>
              )}
            </Card>
          </div>

          <Card title="Historiku i porosive" sub="Status, total, detaje dhe riblerje">
            {!marketEnabled ? <p className={styles.shopHint}>Moduli i porosive është gati në kod. Ekzekuto migrimin SQL te backend/migrations për ta aktivizuar.</p> : orders.length === 0 ? <Empty title="Nuk ka porosi" /> : (
              <div className={styles.orderStack}>
                {orders.map((order) => (
                  <div key={order.id} className={styles.orderRow}>
                    <button className={styles.orderInfo} onClick={() => openOrder(order.id)}>
                      <p>#{order.id} · {order.store_name}</p>
                      <span>{order.total_items} artikuj · {money(order.estimated_total)} · {order.payment_method} · {order.created_at?.slice(0,16).replace("T", " ")}</span>
                    </button>
                    <div className={styles.orderActions}>
                      <Badge variant={ORDER_COLOR[order.status] || "ash"}>{ORDER_LABEL[order.status] || order.status}</Badge>
                      <button className="btn-primary btn-sm" variant="ghost" onClick={() => rebuy(order.id)}>Re-buy</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {isManager && marketEnabled && (
            <Card title="Paneli i aprovimit" sub="Manageri aprovon ose refuzon porositë në pritje. Përdoruesi dhe korrierët njoftohen automatikisht.">
              {storeOrders.length === 0 ? <Empty title="Nuk ka porosi për market" /> : (
                <div className={styles.orderStack}>
                  {storeOrders.slice(0, 12).map((order) => (
                    <div key={order.id} className={styles.orderRow}>
                      <button className={styles.orderInfo} onClick={() => openOrder(order.id)}>
                        <p>#{order.id} · {order.first_name} {order.last_name} · {order.store_name}</p>
                        <span>{order.total_items} artikuj · {money(order.estimated_total)} · {order.delivery_address}</span>
                      </button>
                      <div className={styles.orderActions}>
                        <Badge variant={ORDER_COLOR[order.status] || "ash"}>{ORDER_LABEL[order.status] || order.status}</Badge>
                        {(MANAGER_NEXT[order.status] || []).map((action) => (
                          <button
                            className="btn-primary btn-sm"
                            key={action}
                            disabled={updatingOrderId === order.id}
                            onClick={() => runOrderAction(order.id, action)}
                          >
                            {updatingOrderId === order.id ? "..." : ACTION_LABEL[action]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {isCourier && marketEnabled && (
            <Card title="Paneli i korrierit" sub="Korrieri sheh porositë gati, i shënon të marra dhe pastaj të dorëzuara.">
              {courierOrders.length === 0 ? <Empty title="Nuk ka porosi për korrier" /> : (
                <div className={styles.orderStack}>
                  {courierOrders.slice(0, 12).map((order) => (
                    <div key={order.id} className={styles.orderRow}>
                      <button className={styles.orderInfo} onClick={() => openOrder(order.id)}>
                        <p>#{order.id} · {order.first_name} {order.last_name}</p>
                        <span>{order.store_name} · {order.delivery_address} · {money(order.estimated_total)}</span>
                      </button>
                      <div className={styles.orderActions}>
                        <Badge variant={ORDER_COLOR[order.status] || "ash"}>{ORDER_LABEL[order.status] || order.status}</Badge>
                        {!order.courier_id && order.status === "ready_for_pickup" && (
                          <button className="btn-primary btn-sm" disabled={updatingOrderId === order.id} onClick={() => claimOrder(order.id)}>
                            {updatingOrderId === order.id ? "..." : "Merre"}
                          </button>
                        )}
                        {(COURIER_NEXT[order.status] || []).map((action) => (
                          <button
                            className="btn-primary btn-sm"
                            key={action}
                            disabled={updatingOrderId === order.id}
                            onClick={() => runOrderAction(order.id, action)}
                          >
                            {updatingOrderId === order.id ? "..." : ACTION_LABEL[action]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {listModal && (
        <Modal title="Lista e Re e Blerjeve" onClose={() => setListModal(false)} actions={<><button className="btn-secondary" onClick={() => setListModal(false)}>Anulo</button><button className="btn-primary" form="sl-form" type="submit">Krijo</button></>}>
          <form id="sl-form" onSubmit={createList} autoComplete="off">
            <FormGroup label="Titulli"><Input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={3} maxLength={120} /></FormGroup>
          </form>
        </Modal>
      )}

      {itemModal && (
        <Modal title="Shto Artikull" onClose={() => setItemModal(false)} actions={<><button className="btn-secondary" onClick={() => setItemModal(false)}>Anulo</button><button className="btn-primary" form="item-form" type="submit">Shto</button></>}>
          <form id="item-form" onSubmit={addItem} autoComplete="off">
            <FormGroup label="Ingredienti">
              <Select value={itemForm.ingredient_id} onChange={(event) => {
                const ingredient = ingredients.find((item) => String(item.id) === event.target.value);
                setItemForm({ ...itemForm, ingredient_id: event.target.value, unit: ingredient?.unit || itemForm.unit });
              }} required>
                <option value="">Zgjidh...</option>
                {ingredients.map((ingredient) => <option key={ingredient.id} value={ingredient.id}>{ingredient.name} ({ingredient.unit})</option>)}
              </Select>
            </FormGroup>
            <FormGroup label="Sasia e nevojshme"><Input type="number" step="0.01" min="0.01" value={itemForm.quantity_needed} onChange={(event) => setItemForm({ ...itemForm, quantity_needed: event.target.value })} required /></FormGroup>
            <FormGroup label="Njësia"><Input value={itemForm.unit} onChange={(event) => setItemForm({ ...itemForm, unit: event.target.value })} required maxLength={20} /></FormGroup>
          </form>
        </Modal>
      )}

      {orderModal && (
        <Modal title="Dërgo Listën te Dyqani" onClose={() => setOrderModal(false)} actions={<><button className="btn-secondary" onClick={() => setOrderModal(false)}>Anulo</button><button className="btn-primary" form="order-form" type="submit">Dërgo Porosinë</button></>}>
          <div className={styles.orderSummaryBox}>
            <p>Kjo porosi krijohet nga lista: <strong>{detail?.title}</strong></p>
            <span>{activeItems.length} artikuj aktivë do të dërgohen te dyqani i zgjedhur.</span>
          </div>
          <form id="order-form" onSubmit={createOrder} autoComplete="off">
            <FormGroup label="Dyqani / Marketi">
              <Select value={orderForm.store_id} onChange={(event) => setOrderForm({ ...orderForm, store_id: event.target.value })} required>
                <option value="">Zgjidh dyqanin...</option>
                {stores.map((store) => <option key={store.id} value={store.id}>{store.name} — {store.address}</option>)}
              </Select>
            </FormGroup>
            <FormGroup label="Mënyra e pagesës">
              <Select value={orderForm.payment_method} onChange={(event) => setOrderForm({ ...orderForm, payment_method: event.target.value })}>
                <option value="cash">Cash në dorëzim</option>
                <option value="wallet" disabled>Wallet — faza tjetër</option>
              </Select>
            </FormGroup>
            <FormGroup label="Adresa e dorëzimit"><Textarea value={orderForm.delivery_address} onChange={(event) => setOrderForm({ ...orderForm, delivery_address: event.target.value })} required minLength={8} maxLength={255} /></FormGroup>
            <FormGroup label="Shënim për dyqanin / korrierin"><Textarea value={orderForm.delivery_note} onChange={(event) => setOrderForm({ ...orderForm, delivery_note: event.target.value })} maxLength={500} /></FormGroup>
          </form>
        </Modal>
      )}

      {orderDetail && (
        <Modal wide title={`Porosia #${orderDetail.id}`} onClose={() => setOrderDetail(null)} actions={<button className="btn-primary" onClick={() => setOrderDetail(null)}>Mbyll</button>}>
          <div className={styles.orderDetail}>
            <div className={styles.orderDetailHead}>
              <Badge variant={ORDER_COLOR[orderDetail.status] || "ash"}>{ORDER_LABEL[orderDetail.status] || orderDetail.status}</Badge>
              <span>{orderDetail.store_name} · {money(orderDetail.estimated_total)} · {orderDetail.payment_method}</span>
            </div>
            <p className={styles.shopHint}>{orderDetail.delivery_address}</p>
            {orderDetail.courier_first_name && <p className={styles.shopHint}>Korrieri: {orderDetail.courier_first_name} {orderDetail.courier_last_name}</p>}
            <div className={styles.orderItems}>
              {orderDetail.items?.map((item) => <div key={item.id}><span>{item.ingredient_name}</span><span>{item.quantity_needed} {item.unit}</span><span>{money(item.subtotal)}</span></div>)}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default Shopping;
