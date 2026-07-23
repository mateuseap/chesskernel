/**
 * Glicko-2 rating system implementation.
 * Based on Mark Glickman's original specification: http://www.glicko.net/glicko/glicko2.pdf
 */

const SCALE = 173.7178;
const TAU = 0.5;
const EPSILON = 0.000001;

export interface Glicko2Player {
  rating: number;
  ratingDeviation: number;
  volatility: number;
}

export interface GameOutcome {
  opponentRating: number;
  opponentRd: number;
  score: 0 | 0.5 | 1;
}

function toGlicko2Scale(rating: number, rd: number): { mu: number; phi: number } {
  return {
    mu: (rating - 1500) / SCALE,
    phi: rd / SCALE,
  };
}

function fromGlicko2Scale(mu: number, phi: number): { rating: number; ratingDeviation: number } {
  return {
    rating: Math.round(SCALE * mu + 1500),
    // Keep RD fractional: rounding swallowed the small idle-period inflation
    // (Glicko-2 phi* growth) and the column is a Float anyway.
    ratingDeviation: SCALE * phi,
  };
}

function g(phi: number): number {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

function E(mu: number, muJ: number, phiJ: number): number {
  return 1 / (1 + Math.exp(-g(phiJ) * (mu - muJ)));
}

function computeV(mu: number, opponents: Array<{ muJ: number; phiJ: number }>): number {
  return (
    1 /
    opponents.reduce((sum, { muJ, phiJ }) => {
      const gPhiJ = g(phiJ);
      const eVal = E(mu, muJ, phiJ);
      return sum + gPhiJ * gPhiJ * eVal * (1 - eVal);
    }, 0)
  );
}

function computeDelta(
  mu: number,
  v: number,
  outcomes: Array<{ muJ: number; phiJ: number; score: number }>,
): number {
  return (
    v *
    outcomes.reduce((sum, { muJ, phiJ, score }) => {
      return sum + g(phiJ) * (score - E(mu, muJ, phiJ));
    }, 0)
  );
}

function computeNewVolatility(
  sigma: number,
  phi: number,
  v: number,
  delta: number,
): number {
  const a = Math.log(sigma * sigma);
  const phiSq = phi * phi;
  const deltaSq = delta * delta;

  function f(x: number): number {
    const ex = Math.exp(x);
    const phiSqVex = phiSq + v + ex;
    return (
      (ex * (deltaSq - phiSqVex)) / (2 * phiSqVex * phiSqVex) -
      (x - a) / (TAU * TAU)
    );
  }

  let A = a;
  let B: number;

  if (deltaSq > phiSq + v) {
    B = Math.log(deltaSq - phiSq - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0) k++;
    B = a - k * TAU;
  }

  let fA = f(A);
  let fB = f(B);

  while (Math.abs(B - A) > EPSILON) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);

    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA /= 2;
    }

    B = C;
    fB = fC;
  }

  return Math.exp(A / 2);
}

export function calculateNewRating(
  player: Glicko2Player,
  outcomes: GameOutcome[],
): Glicko2Player {
  if (outcomes.length === 0) {
    const { mu, phi } = toGlicko2Scale(player.rating, player.ratingDeviation);
    const phiStar = Math.sqrt(phi * phi + player.volatility * player.volatility);
    const { rating, ratingDeviation } = fromGlicko2Scale(mu, phiStar);
    return { rating, ratingDeviation, volatility: player.volatility };
  }

  const { mu, phi } = toGlicko2Scale(player.rating, player.ratingDeviation);

  const scaledOutcomes = outcomes.map((o) => {
    const { mu: muJ, phi: phiJ } = toGlicko2Scale(o.opponentRating, o.opponentRd);
    return { muJ, phiJ, score: o.score };
  });

  const v = computeV(mu, scaledOutcomes);
  const delta = computeDelta(mu, v, scaledOutcomes);
  const newSigma = computeNewVolatility(player.volatility, phi, v, delta);

  const phiStar = Math.sqrt(phi * phi + newSigma * newSigma);
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const newMu =
    mu +
    newPhi *
      newPhi *
      scaledOutcomes.reduce((sum, { muJ, phiJ, score }) => {
        return sum + g(phiJ) * (score - E(mu, muJ, phiJ));
      }, 0);

  const { rating, ratingDeviation } = fromGlicko2Scale(newMu, newPhi);

  return {
    rating: Math.max(100, rating),
    ratingDeviation: Math.min(350, Math.max(30, ratingDeviation)),
    volatility: newSigma,
  };
}
