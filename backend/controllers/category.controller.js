import { CategoryService } from "../services/category.service.js";

export class CategoryController {
  static async getAll(req,res) { try{const d=await CategoryService.getAll();res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});} }
  static async getById(req,res) { try{const d=await CategoryService.getById(req.params.id);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});} }
  static async create(req,res) { try{const d=await CategoryService.create(req.body);res.status(201).json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});} }
  static async update(req,res) { try{const d=await CategoryService.update(req.params.id,req.body);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});} }
  static async delete(req,res) { try{await CategoryService.delete(req.params.id);res.json({success:true,message:"Kategoria u fshi"});}catch(e){res.status(e.status||500).json({success:false,message:e.message});} }
}
