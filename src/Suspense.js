
import Brahmos from "./index";
import {Component} from "./Component";

export default class Suspense extends Component {
    state = {promiseFulfilled: false, modules: [], error: false};
    fallback = this.props.fallback ? this.props.fallback : <p> Loading... </p>
    componentDidMount(){
        let {children : {values = [], element = null} = {}} = this.props;
        let promiseArray = element ? [element] : values.map(({element}) => element)
        Promise.all(promiseArray).then((...res) => {
            res = res[0];
            this.setState({modules: res, promiseFulfilled: true, error: false})
        }).catch((err) => {
            this.setState({promiseFulfilled: true, error: true})
            console.log(err);
        })
    }

    componentDidCatch(){
        this.setState({error: true})
    }

    render(){
        let {
            state : {promiseFulfilled = false} = {},
            props : {parentClassName = ""} = {}
        } = this;
        return <div
            class = {`${!promiseFulfilled ? "suspense": "lazy-laoded-module-wrapper"}${parentClassName}`}
        >
        {this._getComponents()}
        </div>
    }
    
    _getComponents(){
        let {
            state : {modules = [], promiseFulfilled = false, error = false} = {},
            props : {customErrorMessage = ""} = {}
        } = this;

        if(error){
            return customErrorMessage || "Failed to load components";
        } else if(promiseFulfilled){
            return modules.map((Module, index) => <Module.default key = {index} />);
        } else {
            return this.fallback;
        }
    }
    
}