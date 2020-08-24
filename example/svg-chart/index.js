import Brahmos, { Component } from 'brahmos';

function Rect({ height, index }) {
  return (
    <rect
      width="40"
      y={120 - height}
      x="50"
      height={height}
      style="transition: all ease .3s;"
      transform={`translate(${43 * index},0)`}
    />
  );
}

function Chart({ data }) {
  return (
    <svg width="420" height="120">
      {data.map((height, index) => (
        <Rect key={index} height={height} index={index} />
      ))}
    </svg>
  );
}

class SVGExample extends Component {
  state = {
    data: [99, 44, 11, 55, 33, 115, 4],
  };

  _shuffuleArray(array) {
    var j, temp, i;
    for (i = array.length; i; i--) {
      j = Math.floor(Math.random() * i);
      temp = array[i - 1];
      array[i - 1] = array[j];
      array[j] = temp;
    }
    return array;
  }

  shuffule = () => this.setState({ data: this._shuffuleArray(this.state.data) });

  render() {
    const { data } = this.state;
    return (
      <div>
        <p>This demo demonstrate usage of dynamic svg in Brahmos.</p>
        <Chart data={data} />
        <button className="button is-primary" onClick={this.shuffule}>
          Suffule
        </button>
      </div>
    );
  }
}

export default SVGExample;
