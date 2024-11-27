import solidLogo from './assets/pjsx.webp'
import viteLogo from '/vite.svg'
import './App.css'
import {Sinks} from "sinks";
import {Flux} from "reactive";

export default function App() {
    let count = 1;
    let sink = Sinks.many().replay().latest<number>(1);
    sink.emitData(count)
    return <div id='root'>
        <div>
            <a href="https://vite.dev" target="_blank">
                <img src={viteLogo} class="logo" alt="Vite logo"/>
            </a>
            <a href="https://github.com/sbooster/pjsx" target="_blank">
                <img src={solidLogo} class="logo solid" alt="Solid logo"/>
            </a>
        </div>
        <h1>Vite + pJSX</h1>
        <div class="card">
            <button onclick={() => sink.emitData(++count)}>
                count is {Flux.from(sink).map(value => value < 5 ? 1 : value)}
            </button>
            <p>
                Edit <code>src/App.tsx</code> and save to test HMR
            </p>
        </div>
        <p class="read-the-docs">
            Click on the Vite and pJSX logos to learn more
        </p>
    </div>
}
