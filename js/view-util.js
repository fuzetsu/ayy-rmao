import { b, m } from './ext-deps.js'
import { LOADING_IMG } from './constants.js'

export const loadingImg = () =>
  m('img' + b`filter invert(var(--loading-filter))`, { src: LOADING_IMG })
