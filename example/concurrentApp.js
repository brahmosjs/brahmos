import Brahmos, { Component } from '../src';
import data from './data.json';

function shuffle(array) {
  array = [...array];
  var currentIndex = array.length;
  var temporaryValue;
  var randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex !== 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

export const Result = ({ result }) => {
  // let i = 0;

  // while (i < 100000000) i++;

  return (
    <div className="result">
      <div>
        <a href={result.html_url} target="_blank">
          {result.full_name}
        </a>
        <button>OK</button>
        🌟<strong>{result.stargazers_count}</strong>
      </div>
      <p>{result.description}</p>
    </div>
  );
};

const initialTime = performance.now();

export default class App extends Component {
  state = { results: [] };

  stateUpdateTime = initialTime;

  componentDidMount() {
    this.setState({
      results: (data && data.items) || [],
    });
    setInterval(() => {
      this.shuffle();
    }, 10000);
  }

  componentDidUpdate() {
    console.log(performance.now() - this.stateUpdateTime);
  }

  shuffle = () => {
    console.log('State update');
    this.stateUpdateTime = performance.now();

    this.setState({ results: shuffle(this.state.results) });
  };

  render(props) {
    const { results = [], value = '' } = this.state || {};
    // let i = 0;

    // while (i < 10000000) i++;

    return (
      <div>
        <h1>Examples</h1>
        <input
          value={value}
          onChange={(e) => {
            console.log('Event update');

            this.stateUpdateTime = performance.now();
            this.setState({ value: e.target.value.slice(0, 10) });
          }}
        />
        <button onClick={this.shuffle}>Shuffle</button>
        <div className="list">
          {results.map((result) => (
            <Result result={result} />
          ))}
        </div>
      </div>
    );
  }
}
