import { Injectable } from "@angular/core"
import { HttpClient, HttpHeaders } from "@angular/common/http"
import { Observable } from "rxjs"
import { AuthService } from "./auth.service"
import { environment } from "../../environments/environment"

export interface Post {
  _id: string
  author_id: number
  committee_id?: number
  type: "image" | "video"
  cloudinary_url: string
  description_ai: string
  description_user?: string
  hashtags_ai: string[]
  likes: { user_id: number; timestamp: Date }[]
  comments: {
    comment_id: string
    user_id: number
    text: string
    timestamp: Date
  }[]
  created_at: Date
}

export interface PostsWithRecommendationsResponse {
  recommended: Post[]
  latest: Post[]
  meta?: {
    userId?: number
    message?: string
    seedHashtags?: string[]
    recommendedTags?: string[]
    // add other meta fields if needed
  }
}

@Injectable({
  providedIn: "root",
})
export class PostService {
  private apiUrl = `${environment.apiUrl}/api/posts`

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken()
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    })
  }

  getPosts(): Observable<Post[]> {
    return this.http.get<Post[]>(this.apiUrl, { headers: this.getHeaders() })
  }

  createPost(formData: FormData): Observable<Post> {
    const token = this.authService.getToken()
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    })
    return this.http.post<Post>(this.apiUrl, formData, { headers })
  }

  likePost(postId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${postId}/like`, {}, { headers: this.getHeaders() })
  }

  addComment(postId: string, text: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${postId}/comments`, { text }, { headers: this.getHeaders() })
  }

  getUserPosts(userId: number): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.apiUrl}/user/${userId}`, { headers: this.getHeaders() })
  }

  getRecommendedPosts(): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.apiUrl}/recommended`, { headers: this.getHeaders() })
  }

  getCommitteePosts(committeeId: number): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.apiUrl}/committee/${committeeId}`, { headers: this.getHeaders() })
  }

  getPostsWithRecommendations(): Observable<PostsWithRecommendationsResponse> {
    return this.http.get<PostsWithRecommendationsResponse>(`${this.apiUrl}/feed`, { headers: this.getHeaders() })
  }

  getPostById(postId: string): Observable<Post> {
    return this.http.get<Post>(`${this.apiUrl}/${postId}`, { headers: this.getHeaders() })
  }
}
