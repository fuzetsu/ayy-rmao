import merge from 'mergerino'
import meiosis from 'meiosis-setup/mergerino'
import stream from 'meiosis-setup/simple-stream'
import { id, safeParse } from '/lib/util'
import { m } from '/vdom'

import { BORDERS } from '/constants'

import Main from '/cmp/main'

import { setNightTheme } from '/actions'

const app = {
  initial: {
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
  },
  services: [
    state => {
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

const setup = meiosis({ merge, stream, app })

export const { update } = setup
const { states } = setup

export let state
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
