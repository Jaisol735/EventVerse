import { Injectable } from "@angular/core"
import { HttpClient, HttpHeaders } from "@angular/common/http"
import { Observable } from "rxjs"
import { environment } from "../../environments/environment"

export interface Committee {
  committee_id: number
  name: string
  description: string
  head_id: number
  head_name?: string
  member_count: number // ensure always present
  created_at: Date
}

export interface CommitteeProfile {
  _id?: string
  committee_id: string
  cloudinary_url: string
  description?: string
  members: Array<{
    user_id: string
    role: string
    joinedAt: Date
  }>
  createdAt?: Date
  updatedAt?: Date
}

export interface UserCommittee {
  committee_id: number
  committee_name: string
  description: string
  member_role: string
  head_name: string
}

export interface CommitteeMember {
  user_id: number
  name: string
  email?: string
  role: "member" | "head"
}

@Injectable({
  providedIn: "root",
})
export class CommitteeService {
  private apiUrl = `${environment.apiUrl}/api/committee-profile`
  private committeesApiUrl = `${environment.apiUrl}/api/committees`

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem("token")
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    })
  }

  searchCommittees(query: string): Observable<Committee[]> {
    return this.http.get<Committee[]>(`${this.committeesApiUrl}/search?q=${encodeURIComponent(query)}`, {
      headers: this.getAuthHeaders(),
    })
  }

  getAllCommittees(): Observable<Committee[]> {
    return this.http.get<Committee[]>(this.committeesApiUrl, {
      headers: this.getAuthHeaders(),
    })
  }

  getCommitteeById(committeeId: number): Observable<Committee> {
    return this.http.get<Committee>(`${this.committeesApiUrl}/${committeeId}`, {
      headers: this.getAuthHeaders(),
    })
  }

  getUserCommittees(userId: number): Observable<{ success: boolean; committees: UserCommittee[] }> {
    console.log("[v0] 🚀 CommitteeService: Fetching committees for user_id:", userId)
    console.log("[v0] 🚀 API URL:", `${this.committeesApiUrl}/user/${userId}`)
    console.log("[v0] 🚀 Full URL being called:", `${this.committeesApiUrl}/user/${userId}`)
    console.log("[v0] 🚀 Environment API URL:", environment.apiUrl)
    console.log("[v0] 🚀 Auth headers:", this.getAuthHeaders())

    const request = this.http.get<{ success: boolean; committees: UserCommittee[] }>(
      `${this.committeesApiUrl}/user/${userId}`,
      {
        headers: this.getAuthHeaders(),
      },
    )

    request.subscribe({
      next: (response) => {
        console.log("[v0] ✅ HTTP Request SUCCESS:", response)
      },
      error: (error) => {
        console.error("[v0] ❌ HTTP Request ERROR:", error)
        console.error("[v0] ❌ Error status:", error.status)
        console.error("[v0] ❌ Error message:", error.message)
        console.error("[v0] ❌ Full error object:", error)
      },
    })

    return request
  }

  uploadCommitteeProfileImage(formData: FormData): Observable<{ success: boolean; profile: CommitteeProfile }> {
    console.log("[v0] Uploading committee profile image")
    return this.http.post<{ success: boolean; profile: CommitteeProfile }>(this.apiUrl, formData, {
      headers: this.getAuthHeaders(),
    })
  }

  getCommitteeProfile(committeeId: string): Observable<{ success: boolean; profile: CommitteeProfile | null }> {
    console.log("[v0] Getting committee profile for ID:", committeeId)
    return this.http.get<{ success: boolean; profile: CommitteeProfile | null }>(`${this.apiUrl}/${committeeId}`, {
      headers: this.getAuthHeaders(),
    })
  }

  updateCommitteeProfile(
    committeeId: string,
    updateData: { description?: string },
  ): Observable<{ success: boolean; profile: CommitteeProfile }> {
    console.log("[v0] Updating committee profile:", committeeId, updateData)
    return this.http.put<{ success: boolean; profile: CommitteeProfile }>(`${this.apiUrl}/${committeeId}`, updateData, {
      headers: this.getAuthHeaders(),
    })
  }

  createCommitteeRequest(data: { name: string; description: string }): Observable<{
    success: boolean
    message: string
    notification_id: number
  }> {
    return this.http.post<{ success: boolean; message: string; notification_id: number }>(
      `${this.committeesApiUrl}/create-request`,
      data,
      { headers: this.getAuthHeaders() },
    )
  }

  submitJoinRequest(data: { committee_id: number; skills_description: string }): Observable<{
    success: boolean
    message: string
    notification_id: number
  }> {
    return this.http.post<{ success: boolean; message: string; notification_id: number }>(
      `${this.committeesApiUrl}/join-request`,
      data,
      { headers: this.getAuthHeaders() },
    )
  }

  searchCommitteeMembers(committeeId: number, query: string): Observable<CommitteeMember[]> {
    return this.http.get<CommitteeMember[]>(
      `${this.committeesApiUrl}/${committeeId}/members?query=${encodeURIComponent(query)}`,
      { headers: this.getAuthHeaders() },
    )
  }

  changeCommitteeHead(
    committeeId: number,
    newHeadId: number,
  ): Observable<{ success: boolean; message: string; committee: Committee }> {
    return this.http.post<{ success: boolean; message: string; committee: Committee }>(
      `${this.committeesApiUrl}/${committeeId}/change-head`,
      { new_head_id: newHeadId },
      { headers: this.getAuthHeaders() },
    )
  }

  getCommitteeMembers(committeeId: number): Observable<CommitteeMember[]> {
    return this.http.get<CommitteeMember[]>(
      `${this.committeesApiUrl}/${committeeId}/members/all`,
      { headers: this.getAuthHeaders() },
    )
  }
}
