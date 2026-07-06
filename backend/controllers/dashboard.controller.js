import { DashboardService } from "../services/dashboard.service.js";
export class DashboardController {
  static async getSummary(req,res)  { try{const d=await DashboardService.getSummary(req.user.id,req.user.roles||[]);res.json({success:true,data:d});}catch(e){res.status(500).json({success:false,message:e.message});} }
  static async getActivity(req,res) { try{const d=await DashboardService.getActivity(req.user.id,req.query.limit);res.json({success:true,data:d});}catch(e){res.status(500).json({success:false,message:e.message});} }
  static async getCharts(req,res)   { try{const d=await DashboardService.getCharts(req.user.id);res.json({success:true,data:d});}catch(e){res.status(500).json({success:false,message:e.message});} }
}
