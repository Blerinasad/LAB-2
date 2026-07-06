import { IngredientService } from "../services/ingredient.service.js";

export class IngredientController {
  static async getAll(req,res)  { try{const d=await IngredientService.getAll(req.query);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});} }
  static async getById(req,res) { try{const d=await IngredientService.getById(req.params.id);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});} }
  static async create(req,res)  { try{const d=await IngredientService.create(req.body);res.status(201).json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});} }
  static async update(req,res)  { try{const d=await IngredientService.update(req.params.id,req.body);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});} }
  static async delete(req,res)  { try{await IngredientService.delete(req.params.id);res.json({success:true,message:"Ingredient u fshi"});}catch(e){res.status(e.status||500).json({success:false,message:e.message});} }
}
