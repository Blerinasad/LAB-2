import { MLService } from "../services/ml.service.js";

export class MLRecommendationController {
  static async getMy(req,res) { try{const d=await MLService.getMyRecommendations(req.user.id);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});} }
  static async getAll(req,res) { try{const d=await MLService.getAllFromMongo();res.json({success:true,data:d});}catch(e){res.status(500).json({success:false,message:e.message});} }
  static async classifiersCompare(req,res){try{const d=await MLService.classifiersCompare(req.query.retrain==="true");res.json({success:true,data:d});}catch(e){res.status(e.status||503).json({success:false,message:e.message});} }
  static async classifyRisk(req,res) { try{const d=await MLService.classifyRisk(req.body);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});} }
  static async clusteringMy(req,res) { try{const d=await MLService.clusteringMy(req.user.id,req.query.n_clusters||3);res.json({success:true,data:d});}catch(e){res.status(e.status||503).json({success:false,message:e.message});} }
  static async preferencesMy(req,res) { try{const d=await MLService.preferencesMy(req.user.id);res.json({success:true,data:d});}catch(e){res.status(e.status||500).json({success:false,message:e.message});} }
  static async predictExpiry(req,res) { try{const d=await MLService.predictExpiry(req.body);res.json({success:true,data:d});}catch(e){res.status(e.status||503).json({success:false,message:e.message});} }
  static async detectFoodImage(req,res) {
    try {
      if (!req.file) return res.status(400).json({ success:false, message:"Imazhi mungon" });
      const b64 = req.file.buffer.toString("base64");
      const mime = req.file.mimetype;
      const d = await MLService.detectFoodImage(b64, mime);
      res.json({ success:true, data:d });
    } catch(e) { res.status(e.status||500).json({ success:false, message:e.message }); }
  }
  static async predictWaste(req,res) { try{const d=await MLService.predictWaste(req.body);res.json({success:true,data:d});}catch(e){res.status(e.status||503).json({success:false,message:e.message});} }
}
