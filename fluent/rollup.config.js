import resolve from 'rollup-plugin-node-resolve';

export default {
    external: ['/locale/meta.js'],
    plugins: [
        resolve({
            browser: true,
            modulesOnly: true,
        }),
    ],
    onwarn(warning, warn) {
        // Circular dependencies are okay in modules.
        if (warning.code == 'CIRCULAR_DEPENDENCY') return;
        warn(warning);
    },
};
