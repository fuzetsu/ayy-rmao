import { z, m } from './ext-deps.js'
import { LOADING_IMG } from './constants.js'

export const loadingImg = () =>
  m('img' + z`filter invert(var(--loading-filter))`, { src: LOADING_IMG })
