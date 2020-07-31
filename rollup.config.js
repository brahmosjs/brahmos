import { terser } from 'rollup-plugin-terser';
import fileSize from 'rollup-plugin-filesize';
import commonjs from 'rollup-plugin-commonjs';
import license from 'rollup-plugin-license';
import replace from 'rollup-plugin-replace';
import resolve from 'rollup-plugin-node-resolve';
import buble from 'rollup-plugin-buble';
import PACKAGE from './package.json';

const fullYear = new Date().getFullYear();

const banner = `${PACKAGE.name} - ${PACKAGE.version}
  Author : ${PACKAGE.author}
  Copyright (c) ${fullYear !== 2016 ? '2016,' : ''} ${fullYear} to ${
  PACKAGE.author
}, released under the ${PACKAGE.license} license.
  ${PACKAGE.repository.url}`;

const defaultConfig = {
  input: './src/index.js',
  output: [
    {
      file: 'dist/brahmos.es.js',
      format: 'esm',
    },
    {
      file: 'dist/brahmos.js',
      format: 'umd',
      name: 'Brahmos',
    },
  ],
  plugins: [
    buble({
      objectAssign: true,
    }),
    replace({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    }),
    resolve(),
    commonjs({
      include: 'node_modules/**',
    }),
    fileSize(),
    license({
      banner,
    }),
    // terser(),
  ],
};

const minConfig = {
  ...defaultConfig,
  output: {
    file: 'dist/brahmos.min.js',
    format: 'umd',
    name: 'Brahmos',
  },
  plugins: [...defaultConfig.plugins, terser()],
};

export default [defaultConfig, minConfig];
