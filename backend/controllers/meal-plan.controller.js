// meal-plan.controller.js — thin controller, zero business logic
import { MealPlanService } from "../services/meal-plan.service.js";

export class MealPlanController {
    static async getAll(req,res){try{const d=await MealPlanService.getAll(req.user.id,req.query);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async getById(req,res){try{const d=await MealPlanService.getById(req.params.id,req.user.id);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async create(req,res){try{const d=await MealPlanService.create(req.user.id,req.body);res.status(201).json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async update(req,res){try{const d=await MealPlanService.update(req.params.id,req.user.id,req.body);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async delete(req,res){try{await MealPlanService.delete(req.params.id,req.user.id);res.json({success:true,message:'Plani u fshi'});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async addDay(req,res){try{const d=await MealPlanService.addDay(req.params.id,req.user.id,req.body);res.status(201).json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async removeDay(req,res){try{await MealPlanService.removeDay(req.params.id,req.params.dayId,req.user.id);res.json({success:true,message:'Dita u hoq'});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async generateShoppingList(req,res){try{const d=await MealPlanService.generateShoppingList(req.params.id,req.user.id);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
}
