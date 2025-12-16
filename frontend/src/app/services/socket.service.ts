import { Injectable } from "@angular/core"
import { io, Socket } from "socket.io-client"
import { Observable } from "rxjs"
import { environment } from "../../environments/environment"

@Injectable({
  providedIn: "root",
})
export class SocketService {
  private socket: Socket

  constructor() {
    this.socket = io(environment.socketUrl)
  }

  // Chat functionality
  sendMessage(message: any): void {
    this.socket.emit("chatMessage", message)
  }

  getMessages(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on("chatMessage", (data) => observer.next(data))
    })
  }

  // Livestream functionality
  joinLivestream(streamId: string): void {
    this.socket.emit("joinLivestream", streamId)
  }

  leaveLivestream(streamId: string): void {
    this.socket.emit("leaveLivestream", streamId)
  }

  getLivestreamUpdates(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on("livestreamUpdate", (data) => observer.next(data))
    })
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
    }
  }
}
