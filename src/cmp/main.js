import { z, m } from '@/vdom'
import { UNICODE, ADD_MORE_THRESHOLD } from '@/constants'
import { throttle, withNoRedraw } from '@/lib/util'
import { loadingImg } from '@/lib/view-util'

import { PostCommentsModal } from './post-comments'
import PostList from './post-list'
import Search from './search'

import { state } from '../index'
import { setNightTheme, loadPosts, resetPosts, increaseLimit } from '../actions'

const Main = () => {
  let atPageTop = true
  const handleScroll = withNoRedraw(
    throttle(250, e => {
      const scrollTop = e.target.scrollTop
      const wasAtPageTop = atPageTop
      atPageTop = scrollTop < 50
      if (e.target.scrollHeight - (window.innerHeight + scrollTop) < window.innerHeight)
        increaseLimit()
      else if (wasAtPageTop !== atPageTop) m.redraw()
    })
  )

  // read hash and load posts if appropriate
  const sub = m.route.param('key')
  if (sub) loadPosts(sub)
  else if (state.posts.length) resetPosts()

  let lastLimit

  return {
    view: () => {
      const { posts, loading, nightMode, subreddit, failed, openPost, limit } = state

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
          onscroll: handleScroll,
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
            m('h1.page-title' + z`fs $title-text`, 'Ayy Rmao'),
            m(Search),
            m(
              'p' + z`fs $small-text;mb 40px`,
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
