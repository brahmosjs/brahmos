import Brahmos, { cloneElement, Component } from '../src';
import UseStateExample from './UseStateExample';
import Child from "./createPortalExample";

export default class CloneElement extends Component{
    state = {Nodes : []};

    render(){
        let {Nodes = []} = this.state;
        return <div>
            {
                Nodes.map((Node) => {
                    let {type : Element} = Node;
                    return <Element {...Node} />
                })
            }
            <button onClick = {() => {
                this.setState({Nodes: Nodes.concat(cloneElement(UseStateExample))})
            }}>Clone</button>
        </div>
    }
}

