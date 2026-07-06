// inventory.controller.js — thin controller, zero business logic
import { InventoryService } from "../services/inventory.service.js";

export class InventoryController {
    static async getAll(req,res){try{const d=await InventoryService.getAll(req.user.id,req.query);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async getById(req,res){try{const d=await InventoryService.getById(req.params.id,req.user.id);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async getExpiring(req,res){try{const d=await InventoryService.getExpiring(req.user.id,req.query.days||3);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async create(req,res){try{const d=await InventoryService.create(req.user.id,req.body);res.status(201).json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async update(req,res){try{const d=await InventoryService.update(req.params.id,req.user.id,req.body);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async delete(req,res){try{await InventoryService.delete(req.params.id,req.user.id);res.json({success:true,message:'Artikulli u fshi'});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async exportInventory(req,res){try{const csv=await InventoryService.exportCSV(req.user.id);res.setHeader('Content-Type','text/csv');res.setHeader('Content-Disposition','attachment;filename=inventory.csv');res.send(csv);}catch(e){res.status(500).json({success:false,message:e.message});}}
    static async importInventory(req,res){res.json({success:true,message:'Import OK - implemento sipas CSV format'});}
}
