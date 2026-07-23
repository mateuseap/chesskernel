-- Perf indexes for hot lookups.
-- refresh_tokens.tokenHash: every token refresh does findFirst({ tokenHash });
-- without an index this is a sequential scan.
CREATE INDEX "refresh_tokens_tokenHash_idx" ON "refresh_tokens"("tokenHash");

-- user_ratings (timeControl, rating DESC): leaderboard query filters by
-- timeControl and orders by rating DESC.
CREATE INDEX "user_ratings_timeControl_rating_idx" ON "user_ratings"("timeControl", "rating" DESC);
