import Brahmos, { useState } from '../src';

function Circle ({ size }) {
  return (
    <circle cx={size/2} cy={size / 2} r={size / 4} stroke="green" stroke-width={4} fill="yellow" />
  );
}


function BrahmosLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"
width="640" height="640">
      <defs>
        <path d="M620 320c0 165.57-134.43 300-300 300S20 485.57 20 320 154.43 20 320 20s300 134.43 300 300z"
        id="a" />
        <path d="M283.89 576.39v-79.68" id="b" />
        <path d="M382.52 167.86L320.05 63.61l-62.57 104.25v173.39L195 418.36v125.25l62.48-62.62h125.04L445 543.61V418.36l-62.48-77.11V167.86z"
        id="c" />
        <path d="M356.11 576.39v-79.68" id="d" />
        <path d="M320 564.67v-70.34" id="e" />
      </defs>
      <use xlinkHref="#a" fill="#f0db50" />
      <use xlinkHref="#b" fill="#323330" />
      <use xlinkHref="#b" fillOpacity="0" stroke="#323330" strokeWidth="6" />
      <use xlinkHref="#c" fill="#323330" />
      <use xlinkHref="#d" fill="#323330" />
      <use xlinkHref="#d" fillOpacity="0" stroke="#323330" strokeWidth="6" />
      <use xlinkHref="#e" fill="#323330" />
      <use xlinkHref="#e" fillOpacity="0" stroke="#323330" strokeWidth="6" />
    </svg>
  );
}

export default function SVGExample() {
  const [size, increaseSize] = useState(100);

  return (
    <div>
      <BrahmosLogo />
      <svg width={size} height={size} onClick={() => increaseSize(size + 100)}>
        <Circle size={size}/>
      </svg>
    </div>
  );
}