import createElement from './createElement';

export default function cloneElement(element, config){
    if(!element){
        return console.log(`First parameter is mandatory`);
    } else {
        let props = element.props || {};
        let {children = {}, ref, key} = props;
        element.defaultProps = {...props};
        return createElement(element, {key, ref, ...config}, children);
    }
}
