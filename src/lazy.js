import {isPromiseBasedComponent} from "./utils";

export default function lazy(component){
    if(isPromiseBasedComponent(component)){
        return component
    } else {
        return new Promise((resolve) => {
            let timeout = setTimeout(() => {
                clearTimeout(timeout);
                resolve({default: component}); 
            }, 0)
        })
    }
}