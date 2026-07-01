import { calculateNewRating } from './glicko2';

describe('Glicko-2 rating system', () => {
  it('increases rating for a win', () => {
    const player = { rating: 1500, ratingDeviation: 200, volatility: 0.06 };
    const result = calculateNewRating(player, [
      { opponentRating: 1400, opponentRd: 30, score: 1 },
    ]);
    expect(result.rating).toBeGreaterThan(player.rating);
  });

  it('decreases rating for a loss', () => {
    const player = { rating: 1500, ratingDeviation: 200, volatility: 0.06 };
    const result = calculateNewRating(player, [
      { opponentRating: 1400, opponentRd: 30, score: 0 },
    ]);
    expect(result.rating).toBeLessThan(player.rating);
  });

  it('returns near-unchanged rating for a draw against equal opponent', () => {
    const player = { rating: 1500, ratingDeviation: 200, volatility: 0.06 };
    const result = calculateNewRating(player, [
      { opponentRating: 1500, opponentRd: 200, score: 0.5 },
    ]);
    expect(Math.abs(result.rating - player.rating)).toBeLessThan(10);
  });

  it('reduces rating deviation after a game', () => {
    const player = { rating: 1500, ratingDeviation: 200, volatility: 0.06 };
    const result = calculateNewRating(player, [
      { opponentRating: 1400, opponentRd: 30, score: 1 },
    ]);
    expect(result.ratingDeviation).toBeLessThan(player.ratingDeviation);
  });

  it('increases rating deviation with no games (period without games)', () => {
    const player = { rating: 1500, ratingDeviation: 200, volatility: 0.06 };
    const result = calculateNewRating(player, []);
    expect(result.ratingDeviation).toBeGreaterThan(player.ratingDeviation);
  });

  it('handles multiple games in a period', () => {
    const player = { rating: 1500, ratingDeviation: 200, volatility: 0.06 };
    const result = calculateNewRating(player, [
      { opponentRating: 1400, opponentRd: 30, score: 1 },
      { opponentRating: 1550, opponentRd: 100, score: 0 },
      { opponentRating: 1700, opponentRd: 300, score: 0 },
    ]);
    expect(result.rating).toBeDefined();
    expect(result.ratingDeviation).toBeDefined();
    expect(result.volatility).toBeDefined();
  });

  it('rating never goes below 100', () => {
    const player = { rating: 200, ratingDeviation: 300, volatility: 0.06 };
    const result = calculateNewRating(player, [
      { opponentRating: 2000, opponentRd: 30, score: 0 },
      { opponentRating: 2000, opponentRd: 30, score: 0 },
      { opponentRating: 2000, opponentRd: 30, score: 0 },
    ]);
    expect(result.rating).toBeGreaterThanOrEqual(100);
  });

  it('matches Glickman example (approximately)', () => {
    const player = { rating: 1500, ratingDeviation: 200, volatility: 0.06 };
    const result = calculateNewRating(player, [
      { opponentRating: 1400, opponentRd: 30, score: 1 },
      { opponentRating: 1550, opponentRd: 100, score: 0 },
      { opponentRating: 1700, opponentRd: 300, score: 0 },
    ]);
    expect(result.rating).toBeCloseTo(1464, -1);
    expect(result.ratingDeviation).toBeCloseTo(151, -1);
  });
});
