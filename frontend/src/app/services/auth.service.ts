import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { BehaviorSubject, Observable } from "rxjs"
import { map } from "rxjs/operators"
import { environment } from "../../environments/environment"

export interface User {
  user_id: number
  name: string
  email: string
  role: string
}

export interface LoginRequest {
  name: string
  password: string
}

export interface SignupRequest {
  name: string
  email: string
  password: string
  role: string
}

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private apiUrl = environment.apiUrl
  private currentUserSubject = new BehaviorSubject<User | null>(null)
  public currentUser$ = this.currentUserSubject.asObservable()

  constructor(private http: HttpClient) {
    // Check if user is already logged in
    const storedUser = localStorage.getItem("currentUser")
    if (storedUser) {
      this.currentUserSubject.next(JSON.parse(storedUser))
    }
  }

  login(credentials: LoginRequest): Observable<User> {
    return this.http.post<{ user: User; token: string }>(`${this.apiUrl}/api/auth/login`, credentials).pipe(
      map((response) => {
        localStorage.setItem("currentUser", JSON.stringify(response.user))
        localStorage.setItem("token", response.token)
        this.currentUserSubject.next(response.user)
        return response.user
      }),
    )
  }

  signup(userData: SignupRequest): Observable<User> {
    return this.http.post<{ user: User; token: string }>(`${this.apiUrl}/api/auth/register`, userData).pipe(
      map((response) => {
        localStorage.setItem("currentUser", JSON.stringify(response.user))
        localStorage.setItem("token", response.token)
        this.currentUserSubject.next(response.user)
        return response.user
      }),
    )
  }

  logout(): void {
    localStorage.removeItem("currentUser")
    localStorage.removeItem("token")
    this.currentUserSubject.next(null)
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value
  }

  isLoggedIn(): boolean {
    return !!this.currentUserValue
  }

  getToken(): string | null {
    return localStorage.getItem("token")
  }
}
