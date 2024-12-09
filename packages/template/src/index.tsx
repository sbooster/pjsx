import "jsx";
import {Component} from "jsx";
import {Sinks} from "sinks";
import {Flux} from "reactive";
import App from "./App.tsx";

class Test extends Component {
    public beforeMount(): void {
        console.log('beforeMount')
    }

    public mounted(): void {
        console.log('mounted')
    }

    public unmounted(): void {
        console.log('unmounted')
    }

    public beforeUnmount(): void {
        console.log('beforeUnmount')
    }

    public render(): JSX.Element {
        console.log("render")
        const sink = Sinks.many().replay().latest(1);
        let count = 0;
        const increase = () => sink.emitData(++count)
        increase();
        return <div style={{
            "font-size": "xxx-large"
        }}>
            <div>Hello</div>
            <div>World</div>
            count is {Flux.from(sink)}
            <button onclick={increase}>increase</button>
        </div>;
    }

}

document.getElementById('root')?.replaceWith(<div id={'root'}><App/></div> as Node);
