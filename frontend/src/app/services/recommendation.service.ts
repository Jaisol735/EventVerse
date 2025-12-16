import { Injectable } from "@angular/core"
import {  HttpClient, HttpHeaders } from "@angular/common/http"
import { Observable } from "rxjs"
import { environment } from "../../environments/environment"

export interface Recommendation {
  _id?: string
  user_id: string
  recommended_posts: Array<{
    post_id: string
    score: number
    reason: string
  }>
  recommended_users: Array<{
    user_id: string
    score: number
    reason: string
  }>
  recommended_committees: Array<{
    committee_id: string
    score: number
    reason: string
  }>
  lastUpdated: Date
  preferences: {
    interests: string[]
    categories: string[]
  }
}

@Injectable({
  providedIn: "root",
})
export class RecommendationService {
  private apiUrl = `${environment.apiUrl}/api/recommendation`

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem("token")
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    })
  }

  createRecommendation(recData: Partial<Recommendation>): Observable<Recommendation> {
    return this.http.post<Recommendation>(this.apiUrl, recData, {
      headers: this.getAuthHeaders(),
    })
  }

  getUserRecommendations(userId: string): Observable<Recommendation> {
    return this.http.get<Recommendation>(`${this.apiUrl}/${userId}`, {
      headers: this.getAuthHeaders(),
    })
  }

  updatePreferences(userId: string, preferences: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${userId}/preferences`, preferences, {
      headers: this.getAuthHeaders(),
    })
  }
}
