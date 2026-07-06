// user.controller.js — thin controller, zero business logic
import { UserService } from "../services/user.service.js";

export class UserController {
    static async getAll(req,res){try{const d=await UserService.getAll(req.query);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async getById(req,res){try{const d=await UserService.getById(req.params.id);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async create(req,res){try{const d=await UserService.create(req.body);res.status(201).json({success:true,data:d});}catch(e){res.status(e.status||409).json({success:false,message:e.message});}}
    static async update(req,res){try{const d=await UserService.update(req.params.id,req.body);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async delete(req,res){try{await UserService.delete(req.params.id);res.json({success:true,message:'User u deaktivizua'});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
    static async toggle(req,res){try{const d=await UserService.toggle(req.params.id);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});}}
}
