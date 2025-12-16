import { Component, OnInit, Input } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { PostService, Post } from "../../services/post.service"
import { Committee } from "../../services/committee.service"
import { AuthService, User } from "../../services/auth.service"

@Component({
  selector: "app-committee-post-grid",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./committee-post-grid.html",
  styleUrls: ["./committee-post-grid.css"],
})
export class CommitteePostGridComponent implements OnInit {
  @Input() committee!: Committee
  @Input() isCommitteeHead = false

  currentUser: User | null = null
  posts: Post[] = []
  loading = true
  selectedPost: Post | null = null
  showPostModal = false
  newComment: { [postId: string]: string } = {}

  constructor(
    private postService: PostService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    console.log("[v0] Committee Post Grid initialized for committee:", this.committee?.committee_id)

    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user
      console.log("[v0] Current user:", user)
    })

    if (this.committee) {
      this.loadCommitteePosts()
    }
  }

  loadCommitteePosts(): void {
    console.log("[v0] Loading posts for committee:", this.committee.committee_id)
    this.loading = true

    this.postService.getCommitteePosts(this.committee.committee_id).subscribe({
      next: (posts) => {
        this.posts = posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        this.loading = false
        console.log("[v0] Loaded committee posts:", posts.length)
      },
      error: (error) => {
        console.error("[v0] Error loading committee posts:", error)
        this.loading = false
        this.posts = []
      },
    })
  }

  openPostModal(post: Post): void {
    console.log("[v0] Opening post modal for:", post._id)
    this.selectedPost = post
    this.showPostModal = true
  }

  closePostModal(): void {
    console.log("[v0] Closing post modal")
    this.selectedPost = null
    this.showPostModal = false
  }

  likePost(post: Post): void {
    const userId = this.currentUser?.user_id
    if (!userId) {
      console.log("[v0] Cannot like post: user not logged in")
      return
    }

    console.log("[v0] Toggling like for post:", post._id)

    this.postService.likePost(post._id).subscribe({
      next: (updatedPost) => {
        // Update the post in our array
        const index = this.posts.findIndex((p) => p._id === post._id)
        if (index !== -1) {
          this.posts[index] = updatedPost
        }
        // Update selected post if it's the same
        if (this.selectedPost && this.selectedPost._id === post._id) {
          this.selectedPost = updatedPost
        }
        console.log("[v0] Post like toggled successfully")
      },
      error: (error) => {
        console.error("[v0] Error toggling like:", error)
      },
    })
  }

  addComment(post: Post): void {
    const commentText = this.newComment[post._id]
    if (!commentText || !commentText.trim()) {
      console.log("[v0] Cannot add comment: empty text")
      return
    }

    console.log("[v0] Adding comment to post:", post._id)

    this.postService.addComment(post._id, commentText.trim()).subscribe({
      next: (updatedPost) => {
        // Update the post in our array
        const index = this.posts.findIndex((p) => p._id === post._id)
        if (index !== -1) {
          this.posts[index] = updatedPost
        }
        // Update selected post if it's the same
        if (this.selectedPost && this.selectedPost._id === post._id) {
          this.selectedPost = updatedPost
        }
        // Clear the comment input
        this.newComment[post._id] = ""
        console.log("[v0] Comment added successfully")
      },
      error: (error) => {
        console.error("[v0] Error adding comment:", error)
      },
    })
  }

  isLikedByUser(post: Post): boolean {
    const userId = this.currentUser?.user_id
    return userId ? post.likes.some((like) => like.user_id === userId) : false
  }

  getLikeCount(post: Post): number {
    return post.likes.length
  }

  getCommentCount(post: Post): number {
    return post.comments.length
  }

  getTimeAgo(date: Date): string {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000)

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return new Date(date).toLocaleDateString()
  }

  createNewPost(): void {
    if (this.committee) {
      window.location.href = `/post?committee_id=${this.committee.committee_id}`
      // Or, if router is available:
      // this.router.navigate(["/post"], { queryParams: { committee_id: this.committee.committee_id } })
    } else {
      window.location.href = "/post"
    }
  }
}
