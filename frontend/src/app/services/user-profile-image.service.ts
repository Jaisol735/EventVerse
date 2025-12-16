import { Injectable } from "@angular/core"
import { HttpClient, HttpHeaders } from "@angular/common/http"
import { Observable } from "rxjs"
import { environment } from "../../environments/environment"

export interface UserProfileImage {
  id: number
  user_id: number
  image_url: string
  created_at: string
  updated_at: string
}

export interface UploadResponse {
  success: boolean
  message: string
  image_url: string
  publicId: string
}

@Injectable({
  providedIn: "root",
})
export class UserProfileImageService {
  private apiUrl = `${environment.apiUrl}/api/user-profile-image`

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem("token")
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    })
  }

  uploadProfileImage(file: File): Observable<UploadResponse> {
    console.log("[v0] UserProfileImageService: Starting upload for file:", file.name)
    const formData = new FormData()
    formData.append("image", file)

    return this.http.post<UploadResponse>(`${this.apiUrl}/upload`, formData, { headers: this.getAuthHeaders() })
  }

  getProfileImage(userId: number): Observable<UserProfileImage> {
    console.log("[v0] UserProfileImageService: Getting profile image for user:", userId)
    return this.http.get<UserProfileImage>(`${this.apiUrl}/${userId}`)
  }

  getMyProfileImage(): Observable<UserProfileImage> {
    return this.http.get<UserProfileImage>(this.apiUrl, { headers: this.getAuthHeaders() })
  }

  getProfileImageByUserId(userId: number): Observable<UserProfileImage> {
    return this.http.get<UserProfileImage>(`${this.apiUrl}/${userId}`)
  }

  deleteProfileImage(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(this.apiUrl, { headers: this.getAuthHeaders() })
  }
}
