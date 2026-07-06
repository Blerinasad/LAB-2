// marketplace.controller.js — thin controller, zero business logic
import { MarketplaceService } from "../services/marketplace.service.js";

export class MarketplaceController {
    static async getStores(req,res){try{const d=await MarketplaceService.getStores();res.json({success:true,data:d});}catch(e){res.status(500).json({success:false,message:e.message});}}
    static async myOrders(req,res){try{const d=await MarketplaceService.getMyOrders(req.user.id);res.json({success:true,data:d});}catch(e){res.status(500).json({success:false,message:e.message});}}
    static async pendingOrders(req,res){try{const d=await MarketplaceService.getPendingOrders();res.json({success:true,data:d});}catch(e){res.status(500).json({success:false,message:e.message});}}
    static async storeOrders(req,res){try{const d=await MarketplaceService.getStoreOrders();res.json({success:true,data:d});}catch(e){res.status(500).json({success:false,message:e.message});}}
    static async courierOrders(req,res){try{const isAdmin=(req.user.roles||[]).includes("Admin");const d=await MarketplaceService.getCourierOrders(req.user.id,isAdmin);res.json({success:true,data:d});}catch(e){res.status(500).json({success:false,message:e.message});}}
    static async getOrderById(req,res){try{const d=await MarketplaceService.getOrderByIdForUser(req.params.id,req.user);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async createOrder(req,res){try{const d=await MarketplaceService.createOrder(req.user.id,req.body);res.status(201).json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async updateOrderStatus(req,res){try{const d=await MarketplaceService.updateStatus(req.params.id,req.body.status,req.user);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async approveOrder(req,res){try{const d=await MarketplaceService.approveOrder(req.params.id,req.user);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async rejectOrder(req,res){try{const d=await MarketplaceService.rejectOrder(req.params.id,req.user);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async readyOrder(req,res){try{const d=await MarketplaceService.readyOrder(req.params.id,req.user);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async pickupOrder(req,res){try{const d=await MarketplaceService.pickupOrder(req.params.id,req.user);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async deliverOrder(req,res){try{const d=await MarketplaceService.deliverOrder(req.params.id,req.user);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async claimOrder(req,res){try{const d=await MarketplaceService.claimOrder(req.params.id,req.user.id);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async rebuy(req,res){try{const d=await MarketplaceService.rebuy(req.params.id,req.user.id);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async budgetForecast(req,res){try{const d=await MarketplaceService.budgetForecast(req.user.id);res.json({success:true,data:d});}catch(e){res.status(500).json({success:false,message:e.message});}}
    static async spending(req,res){try{const d=await MarketplaceService.getSpending(req.user.id);res.json({success:true,data:d});}catch(e){res.status(500).json({success:false,message:e.message});}}
}
