const commonjs = require('rollup-plugin-commonjs');
const resolve = require('rollup-plugin-node-resolve');
const json = require('@rollup/plugin-json');
const path = require('path');

module.exports = {
  plugins: [
    resolve({
      preferBuiltins: true
    }), // resolve internal deps
    commonjs(), // handle external cjs modules
    json(), // include jsons
  ],
  external: ["aws-sdk"],
  onwarn: function (warning) {
    if (warning.code === 'THIS_IS_UNDEFINED') {
      //https://rollupjs.org/guide/en/#error-this-is-undefined to ignore this warning
      return;
    }
  },
};
