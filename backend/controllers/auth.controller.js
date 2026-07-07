import { AuthService } from "../services/auth.service.js";
import { sendPasswordReset } from "../util/mailer.js";

const COOKIE_OPTS = { httpOnly:true, sameSite:"lax", secure: process.env.NODE_ENV==="production", maxAge: 7*24*60*60*1000 };

export class AuthController {
  static async login(req, res) {
    try {
      const data = await AuthService.login(req.body.email, req.body.password);
      res.cookie("refreshToken", data.refreshToken, COOKIE_OPTS);
      res.json({ success:true, data });
    } catch(e) { res.status(e.status||500).json({ success:false, message:e.message }); }
  }

  static async refreshToken(req, res) {
    try {
      const token = req.cookies?.refreshToken;
      if (!token) return res.status(401).json({ success:false, message:"Refresh token mungon" });
      const data = await AuthService.refresh(token);
      res.cookie("refreshToken", data.refreshToken, COOKIE_OPTS);
      res.json({ success:true, data });
    } catch(e) { res.clearCookie("refreshToken"); res.status(e.status||401).json({ success:false, message:e.message }); }
  }

  static async logout(req, res) {
    try {
      await AuthService.logout(req.cookies?.refreshToken);
      res.clearCookie("refreshToken");
      res.json({ success:true, message:"U çkyç me sukses" });
    } catch { res.clearCookie("refreshToken"); res.json({ success:true }); }
  }

  static async logoutAll(req, res) {
    try {
      await AuthService.logoutAll(req.user.id);
      res.clearCookie("refreshToken");
      res.json({ success:true, message:"Të gjitha sesionet u mbyllën" });
    } catch(e) { res.status(500).json({ success:false, message:e.message }); }
  }

  static async me(req, res) {
    try {
      const user = await AuthService.me(req.user.id);
      res.json({ success:true, data:user });
    } catch(e) { res.status(e.status||500).json({ success:false, message:e.message }); }
  }

  static async forgotPassword(req, res) {
    try {
      const result = await AuthService.forgotPassword(req.body.email);
      if (result) {
        const link = `${process.env.FRONTEND_URL||"http://localhost:5173"}/reset-password?token=${result.token}&uid=${result.userId}`;
        await sendPasswordReset(result.email, link).catch(()=>{});
      }
      res.json({ success:true, message:"Nëse email ekziston, do të marrësh link" });
    } catch(e) { res.status(e.status||500).json({ success:false, message:e.message }); }
  }

  static async resetPassword(req, res) {
    try {
      const { token, uid, password } = req.body;
      await AuthService.resetPassword(token, uid, password);
      res.json({ success:true, message:"Fjalëkalimi u ndryshua. Kyçu sërish." });
    } catch(e) { res.status(e.status||500).json({ success:false, message:e.message }); }
  }
}
