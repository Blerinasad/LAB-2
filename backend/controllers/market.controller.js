// market.controller.js — thin controller, zero business logic
import { MarketService } from "../services/market.service.js";

export class MarketController {
    static async getStores(req,res){try{const d=await MarketService.getStores();res.json({success:true,data:d});}catch(e){res.status(500).json({success:false,message:e.message});}}
    static async myOrders(req,res){try{const d=await MarketService.getMyOrders(req.user.id);res.json({success:true,data:d});}catch(e){res.status(500).json({success:false,message:e.message});}}
    static async storeOrders(req,res){try{const d=await MarketService.getStoreOrders(req.user.id);res.json({success:true,data:d});}catch(e){res.status(500).json({success:false,message:e.message});}}
    static async courierOrders(req,res){try{const d=await MarketService.getCourierOrders(req.user.id,(req.user.roles||[]).includes("Admin"));res.json({success:true,data:d});}catch(e){res.status(500).json({success:false,message:e.message});}}
    static async getOrderById(req,res){try{const d=await MarketService.getOrderById(req.params.id);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async createOrder(req,res){try{const d=await MarketService.createOrder(req.user.id,req.body);res.status(201).json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async updateOrderStatus(req,res){try{const d=await MarketService.updateStatus(req.params.id,req.body.status,req.user);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async claimOrder(req,res){try{const d=await MarketService.claimOrder(req.params.id,req.user.id);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async rebuy(req,res){try{const d=await MarketService.rebuy(req.params.id,req.user.id);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async budgetForecast(req,res){try{const d=await MarketService.budgetForecast(req.user.id);res.json({success:true,data:d});}catch(e){res.status(500).json({success:false,message:e.message});}}
    static async spending(req,res){try{const d=await MarketService.getSpending(req.user.id);res.json({success:true,data:d});}catch(e){res.status(500).json({success:false,message:e.message});}}
}
