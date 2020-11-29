import { Component, unstable_deferredUpdates, unstable_syncUpdates } from 'brahmos';

/**
 * Source: https://github.com/facebook/react/blob/master/fixtures/fiber-triangle/index.html
 */
const dotStyle = {
  position: 'absolute',
  background: '#61dafb',
  font: 'normal 15px sans-serif',
  textAlign: 'center',
  cursor: 'pointer',
};

const containerStyle = {
  position: 'absolute',
  transformOrigin: '0 0',
  left: '50%',
  top: '50%',
  width: '10px',
  height: '10px',
  background: '#eee',
};

var targetSize = 25;

class Dot extends Component {
  constructor() {
    super();
    this.state = { hover: false };
  }

  enter() {
    this.setState({
      hover: true,
    });
  }

  leave() {
    this.setState({
      hover: false,
    });
  }

  render() {
    var props = this.props;
    var s = props.size * 1.3;
    var style = {
      ...dotStyle,
      width: s + 'px',
      height: s + 'px',
      left: props.x + 'px',
      top: props.y + 'px',
      borderRadius: s / 2 + 'px',
      lineHeight: s + 'px',
      background: this.state.hover ? '#ff0' : dotStyle.background,
    };
    return (
      <div style={style} onMouseEnter={() => this.enter()} onMouseLeave={() => this.leave()}>
        {this.state.hover ? '*' + props.text + '*' : props.text}
      </div>
    );
  }
}

class SierpinskiTriangle extends Component {
  shouldComponentUpdate(nextProps) {
    var o = this.props;
    var n = nextProps;
    return !(o.x === n.x && o.y === n.y && o.s === n.s && o.children === n.children);
  }

  render() {
    let { x, y, s, children } = this.props;

    if (s <= targetSize) {
      return (
        <Dot x={x - targetSize / 2} y={y - targetSize / 2} size={targetSize} text={children} />
      );
      return r;
    }
    var newSize = s / 2;
    var slowDown = true;
    if (slowDown) {
      var e = performance.now() + 0.8;
      while (performance.now() < e) {
        // Artificially long execution time.
      }
    }

    s /= 2;

    return [
      <SierpinskiTriangle x={x} y={y - s / 2} s={s}>
        {children}
      </SierpinskiTriangle>,
      <SierpinskiTriangle x={x - s} y={y + s / 2} s={s}>
        {children}
      </SierpinskiTriangle>,
      <SierpinskiTriangle x={x + s} y={y + s / 2} s={s}>
        {children}
      </SierpinskiTriangle>,
    ];
  }
}

class Toggle extends Component {
  constructor(props) {
    super();
    this.onChange = this.onChange.bind(this);
  }

  onChange(event) {
    this.props.onChange(event.target.value === 'on');
  }

  render() {
    const value = this.props.value;
    return (
      <label className="control" onChange={this.onChange}>
        <label className="radio">
          <input type="radio" name="value" value="on" checked={value} />
          {this.props.onLabel}
        </label>
        <label className="radio">
          <input type="radio" name="value" value="off" checked={!value} />
          {this.props.offLabel}
        </label>
      </label>
    );
  }
}

class SierpinskiWrapper extends Component {
  constructor() {
    super();
    this.state = {
      seconds: 0,
      useTimeSlicing: true,
    };
    this.tick = this.tick.bind(this);
    this.onTimeSlicingChange = this.onTimeSlicingChange.bind(this);
  }

  componentDidMount() {
    this.intervalID = setInterval(this.tick, 1000);
  }

  tick() {
    if (this.state.useTimeSlicing) {
      // Update is time-sliced.
      unstable_deferredUpdates(() => {
        this.setState({ seconds: (this.state.seconds % 10) + 1 });
      });
    } else {
      // Update is not time-sliced. Causes demo to stutter.
      this.setState({ seconds: (this.state.seconds % 10) + 1 });
    }
  }

  onTimeSlicingChange(value) {
    this.setState(() => ({ useTimeSlicing: value }));
  }

  componentWillUnmount() {
    clearInterval(this.intervalID);
  }

  render() {
    const seconds = this.state.seconds;
    const elapsed = this.props.elapsed;
    const t = (elapsed / 1000) % 10;
    const scale = 1 + (t > 5 ? 10 - t : t) / 10;
    const transform = 'scaleX(' + scale / 2.1 + ') scaleY(0.7) translateZ(0.1px)';
    return (
      <div>
        <div>
          <h3>Time-slicing</h3>
          <p>Toggle this and observe the effect</p>
          <Toggle
            onLabel="On"
            offLabel="Off"
            onChange={this.onTimeSlicingChange}
            value={this.state.useTimeSlicing}
          />
        </div>
        <div style={{ ...containerStyle, transform }}>
          <div className="dot-container">
            <SierpinskiTriangle x={0} y={0} s={1000}>
              {seconds}
            </SierpinskiTriangle>
          </div>
        </div>
      </div>
    );
  }
}

export default class DemoApp extends Component {
  constructor() {
    super();
    this.start = Date.now();
    this.state = {
      elapsed: this.start,
    };
  }

  componentDidMount() {
    this.updateElapsed();
  }

  componentWillUnmount() {
    cancelAnimationFrame(this.animationFrameId);
  }

  updateElapsed() {
    this.animationFrameId = requestAnimationFrame(() => {
      unstable_syncUpdates(() => {
        this.setState({
          elapsed: Date.now() - this.start,
        });
      });

      this.updateElapsed();
    });
  }

  render() {
    const { elapsed } = this.state;
    return <SierpinskiWrapper elapsed={elapsed} />;
  }
}
