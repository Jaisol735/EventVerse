import mongoose from "mongoose"

const recommendationSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
    unique: true,
  },
  recommended_posts: [
    {
      post_id: String,
      score: Number,
      reason: String,
    },
  ],
  recommended_users: [
    {
      user_id: String,
      score: Number,
      reason: String,
    },
  ],
  recommended_committees: [
    {
      committee_id: String,
      score: Number,
      reason: String,
    },
  ],
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  preferences: {
    interests: [String],
    categories: [String],
  },
})

export default mongoose.model("Recommendation", recommendationSchema)
