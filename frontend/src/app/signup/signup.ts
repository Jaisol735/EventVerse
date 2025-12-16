import { Component } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { Router, RouterModule } from "@angular/router"
import { AuthService, SignupRequest } from "../services/auth.service"

@Component({
  selector: 'app-signup',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class SignupComponent {
  appimage="/Images/eventverselogo.png"
  userData: SignupRequest = {
    name: "",
    email: "",
    password: "",
    role: "student", // Added role field with default value "student"
  }

  confirmPassword = ""
  loading = false
  error = ""

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  onSubmit(): void {
    if (!this.userData.name || !this.userData.email || !this.userData.password) {
      this.error = "Please fill in all fields"
      return
    }

    if (this.userData.password !== this.confirmPassword) {
      this.error = "Passwords do not match"
      return
    }

    if (this.userData.password.length < 6) {
      this.error = "Password must be at least 6 characters long"
      return
    }

    this.loading = true
    this.error = ""

    this.authService.signup(this.userData).subscribe({
      next: (user) => {
        this.loading = false
        this.router.navigate(["/home"])
      },
      error: (error) => {
        this.loading = false
        this.error = error.error?.message || "Signup failed. Please try again."
      },
    })
  }
}
