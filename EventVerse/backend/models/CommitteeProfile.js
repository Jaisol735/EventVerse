import mongoose from "mongoose"

const committeeProfileSchema = new mongoose.Schema({
  committee_id: {
    type: String,
    required: true,
    unique: true,
  },
  cloudinary_url: {
    type: String,
    required: true,
  },
  description: String,
  members: [
    {
      user_id: String,
      role: String,
      joinedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

export default mongoose.model("CommitteeProfile", committeeProfileSchema)
