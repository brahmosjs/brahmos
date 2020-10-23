// this file is just for webpack, the package jsx-runtime points to brahmos package only.
import { createBrahmosNode } from './createElement';
import { html } from './tags';

export { html, createBrahmosNode as jsx, createBrahmosNode as jsxs, createBrahmosNode as jsxDEV };
