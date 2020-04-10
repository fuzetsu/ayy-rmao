import { m, z } from '../ext-deps.js'
import { state } from '../index.js'
import { setSub, setFilter, toggleNsfw, loadPosts } from '../actions.js'
import Toggle from './toggle.js'

export default function Search() {
  const handleEnter = e => {
    if (e.key === 'Enter') m.route.set(state.subreddit ? '/r/' + state.subreddit : '')
    else e.redraw = false
  }

  return {
    view: () => {
      const { filter, nsfw, subreddit } = state

      return m(
        'div' +
          z`
          > * { d block;m 0 auto 7 auto }
          > input[type=text] {
            ta center
            p 5;br 4;border none
            fs $large-text
          }
        `,
        m('input[type=text][placeholder=subreddit]', {
          oninput: e => setSub(e.target.value.trim()),
          onkeydown: handleEnter,
          value: subreddit,
          autofocus: !subreddit
        }),
        m('input[type=text][placeholder=filter]', {
          oninput: e => setFilter(e.target.value.trim()),
          onkeydown: handleEnter,
          value: filter
        }),
        m('label', { onclick: () => (toggleNsfw(), loadPosts(subreddit)) }, [
          m('span' + z`va bottom`, 'NSFW '),
          m(Toggle, { value: nsfw })
        ])
      )
    }
  }
}