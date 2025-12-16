import { Component, OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { AuthService } from "../../services/auth.service"
import { UserProfileImageService } from "../../services/user-profile-image.service"
import { PostService, Post } from "../../services/post.service"
import { CommitteeService, UserCommittee } from "../../services/committee.service"
import { Router } from "@angular/router"

interface User {
  user_id: number
  name: string
  email: string
  role: string
  committee_id?: number
  committee_name?: string
  created_at?: string
}

@Component({
  selector: "app-profile",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./profile.html",
  styleUrls: ["./profile.css"],
})
export class ProfileComponent implements OnInit {
  user: User | null = null
  profileImageUrl = ""
  userPosts: Post[] = []
  userCommittees: UserCommittee[] = []
  isLoading = true
  isUploadingImage = false
  uploadError = ""

  constructor(
    private authService: AuthService,
    private userProfileImageService: UserProfileImageService,
    private postService: PostService,
    private committeeService: CommitteeService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadUserProfile()
  }

  async loadUserProfile() {
    try {
      console.log("[v0] Loading user profile...")
      this.isLoading = true

      this.user = this.authService.currentUserValue
      if (!this.user) {
        console.log("[v0] No user found, redirecting to login")
        this.router.navigate(["/login"])
        return
      }

      console.log("[v0] User loaded:", this.user)

      // Load profile image
      await this.loadProfileImage()

      // Load user committees
      await this.loadUserCommittees()

      // Load user posts
      await this.loadUserPosts()
    } catch (error) {
      console.error("[v0] Error loading profile:", error)
    } finally {
      this.isLoading = false
    }
  }

  async loadProfileImage() {
    try {
      console.log("[v0] Loading profile image for user:", this.user?.user_id)
      const response = await this.userProfileImageService.getProfileImage(this.user!.user_id).toPromise()
      if (response && response.image_url) {
        this.profileImageUrl = response.image_url
        console.log("[v0] Profile image loaded:", this.profileImageUrl)
      } else {
        console.log("[v0] No profile image found, using default")
        this.profileImageUrl = ""
      }
    } catch (error) {
      console.log("[v0] No profile image found or error loading:", error)
      this.profileImageUrl = ""
    }
  }

  async loadUserCommittees() {
    try {
      console.log("[v0] 🔄 Loading user committees for user:", this.user?.user_id)
      console.log("[v0] 🔄 User object:", this.user)

      if (!this.user?.user_id) {
        console.log("[v0] ❌ No user_id found, cannot fetch committees")
        this.userCommittees = []
        return
      }

      console.log("[v0] 🌐 Environment check:")
      console.log("[v0] 🌐 API URL from environment:", (window as any).environment?.apiUrl || "undefined")
      console.log("[v0] 🌐 Current origin:", window.location.origin)
      console.log("[v0] 🌐 Auth token exists:", !!localStorage.getItem("token"))
      console.log("[v0] 🌐 Auth token preview:", localStorage.getItem("token")?.substring(0, 20) + "...")

      // Test basic connectivity first
      console.log("[v0] 🧪 Testing basic API connectivity...")
      try {
        const healthResponse = await fetch(`http://localhost:5000/api/health`)
        console.log("[v0] 🧪 Health check response:", healthResponse.status, healthResponse.statusText)
      } catch (healthError) {
        console.error("[v0] 🧪 Health check failed:", healthError)
      }

      const response = await this.committeeService.getUserCommittees(this.user!.user_id).toPromise()
      console.log("[v0] 📥 Committee service response:", response)

      if (response && response.success) {
        this.userCommittees = response.committees || []
        console.log("[v0] ✅ User committees loaded successfully:", this.userCommittees.length, "committees")

        if (this.userCommittees.length > 0) {
          console.log("[v0] 🎉 COMMITTEES FOUND FOR USER!")
          this.userCommittees.forEach((committee, index) => {
            console.log(`[v0] 📋 Committee ${index + 1}:`, {
              name: committee.committee_name,
              role: committee.member_role,
              head: committee.head_name,
            })
          })
        } else {
          console.log("[v0] ⚠️ No committees found for this user")
        }
      } else {
        console.log("[v0] ❌ Committee service returned unsuccessful response:", response)
        this.userCommittees = []
      }
    } catch (error) {
      console.error("[v0] ❌ Error loading user committees:", error)
      // Fix: error is of type unknown, so use type guard
      if (error && typeof error === "object" && error !== null) {
        const errObj = error as any
        console.error("[v0] ❌ Error details:", {
          name: errObj.name,
          message: errObj.message,
          status: errObj.status,
          statusText: errObj.statusText,
          url: errObj.url,
        })
      }
      this.userCommittees = []
    }
  }

  async loadUserPosts() {
    try {
      console.log("[v0] Loading user posts for user:", this.user?.user_id)
      const posts = await this.postService.getUserPosts(this.user!.user_id).toPromise()
      this.userPosts = posts || []
      console.log("[v0] User posts loaded:", this.userPosts.length, "posts")
    } catch (error) {
      console.error("[v0] Error loading user posts:", error)
      this.userPosts = []
    }
  }

  onProfileImageClick() {
    console.log("[v0] Profile image clicked, opening file selector")
    const fileInput = document.createElement("input")
    fileInput.type = "file"
    fileInput.accept = "image/*"
    fileInput.onchange = (event: any) => {
      const file = event.target.files[0]
      if (file) {
        console.log("[v0] File selected:", file.name, "Size:", file.size)
        this.uploadProfileImage(file)
      }
    }
    fileInput.click()
  }

  async uploadProfileImage(file: File) {
    try {
      console.log("[v0] Starting profile image upload process...")
      this.isUploadingImage = true
      this.uploadError = ""

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("File size must be less than 5MB")
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        throw new Error("Please select a valid image file")
      }

      console.log("[v0] File validation passed, uploading to Cloudinary...")

      const response = await this.userProfileImageService.uploadProfileImage(file).toPromise()

      if (response && response.success) {
        console.log("[v0] ✅ Image uploaded successfully to Cloudinary")
        console.log("[v0] ✅ Image URL saved to MongoDB:", response.image_url)
        console.log("[v0] ✅ Full response:", response)

        this.profileImageUrl = response.image_url
        this.uploadError = ""

        // Show success message
        alert("Profile image updated successfully!")
      } else {
        throw new Error(response?.message || "Upload failed")
      }
    } catch (error: any) {
      // Fix: error is of type unknown, so use type guard
      let message = "Failed to upload image"
      if (error instanceof Error) {
        message = error.message
      } else if (typeof error === "object" && error !== null && "message" in error) {
        message = (error as any).message
      }
      console.error("[v0] ❌ Profile image upload failed:", error)
      this.uploadError = message
      alert("Failed to upload image: " + this.uploadError)
    } finally {
      this.isUploadingImage = false
      console.log("[v0] Profile image upload process completed")
    }
  }

  async toggleLike(post: Post) {
    try {
      await this.postService.likePost(post._id).toPromise()
      console.log("Post liked successfully")
    } catch (error) {
      console.error("Error liking post:", error)
    }
  }

  openPost(post: Post) {
    this.router.navigate([`/post/${post._id}/view`])
  }

  getDefaultProfileImage(): string {
    return "/default-user-avatar.png"
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString()
  }

  goBack() {
    this.router.navigate(["/home"])
  }
}
