import { Component } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { Router, RouterModule } from "@angular/router"
import { AuthService, LoginRequest } from "../services/auth.service"

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  appimage = "/Images/eventverselogo.png"
  credentials: LoginRequest = {
    name: "",
    password: "",
  }

  loading = false
  error = ""

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  onSubmit(): void {
    if (!this.credentials.name || !this.credentials.password) {
      this.error = "Please fill in all fields"
      return
    }

    this.loading = true
    this.error = ""

    this.authService.login(this.credentials).subscribe({
      next: (user) => {
        this.loading = false
        this.router.navigate(["/home"])
      },
      error: (error) => {
        this.loading = false
        this.error = error.error?.message || "Login failed. Please try again."
      },
    })
  }
}
