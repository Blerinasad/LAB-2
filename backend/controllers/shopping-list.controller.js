// shopping-list.controller.js — thin controller, zero business logic
import { ShoppingListService } from "../services/shopping-list.service.js";

export class ShoppingListController {
    static async getAll(req,res){try{const d=await ShoppingListService.getAll(req.user.id,req.query);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async getById(req,res){try{const d=await ShoppingListService.getById(req.params.id,req.user.id);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async create(req,res){try{const d=await ShoppingListService.create(req.user.id,req.body.title);res.status(201).json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async updateStatus(req,res){try{await ShoppingListService.updateStatus(req.params.id,req.user.id,req.body.status);res.json({success:true,message:'Statusi u ndryshua'});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async delete(req,res){try{await ShoppingListService.delete(req.params.id,req.user.id);res.json({success:true,message:'Lista u fshi'});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async addItem(req,res){try{const d=await ShoppingListService.addItem(req.params.id,req.user.id,req.body);res.status(201).json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async markPurchased(req,res){try{const d=await ShoppingListService.markPurchased(req.params.id,req.params.itemId,req.user.id);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async deleteItem(req,res){try{await ShoppingListService.deleteItem(req.params.id,req.params.itemId,req.user.id);res.json({success:true,message:'Artikulli u fshi'});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async suggestions(req,res){try{const d=await ShoppingListService.getSuggestions(req.user.id,req.query.limit);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async exportShoppingList(req,res){try{const csv=await ShoppingListService.exportCSV(req.params.id,req.user.id);res.setHeader('Content-Type','text/csv');res.setHeader('Content-Disposition','attachment;filename=lista.csv');res.send(csv);}catch(e){res.status(500).json({success:false,message:e.message});}}
}
