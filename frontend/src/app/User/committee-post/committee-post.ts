import { Component, OnInit, Input } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { PostService, Post } from "../../services/post.service"
import { Committee } from "../../services/committee.service"
import { AuthService, User } from "../../services/auth.service"
import { Router } from "@angular/router" // add router

@Component({
  selector: "app-committee-posts",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./committee-post.html",
  styleUrls: ["./committee-post.css"],
})
export class CommitteePostsComponent implements OnInit {
  @Input() committee!: Committee

  currentUser: User | null = null
  posts: Post[] = []
  loading = true
  newComment: { [postId: string]: string | undefined } = {}

  constructor(
    private postService: PostService,
    private authService: AuthService,
    private router: Router, // add router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user
    })

    if (this.committee) {
      this.loadCommitteePosts()
    }
  }

  loadCommitteePosts(): void {
    this.postService.getCommitteePosts(this.committee.committee_id).subscribe({
      next: (posts) => {
        this.posts = posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        this.loading = false
      },
      error: (error) => {
        console.error("Error loading committee posts:", error)
        this.loading = false
      },
    })
  }

  likePost(post: Post): void {
    const userId = this.currentUser?.user_id
    if (!userId) return

    const isLiked = post.likes.some((like) => like.user_id === userId)

    if (!isLiked) {
      this.postService.likePost(post._id).subscribe({
        next: () => {
          post.likes.push({ user_id: userId, timestamp: new Date() })
        },
        error: (error) => console.error("Error liking post:", error),
      })
    }
  }

  addComment(post: Post): void {
    const commentText = this.newComment[post._id]
    if (!commentText || !commentText.trim()) return

    this.postService.addComment(post._id, commentText).subscribe({
      next: (response) => {
        post.comments.push({
          comment_id: response.comment_id,
          user_id: this.currentUser!.user_id,
          text: commentText,
          timestamp: new Date(),
        })
        this.newComment[post._id] = ""
      },
      error: (error) => console.error("Error adding comment:", error),
    })
  }

  isLikedByUser(post: Post): boolean {
    const userId = this.currentUser?.user_id
    return userId ? post.likes.some((like) => like.user_id === userId) : false
  }

  getTimeAgo(date: Date): string {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000)

    if (diffInSeconds < 60) return `${diffInSeconds}s`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
    return `${Math.floor(diffInSeconds / 86400)}d`
  }

  openPost(post: Post): void {
    this.router.navigate([`/post/${post._id}/view`])
  }
}
