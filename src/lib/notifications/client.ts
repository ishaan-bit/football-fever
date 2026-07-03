/** A notification event as delivered to the browser (mirrors the Firestore doc). */
export interface NotifEventDTO {
  id: string;
  type: "prematch" | "result" | "join";
  kind: "kickoff" | "fulltime" | "friend_joined";
  title: string;
  body: string;
  matchId?: string;
  href?: string;
  accent?: string;
  userId?: string;
  ts: number;
  createdAt: string;
}
