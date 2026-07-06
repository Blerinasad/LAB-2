import mongoose from "mongoose";

const MLRecommendationSchema = new mongoose.Schema({
  user_id: { type: Number, required: true, index: true },
  model_type: { type: String, required: true,
    enum: ["recipe_recommendation","waste_prediction","expiry_prediction","preference_classifier"] },
  output_data: { type: mongoose.Schema.Types.Mixed },
  model_version: { type: String, default: "1.0.0" },
  execution_time_ms: Number,
  expires_at: { type: Date, index: { expireAfterSeconds: 0 } },
  created_at: { type: Date, default: Date.now, index: true },
}, { collection: "ml_recommendations" });

export const MLRecommendation = mongoose.model("MLRecommendation", MLRecommendationSchema);
