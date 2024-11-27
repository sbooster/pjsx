import babel from '@rollup/plugin-babel';
import nodeResolve from '@rollup/plugin-node-resolve';

const plugins = [
    nodeResolve({
        extensions: ['.js', '.ts']
    }),
    babel({
        extensions: ['.js', '.ts'],
        babelHelpers: "bundled",
        presets: ["@babel/preset-typescript"],
    }),
];

export default [{
    input: 'src/index.ts',
    output: [{
        format: 'es',
        file: 'dist/index.js'
    }],
    external: ['csstype', '@michijs/htmltype'],
    plugins
}];