import type { Routes } from "@angular/router"
import { LoginComponent } from "./login/login"
import { SignupComponent } from "./signup/signup"
import { HomeComponent } from "./User/home/home"
import { LandingPageComponent } from "./landing-page/landing-page"
import { ProfileComponent } from "./User/profile/profile"
import { PersonalChatComponent } from "./User/personal-chat/personal-chat"
import { ChatGridComponent } from "./User/chat-grid/chat-grid"
import { NotificationsComponent } from "./User/notification/notification"
import { CommitteeHomeComponent } from "./Committee/committee-home/committee-home"
import { AuthGuard } from "./guards/auth.guard"
import { CommitteeNotificationComponent } from "./Committee/committee-notification/committee-notification"
import { PostViewComponent } from "./User/post-view/post-view"
import { PostComponent } from "./post/post"


export const routes: Routes = [
  { path: "", component: LandingPageComponent },
  { path: "login", component: LoginComponent },
  { path: "signup", component: SignupComponent },
  { path: "home", component: HomeComponent, canActivate: [AuthGuard] },
  { path: "profile", component: ProfileComponent, canActivate: [AuthGuard] },
  { path: "personal-chat", component: PersonalChatComponent, canActivate: [AuthGuard] },
  { path: "chat-grid/:chatId", component: ChatGridComponent, canActivate: [AuthGuard] },
  { path: "notifications", component: NotificationsComponent, canActivate: [AuthGuard] },
  { path: "committee/:committeeId", component: CommitteeHomeComponent, canActivate: [AuthGuard] },
  { path: "committee-notifications/:committeeId", component: CommitteeNotificationComponent, canActivate: [AuthGuard] },
  { path: "post/:postId/view", component: PostViewComponent, canActivate: [AuthGuard] },
  {path: "post",component: PostComponent,canActivate: [AuthGuard],},
  { path: "**", redirectTo: "/", pathMatch: "full" },
]

