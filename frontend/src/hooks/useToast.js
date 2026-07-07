import { useDispatch } from "react-redux";
import { toast } from "../store/toastSlice.js";

export const useToast = () => {
  const dispatch = useDispatch();
  return {
    success: (title, msg = "") => dispatch(toast("success", title, msg)),
    warn: (title, msg = "") => dispatch(toast("warn", title, msg)),
    danger: (title, msg = "") => dispatch(toast("danger", title, msg)),
    info: (title, msg = "") => dispatch(toast("info", title, msg)),
  };
};
