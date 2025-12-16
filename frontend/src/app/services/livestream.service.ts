import { Injectable } from "@angular/core"
import { HttpClient, HttpHeaders } from "@angular/common/http"
import { Observable } from "rxjs"
import { environment } from "../../environments/environment"

export interface Livestream {
  _id?: string
  title: string
  description?: string
  streamer_id: string
  stream_url?: string
  thumbnail_url?: string
  isLive: boolean
  viewers: Array<{
    user_id: string
    joinedAt: Date
  }>
  viewerCount: number
  startedAt?: Date
  endedAt?: Date
  createdAt?: Date
}

@Injectable({
  providedIn: "root",
})
export class LivestreamService {
  private apiUrl = `${environment.apiUrl}/api/livestream`

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem("token")
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    })
  }

  createLivestream(streamData: Partial<Livestream>): Observable<Livestream> {
    return this.http.post<Livestream>(this.apiUrl, streamData, {
      headers: this.getAuthHeaders(),
    })
  }

  getAllLivestreams(): Observable<Livestream[]> {
    return this.http.get<Livestream[]>(this.apiUrl, {
      headers: this.getAuthHeaders(),
    })
  }

  joinStream(streamId: string, userId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/${streamId}/join`,
      { userId },
      {
        headers: this.getAuthHeaders(),
      },
    )
  }

  leaveStream(streamId: string, userId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/${streamId}/leave`,
      { userId },
      {
        headers: this.getAuthHeaders(),
      },
    )
  }
}
