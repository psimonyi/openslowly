import resolve from 'rollup-plugin-node-resolve';

export default {
    external: ['/locale/meta.js'],
    plugins: [
        resolve({
            browser: true,
            modulesOnly: true,
        }),
    ],
    output: {
        banner: '/* *** This is a generated file. *** */\n',
    },
    onwarn(warning, warn) {
        // Circular dependencies are okay in modules.
        if (warning.code == 'CIRCULAR_DEPENDENCY') return;
        warn(warning);
    },
};
