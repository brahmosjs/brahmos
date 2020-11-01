import fileSize from 'rollup-plugin-filesize';
import commonjs from '@rollup/plugin-commonjs';
import license from 'rollup-plugin-license';
import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
import buble from '@rollup/plugin-buble';
import flow from 'rollup-plugin-flow';
import compiler from '@ampproject/rollup-plugin-closure-compiler';

import PACKAGE from './package.json';

const fullYear = new Date().getFullYear();

const banner = `${PACKAGE.name} - ${PACKAGE.version}
  Author : ${PACKAGE.author}
  Copyright (c) ${fullYear !== 2016 ? '2016,' : ''} ${fullYear} to ${
  PACKAGE.author
}, released under the ${PACKAGE.license} license.
  ${PACKAGE.repository.url}`;

const rollupConfig = {
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
    flow(),
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
    compiler({
      compilationLevel: 'SIMPLE',
    }),
  ],
};

export default [rollupConfig];
