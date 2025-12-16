import mongoose from "mongoose"

const userProfileImageSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true,
    unique: true,
  },
  image_url: {
    type: String,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
})

const UserProfileImageModel = mongoose.model("UserProfileImage", userProfileImageSchema)

class UserProfileImage {
  static async create(userId, imageUrl) {
    try {
      console.log("[v0] MongoDB: Creating/updating profile image for user:", userId)
      console.log("[v0] MongoDB: Image URL:", imageUrl)

      const result = await UserProfileImageModel.findOneAndUpdate(
        { user_id: userId },
        {
          image_url: imageUrl,
          updated_at: new Date(),
        },
        {
          upsert: true,
          new: true,
        },
      )

      console.log("[v0] MongoDB: ✅ Profile image saved successfully")
      return result
    } catch (error) {
      console.error("[v0] MongoDB: ❌ Error creating user profile image:", error)
      throw error
    }
  }

  static async getByUserId(userId) {
    try {
      console.log("[v0] MongoDB: Fetching profile image for user:", userId)
      const result = await UserProfileImageModel.findOne({ user_id: userId })
      console.log("[v0] MongoDB: Profile image found:", result ? "Yes" : "No")
      return result
    } catch (error) {
      console.error("[v0] MongoDB: ❌ Error getting user profile image:", error)
      throw error
    }
  }

  static async delete(userId) {
    try {
      console.log("[v0] MongoDB: Deleting profile image for user:", userId)
      const result = await UserProfileImageModel.deleteOne({ user_id: userId })
      console.log("[v0] MongoDB: ✅ Profile image deleted successfully")
      return result
    } catch (error) {
      console.error("[v0] MongoDB: ❌ Error deleting user profile image:", error)
      throw error
    }
  }
}

export default UserProfileImage