import { Injectable } from "@angular/core"
import { HttpClient, HttpHeaders } from "@angular/common/http"
import { Observable } from "rxjs"
import { environment } from "../../environments/environment"

export interface GroupChatProfileImage {
  _id?: string
  chat_id: string
  image_url: string
  uploaded_by: number
  uploaded_at: Date
  cloudinary_public_id: string
}

@Injectable({
  providedIn: "root",
})
export class GroupChatProfileImageService {
  private apiUrl = `${environment.apiUrl}/api/group-chat-profile-image`

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem("token")
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    })
  }

  uploadGroupChatProfileImage(chatId: string, imageFile: File): Observable<any> {
    console.log("[v0] Uploading group chat profile image for chat:", chatId)

    const formData = new FormData()
    formData.append("image", imageFile)

    return this.http.post(`${this.apiUrl}/${chatId}/upload`, formData, {
      headers: this.getAuthHeaders(),
    })
  }

  getGroupChatProfileImage(chatId: string): Observable<GroupChatProfileImage> {
    console.log("[v0] Fetching group chat profile image for chat:", chatId)

    return this.http.get<GroupChatProfileImage>(`${this.apiUrl}/${chatId}`, {
      headers: this.getAuthHeaders(),
    })
  }
}
