import Brahmos from 'brahmos';

export default function BrahmosLogo(props) {
  return (
    <svg viewBox="0 0 640 640" {...props}>
      <defs>
        <path
          d="M622.35 318.15c0 165.58-134.42 300-300 300-165.57 0-300-134.42-300-300 0-165.57 134.43-300 300-300 165.58 0 300 134.43 300 300z"
          id="prefix__a"
        />
        <path d="M286.24 574.54v-79.68" id="prefix__b" />
        <path
          d="M384.88 166.01L322.4 61.77l-62.57 104.24V339.4l-62.48 77.11v125.26l62.48-62.63h125.05l62.47 62.63V416.51l-62.47-77.11V166.01z"
          id="prefix__c"
        />
        <path d="M358.46 574.54v-79.68" id="prefix__d" />
        <path d="M322.35 562.82v-70.34" id="prefix__e" />
      </defs>
      <use xlinkHref="#prefix__a" fill="#f0da51" />
      <use xlinkHref="#prefix__b" fill="#323330" />
      <use xlinkHref="#prefix__b" fillOpacity={0} stroke="#323330" strokeWidth={6} />
      <use xlinkHref="#prefix__c" fill="#323330" />
      <use xlinkHref="#prefix__c" fillOpacity={0} stroke="#323330" />
      <use xlinkHref="#prefix__d" fill="#323330" />
      <use xlinkHref="#prefix__d" fillOpacity={0} stroke="#323330" strokeWidth={6} />
      <g>
        <use xlinkHref="#prefix__e" fill="#323330" />
        <use xlinkHref="#prefix__e" fillOpacity={0} stroke="#323330" strokeWidth={6} />
      </g>
    </svg>
  );
}
