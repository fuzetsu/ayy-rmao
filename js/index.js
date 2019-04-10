import { m } from './ext-deps.js'

import { BORDERS, THEME_KEY, FILTER_KEY, NSFW_KEY } from './constants.js'
import { storeGet, id, storeSet } from './util.js'

import Main from './cmp/main.js'
import { setNight } from './styles.js'

export const state = {
  openPost: null,
  loading: false,
  borders: BORDERS.day,
  limit: 3,
  subreddit: '',
  nsfw: !!storeGet(NSFW_KEY),
  filter: storeGet(FILTER_KEY) || '',
  nightMode: !!storeGet(THEME_KEY)
}

export const toggleTheme = () => {
  state.nightMode = !state.nightMode
  setNight(state.nightMode)
  storeSet(THEME_KEY, state.nightMode)
  state.borders = state.nightMode ? BORDERS.day : BORDERS.night
}

setNight(state.nightMode)

window.addEventListener('keydown', e => {
  if (e.code === 'KeyN' && e.target.nodeName !== 'INPUT') {
    e.preventDefault()
    toggleTheme()
    m.redraw()
  }
})

m.route(id('app'), '/', {
  '/': Main,
  '/r/:key': Main
})
