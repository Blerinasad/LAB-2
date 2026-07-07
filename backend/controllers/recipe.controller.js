// Recipe.controller.js — thin controller, zero business logic
import { RecipeService } from "../services/recipe.service.js";

export class RecipeController {
    static async getAll(req,res){try{const d=await RecipeService.getAll(req.query);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async getById(req,res){try{const d=await RecipeService.getById(req.params.id);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async create(req,res){try{const d=await RecipeService.create(req.user.id,req.body);res.status(201).json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async update(req,res){try{const d=await RecipeService.update(req.params.id,req.user.id,req.body);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async delete(req,res){try{await RecipeService.delete(req.params.id,req.user.id);res.json({success:true,message:'Receta u fshi'});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async rate(req,res){try{const d=await RecipeService.rate(req.params.id,req.user.id,req.body.rating,req.body.comment);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async exportRecipes(req,res){try{const csv=await RecipeService.exportCSV(req.user.id);res.setHeader('Content-Type','text/csv');res.setHeader('Content-Disposition','attachment;filename=recipes.csv');res.send(csv);}catch(e){res.status(500).json({success:false,message:e.message});}}
}
