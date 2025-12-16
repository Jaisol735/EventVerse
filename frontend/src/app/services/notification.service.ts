import { Injectable } from "@angular/core"
import { HttpClient, HttpHeaders } from "@angular/common/http"
import { Observable } from "rxjs"
import { environment } from "../../environments/environment"

export interface Notification {
  notification_id: number
  sender_id: number
  sender_name: string
  type: "committee_request" | "join_request" | "role_transfer" | "event_update" | "livestream_update"
  related_committee_id?: number
  related_event_id?: number
  related_post_id?: number
  message: string
  created_at: Date
  is_read: boolean
  status: "pending" | "accepted" | "declined" | "completed"
  action_timestamp?: Date
}

@Injectable({
  providedIn: "root",
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/api/notifications`

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem("token")
    return new HttpHeaders().set("Authorization", `Bearer ${token}`)
  }

  getNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.apiUrl, {
      headers: this.getAuthHeaders(),
    })
  }

  markAsRead(notificationId: number): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/${notificationId}/read`,
      {},
      {
        headers: this.getAuthHeaders(),
      },
    )
  }

  updateNotificationStatus(notificationId: number, status: "accepted" | "declined"): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/${notificationId}/status`,
      { status },
      {
        headers: this.getAuthHeaders(),
      },
    )
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/unread-count`, {
      headers: this.getAuthHeaders(),
    })
  }

  getCommitteeNotifications(committeeId: number): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/committee/${committeeId}`, {
      headers: this.getAuthHeaders(),
    })
  }

  acceptNotification(notificationId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${notificationId}/accept`, {}, { headers: this.getAuthHeaders() })
  }

  rejectNotification(notificationId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${notificationId}/reject`, {}, { headers: this.getAuthHeaders() })
  }
}
