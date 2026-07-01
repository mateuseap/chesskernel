import type { TimeControl } from './chess.types';

export interface UserRating {
  timeControl: TimeControl;
  rating: number;
  ratingDeviation: number;
  gamesPlayed: number;
}

export interface UserProfile {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  country: string | null;
  ratings: UserRating[];
  createdAt: string;
  lastSeenAt: string | null;
}

export interface UserPublicProfile extends UserProfile {
  isOnline: boolean;
  isFriend: boolean;
  friendshipStatus: FriendshipStatus | null;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  isAdmin: boolean;
}

export type FriendshipStatus = 'pending_sent' | 'pending_received' | 'accepted' | 'blocked';

export interface FriendEntry {
  id: string;
  user: Pick<UserProfile, 'id' | 'username' | 'avatarUrl'>;
  status: FriendshipStatus;
  since: string;
  isOnline: boolean;
}

export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'game_invite'
  | 'game_started'
  | 'game_ended'
  | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  user: Pick<UserProfile, 'id' | 'username' | 'avatarUrl' | 'country'>;
  rating: number;
  ratingDeviation: number;
  gamesPlayed: number;
}
