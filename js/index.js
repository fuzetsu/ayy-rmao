import { m, merge, stream, setupMeiosis } from './ext-deps.js'
import { id, safeParse } from './util.js'

import { BORDERS } from './constants.js'

import Main from './cmp/main.js'

import { setNightTheme } from './actions.js'

const app = {
  Initial: () => ({
    nsfw: false,
    filter: '',
    commentSort: 'confidence',
    nightMode: false,
    ...safeParse(localStorage.ayyRmaov1),
    openPost: null,
    loading: false,
    borders: BORDERS.day,
    limit: 3,
    subreddit: '',
    posts: []
  }),
  services: [
    ({ state }) => {
      localStorage.ayyRmaov1 = JSON.stringify(
        merge(state, {
          openPost: undefined,
          posts: undefined,
          subreddit: undefined
        })
      )
    }
  ]
}

export let state
export let update

setupMeiosis({ merge, stream, app }).then(({ update: up, states }) => {
  update = up
  states.map(x => (state = x)).map(m.redraw)

  setNightTheme(state.nightMode)

  window.addEventListener('keydown', e => {
    if (e.code === 'KeyN' && e.target.nodeName !== 'INPUT') {
      e.preventDefault()
      setNightTheme()
    }
  })

  m.route(id('app'), '/', {
    '/': Main,
    '/r/:key': Main
  })
})
