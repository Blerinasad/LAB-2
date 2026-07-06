// report.controller.js — thin controller, zero business logic
import { ReportService } from "../services/report.service.js";

export class ReportController {
    static async getSummary(req,res){try{const d=await ReportService.getSummary(req.user.id);res.json({success:true,data:d});}catch(e){res.status(500).json({success:false,message:e.message});}}
    static async getWaste(req,res){try{const d=await ReportService.getWaste(req.user.id,req.query);if(req.query.format==='csv'){res.setHeader('Content-Type','text/csv');const rows=d.map(r=>`${r.id},"${r.ingredient_name}",${r.quantity_wasted},${r.reason},${r.created_at}`).join('\n');return res.send('ID,Ingredient,Sasia,Arsyeja,Data\n'+rows);}res.json({success:true,data:d});}catch(e){res.status(500).json({success:false,message:e.message});}}
    static async getConsumption(req,res){try{const d=await ReportService.getConsumption(req.user.id,req.query);res.json({success:true,data:d});}catch(e){res.status(500).json({success:false,message:e.message});}}
    static async getAuditLogs(req,res){try{const d=await ReportService.getAuditLogs(req.query);res.json({success:true,data:d});}catch(e){res.status(500).json({success:false,message:e.message});}}
}
