interface PieceProps {
  color: 'w' | 'b';
  size?: number;
}

type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

const fill = (c: 'w' | 'b') => (c === 'w' ? '#fff' : '#1a1a1a');
const stroke = (c: 'w' | 'b') => (c === 'w' ? '#2d2d2d' : '#c0c0c0');
const SW = 1.5;

function Pawn({ color }: PieceProps) {
  const f = fill(color); const s = stroke(color);
  return (
    <svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
      <g fill={f} stroke={s} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
        <path d="M 22.5,9 C 20.29,9 18.5,10.79 18.5,13 C 18.5,15.21 20.29,17 22.5,17 C 24.71,17 26.5,15.21 26.5,13 C 26.5,10.79 24.71,9 22.5,9 z" />
        <path d="M 16,34 C 16,34 14,36 14,37 C 14,38 31,38 31,37 C 31,36 29,34 29,34 L 16,34 z" />
        <path d="M 15,34 L 15,28 C 15,22 19,20 22.5,19 C 26,20 30,22 30,28 L 30,34 L 15,34 z" />
        <path d="M 13,38.5 C 13,39.5 14,40 14,40 L 31,40 C 31,40 32,39.5 32,38.5 L 13,38.5 z" />
      </g>
    </svg>
  );
}

function Knight({ color }: PieceProps) {
  const f = fill(color); const s = stroke(color);
  return (
    <svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
      <g fill={f} stroke={s} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
        <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" />
        <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10" />
        <circle cx="19" cy="12.5" r="0.75" fill={s} stroke="none" />
        <path d="M 9.5 25.5 A 0.5 0.5 0 1 1 8.5,25.5 A 0.5 0.5 0 1 1 9.5 25.5 z" fill={s} stroke="none" />
      </g>
    </svg>
  );
}

function Bishop({ color }: PieceProps) {
  const f = fill(color); const s = stroke(color);
  return (
    <svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
      <g fill={f} stroke={s} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="22.5" cy="10" r="3" />
        <path d="M 22.5,13 C 16.5,13 15,20 15,26 C 15,32 18,38 22.5,38 C 27,38 30,32 30,26 C 30,20 28.5,13 22.5,13 z" />
        <path d="M 13,39 C 13,40 32,40 32,39 C 32,38 27,37 22.5,37 C 18,37 13,38 13,39 z" />
        <path d="M 20,17.5 L 25,17.5" strokeWidth="1" />
      </g>
    </svg>
  );
}

function Rook({ color }: PieceProps) {
  const f = fill(color); const s = stroke(color);
  return (
    <svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
      <g fill={f} stroke={s} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
        <path d="M 9,38 C 9,39 10,40 11,40 L 34,40 C 35,40 36,39 36,38 L 36,36 L 9,36 L 9,38 z" />
        <path d="M 11,36 L 11,16 L 34,16 L 34,36" />
        <path d="M 11,16 L 9,14 L 9,9 L 14,9 L 14,12 L 20,12 L 20,9 L 25,9 L 25,12 L 31,12 L 31,9 L 36,9 L 36,14 L 34,16" />
        <path d="M 14,16 L 14,12" />
        <path d="M 20,16 L 20,12" />
        <path d="M 25,16 L 25,12" />
        <path d="M 31,16 L 31,12" />
      </g>
    </svg>
  );
}

function Queen({ color }: PieceProps) {
  const f = fill(color); const s = stroke(color);
  return (
    <svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
      <g fill={f} stroke={s} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="12" r="2.75" />
        <circle cx="14" cy="9" r="2.75" />
        <circle cx="22.5" cy="8" r="2.75" />
        <circle cx="31" cy="9" r="2.75" />
        <circle cx="39" cy="12" r="2.75" />
        <path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 30.7,10.9 L 22.5,24.5 L 14.3,10.9 L 14,25 L 6.5,13.5 L 9,26 z" />
        <path d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 10.5,36 10.5,36 C 20,37.5 25,37.5 34.5,36 C 34.5,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 C 27.5,24.5 17.5,24.5 9,26 z" />
        <path d="M 11.5,30 C 15,29 30,29 33.5,30" />
        <path d="M 12,33.5 C 18,32.5 27,32.5 33,33.5" />
        <path d="M 10.5,36 C 16,37.5 29,37.5 34.5,36" />
      </g>
    </svg>
  );
}

function King({ color }: PieceProps) {
  const f = fill(color); const s = stroke(color);
  return (
    <svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
      <g fill={f} stroke={s} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
        <path d="M 22.5,11.63 L 22.5,6" strokeWidth="1.8" />
        <path d="M 20,8 L 25,8" strokeWidth="1.8" />
        <path d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 25.5,14.5 24.5,12 22.5,12 C 20.5,12 19.5,14.5 19.5,14.5 C 18,17.5 22.5,25 22.5,25" />
        <path d="M 12.5,37 C 13,29.92 9,29.67 9,26 C 9,22 12,20 12,20 C 12,20 9,16.93 9,14 C 9,12.07 10.46,12 11.5,12 C 14.85,12 13.65,14 19.5,14.5 C 25.37,14 24.17,12 27.5,12 C 28.54,12 30,12.07 30,14 C 30,16.93 27,20 27,20 C 27,20 30,22 30,26 C 30,29.67 26,29.92 26.5,37" />
        <path d="M 11.5,37 C 17,40.5 27,40.5 33.5,37" />
        <path d="M 34,36.5 L 34,37" />
        <path d="M 11,36.5 L 11,37" />
        <path d="M 10.5,37.5 C 15,40.5 30,40.5 34.5,37.5" />
        <path d="M 11.5,37 C 11.5,38 34.5,38 34.5,37" />
      </g>
    </svg>
  );
}

const PIECES: Record<PieceType, React.ComponentType<PieceProps>> = {
  p: Pawn, n: Knight, b: Bishop, r: Rook, q: Queen, k: King,
};

interface ChessPieceProps {
  type: PieceType;
  color: 'w' | 'b';
  size?: number;
}

export function ChessPiece({ type, color, size = 40 }: ChessPieceProps) {
  const Component = PIECES[type];
  return (
    <div style={{ width: size, height: size }} className="pointer-events-none select-none">
      <Component color={color} />
    </div>
  );
}
