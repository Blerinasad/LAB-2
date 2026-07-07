// Token store — ruan accessToken në localStorage për të mbijetuar page refresh
const KEY = 'accessToken';

const tokenStore = {
  get() { return localStorage.getItem(KEY); },
  set(token) {
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
  },
  clear() { localStorage.removeItem(KEY); },
};

export default tokenStore;
