import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { connectSocket, disconnectSocket } from "../services/socket.js";
import tokenStore from "../services/token-store.js";
import api from "../services/api.js";
import { addNotif, setUnread } from "../store/notification.slice.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const dispatch = useDispatch();
  const [user,    setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const didBoot = useRef(false);

  // Boot: lexo accessToken nga localStorage dhe thirr /auth/me
  useEffect(() => {
    if (didBoot.current) return;
    didBoot.current = true;

    const boot = async () => {
      const savedToken = tokenStore.get();
      if (!savedToken) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get("/auth/me");
        const me = data.data || data;
        setUser(me);
      } catch {
        // Token i skaduar — provo refresh me cookie
        try {
          const { data } = await api.post("/auth/refresh-token");
          const result = data.data || data;
          const newToken = result.accessToken || result.token;
          if (newToken) {
            tokenStore.set(newToken);
            if (result.user) {
              setUser(result.user);
            } else {
              const me = await api.get("/auth/me");
              setUser(me.data.data || me.data);
            }
          } else {
            tokenStore.clear();
            setUser(null);
          }
        } catch {
          tokenStore.clear();
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    boot();
  }, []);

  // WebSocket
  useEffect(() => {
    if (!user) return;
    const socket = connectSocket(user.id);
    api.get("/notifications/unread-count")
      .then(({ data }) => dispatch(setUnread(Number(data.data?.count || 0))))
      .catch(() => {});
    const onNotification = (notification) => {
      dispatch(addNotif(notification));
    };
    socket.on("notification:new", onNotification);
    return () => {
      socket.off("notification:new", onNotification);
      disconnectSocket();
    };
  }, [user?.id]);

  const login = async (credentials) => {
    const { data } = await api.post("/auth/login", credentials);
    const result = data.data || data;
    const accessToken = result.accessToken || result.token;
    const u = result.user;
    tokenStore.set(accessToken);
    if (result.refreshToken) {
      localStorage.setItem("refreshToken", result.refreshToken);
    }
    localStorage.setItem("user", JSON.stringify(u));
    setUser(u);
    return u;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    tokenStore.clear();
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
