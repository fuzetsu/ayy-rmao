import { BORDERS, LOAD_NUM, ADD_MORE_THRESHOLD, UNICODE } from '../constants.js'
import { m, z } from '../ext-deps.js'
import { throttle } from '../util.js'
import { PostCommentsModal } from './post-comments.js'
import PostList from './post-list.js'
import { loadingImg } from '../view-util.js'

import { state } from '../index.js'
import { setNightTheme, loadPosts, toggleNsfw, setSub, setFilter, resetPosts } from '../actions.js'

const Main = () => {
  let atPageTop = true
  const handleScroll = e => {
    const scrollTop = e.target.scrollTop
    const wasAtPageTop = atPageTop
    atPageTop = scrollTop < 50
    if (e.target.scrollHeight - (window.innerHeight + scrollTop) < window.innerHeight) {
      state.limit += LOAD_NUM
    } else {
      if (wasAtPageTop === atPageTop) e.redraw = false
    }
  }

  const handleEnter = e => {
    if (e.key === 'Enter') m.route.set(state.subreddit ? '/r/' + state.subreddit : '')
    else e.redraw = false
  }

  let lastLimit
  state.borders = state.nightMode ? BORDERS.night : BORDERS.day

  // read hash and load posts if appropriate
  const sub = m.route.param('key')
  if (sub) loadPosts(sub)
  else if (state.posts.length) resetPosts()

  return {
    view: () => {
      const { posts, loading, nightMode, subreddit, filter, nsfw, failed, openPost, limit } = state

      if (
        !loading &&
        posts.length > 0 &&
        posts.length <= limit + ADD_MORE_THRESHOLD &&
        limit !== lastLimit
      ) {
        loadPosts(subreddit, true)
      }
      lastLimit = limit

      return m(
        'main' + z`pin;ta center;overflow auto`,
        {
          onscroll: throttle(250, e => handleScroll(e)),
          class: openPost ? z`overflow hidden;pr 20` : ''
        },
        [
          m(
            'div.theme-changer' +
              z`
              position fixed;t 5;r 25
              cursor pointer
              user-select none
              z-index 100
            `,
            {
              onclick: () => setNightTheme(),
              class: atPageTop ? '' : z`fade 0; :hover { fade 1 }`
            },
            nightMode ? UNICODE.moon : UNICODE.sun
          ),
          m(
            'div' + z`mt ${posts.length ? '10' : '15%'};transition margin-top 1s ease`,
            m('h1.page-title' + z`fs var(--title-text)`, 'Ayy Rmao'),
            m(
              'div' +
                z`
                > * { d block;m 0 auto 7 auto }
                > input[type=text] {
                  ta center
                  p 5;br 4;border none
                  fs var(--large-text)
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
              m('label', [
                m('input[type=checkbox]', {
                  onclick: () => (toggleNsfw(), loadPosts(subreddit)),
                  checked: nsfw
                }),
                m('span', 'nsfw?')
              ])
            ),
            m(
              'p' + z`fs var(--small-text);mb 40px`,
              failed
                ? 'Failed to load subreddit. Please check name and try again.'
                : !subreddit
                ? 'Please enter a subreddit and press enter.'
                : ''
            )
          ),
          openPost ? m(PostCommentsModal) : '',
          m(PostList, { posts }),
          loading && m('div' + z`ta center`, loadingImg())
        ]
      )
    }
  }
}

export default Main
