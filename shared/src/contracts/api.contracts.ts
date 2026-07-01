export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error: string | null;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// ─── Matchmaking ──────────────────────────────────────────────────────────────

export interface JoinQueueRequest {
  timeControlKey: string;
}

export interface CreateBotGameRequest {
  timeControlKey: string;
  difficulty: string;
  colorPreference: 'white' | 'black' | 'random';
}

// ─── Invitations ─────────────────────────────────────────────────────────────

export interface CreateInvitationRequest {
  receiverId?: string;
  timeControlKey: string;
  colorPreference: 'white' | 'black' | 'random';
}

export interface AcceptInvitationRequest {
  token: string;
}

// ─── Friends ──────────────────────────────────────────────────────────────────

export interface SendFriendRequestRequest {
  targetUserId: string;
}

// ─── Analysis ────────────────────────────────────────────────────────────────

export interface RequestAnalysisRequest {
  gameId: string;
}
