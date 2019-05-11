import { state, toggleTheme } from '../index.js'
import {
  BORDERS,
  FIRST_LOAD_NUM,
  LOAD_NUM,
  ADD_MORE_THRESHOLD,
  UNICODE,
  NSFW_KEY
} from '../constants.js'
import { getPosts } from '../api.js'
import { m, z } from '../ext-deps.js'
import { storeSet, throttle } from '../util.js'
import { PostCommentsModal } from './post-comments.js'
import PostList from './post-list.js'
import { loadingImg } from '../view-util.js'

const Main = () => {
  const loadPosts = (append = false) => {
    if (!state.subreddit) return resetPosts()
    if (!append) resetPosts()
    state.loading = true
    failed = false
    const after = posts.length > 0 ? posts[posts.length - 1].name : ''
    getPosts(state.subreddit, after, state.nsfw)
      // apply filter
      .then(newPosts => {
        if (!state.filter) return newPosts
        const filtered = state.filter.split('+')
        return newPosts.filter(post => !filtered.includes(post.subreddit))
      })
      // combine post lists
      .then(
        newPosts => {
          posts = posts.concat(newPosts)
          state.loading = false
          m.redraw()
        },
        err => {
          if (err) console.log(err)
          state.loading = false
          failed = true
          m.redraw()
        }
      )
  }

  const resetPosts = () => {
    posts = []
    state.limit = FIRST_LOAD_NUM
  }

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

  let atPageTop = true
  let failed = false
  let posts = []
  let lastLimit
  state.borders = state.nightMode ? BORDERS.night : BORDERS.day

  // read hash and load posts if appropriate
  const sub = m.route.param('key')
  if (sub) {
    state.subreddit = sub
    loadPosts()
  }

  return {
    view: () => {
      if (
        !state.loading &&
        posts.length > 0 &&
        posts.length <= state.limit + ADD_MORE_THRESHOLD &&
        state.limit !== lastLimit
      ) {
        loadPosts(true)
      }
      lastLimit = state.limit
      return m(
        'main' + z`pin;ta center;overflow auto`,
        {
          onscroll: throttle(250, e => handleScroll(e)),
          class: state.openPost ? z`overflow hidden;pr 20` : ''
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
              onclick: () => toggleTheme(),
              class: atPageTop ? '' : z`fade 0; :hover { fade 1 }`
            },
            state.nightMode ? UNICODE.moon : UNICODE.sun
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
                oninput: e => (state.subreddit = e.target.value),
                onkeydown: handleEnter,
                value: state.subreddit,
                autofocus: !state.subreddit
              }),
              m('input[type=text][placeholder=filter]', {
                oninput: e => (state.filter = e.target.value),
                onkeydown: handleEnter,
                value: state.filter
              }),
              m('label', [
                m('input[type=checkbox]', {
                  onclick: () => {
                    state.nsfw = !state.nsfw
                    storeSet(NSFW_KEY, state.nsfw)
                  },
                  checked: state.nsfw
                }),
                m('span', 'nsfw?')
              ])
            ),
            m(
              'p' + z`fs var(--small-text);mb 40px`,
              failed
                ? 'Failed to load subreddit. Please check name and try again.'
                : !state.subreddit
                ? 'Please enter a subreddit and press enter.'
                : ''
            )
          ),
          state.openPost ? m(PostCommentsModal) : '',
          m(PostList, { posts }),
          state.loading && m('div' + z`ta center`, loadingImg())
        ]
      )
    }
  }
}

export default Main
