import Brahmos from '../../src';

export default function ReactCredit({ name, link }) {
  return (
    <p className="attribute">
      This demo is forked from {name} demo of React:
      <br />
      <strong>Source: </strong>
      <a href={link} target="_blank">
        {link}
      </a>
    </p>
  );
}
