import "jsx";
import {Component} from "jsx";
import {Sink, Sinks} from "sinks";
import {Flux} from "reactive";

class A extends Component {
    private readonly emitter = Sinks.many().multicast<{
        inner: {
            number: number,
            other: number
        }
    }>();
    private readonly flux = Flux.from(this.emitter);

    mounted() {
        this.flux.map(value => value.inner.number).distinctUntilChanged().subscribe(data => console.log(data)).request(Number.MAX_SAFE_INTEGER)
        this.flux.map(value => value.inner.other).distinctUntilChanged().subscribe(data => console.log(data)).request(Number.MAX_SAFE_INTEGER)
    }

    render(): JSX.Element {
        return <div>
            <B emitter={this.emitter}></B>
        </div>;
    }

}

class B extends Component<{
    emitter: Sink<{
        inner: {
            number: number,
            other: number
        }
    }>
    ref?: (el: HTMLElement) => void
}> {
    private readonly num = Math.random();
    render(): JSX.Element {
        return <button onclick={() => this.props.emitter.emitData({
            inner: {
                number: this.num,
                other: Math.random()
            },
        })}>click me</button>;
    }
}


class Test extends Component {
    public beforeMount(): void {
        console.log('beforeMount')
    }

    public beforeUnmount(): void {
        console.log('beforeUnmount')
    }

    public mounted(): void {
        console.log('mounted')
    }

    public render(): JSX.Element {
        return <div onclick={ev => {
            console.log(ev)
        }} style={{
            "font-size": "xxx-large"
        }}>
            <div>Hello</div>
            <div>World</div>
            !
        </div>;
    }

    public unmounted(): void {
        console.log('unmounted')
    }

}

document.getElementById('root')?.replaceWith(<div id={'root'}><A/></div> as Node)
