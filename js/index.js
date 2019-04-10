import { m } from './ext-deps.js'
import 'https://unpkg.com/lodash@4'

import { BORDERS, THEME_KEY, FKEY } from './constants.js'
import { storeGet, id, storeSet } from './util.js'

import Main from './cmp/main.js'
import { setNight } from './styles.js'

export const state = {
  openPost: null,
  posts: [],
  loading: false,
  borders: BORDERS.day,
  limit: 3,
  viewed: [],
  changingHash: false,
  subreddit: '',
  nsfw: false,
  filter: storeGet(FKEY) || '',
  nightMode: storeGet(THEME_KEY)
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

window.addEventListener('hashchange', () => {
  if (!state.changingHash) {
    location.reload()
  } else {
    state.changingHash = false
  }
})

m.mount(id('app'), Main)
