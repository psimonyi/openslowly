import resolve from 'rollup-plugin-node-resolve';

export default {
    external: ['/locale/meta.js'],
    plugins: [
        resolve({
            browser: true,
            modulesOnly: true,
        }),
    ],
};
