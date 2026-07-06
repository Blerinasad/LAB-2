// notification.controller.js — thin controller, zero business logic
import { NotificationService } from "../services/notification.service.js";

export class NotificationController {
    static async getMy(req,res){try{const d=await NotificationService.getMy(req.user.id,req.query);res.json({success:true,data:d});}catch(e){res.status(500).json({success:false,message:e.message});}}
    static async getUnreadCount(req,res){try{const d=await NotificationService.getUnreadCount(req.user.id);res.json({success:true,data:{count:d}});}catch(e){res.status(500).json({success:false,message:e.message});}}
    static async markRead(req,res){try{await NotificationService.markRead(req.params.id,req.user.id);res.json({success:true,message:'Lexuar'});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async markAllRead(req,res){try{await NotificationService.markAllRead(req.user.id);res.json({success:true,message:'Të gjitha lexuar'});}catch(e){res.status(500).json({success:false,message:e.message});}}
    static async getById(req,res){res.json({success:true,data:{}});}
}
