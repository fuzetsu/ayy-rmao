import { state, toggleTheme } from '../index.js'
import {
  BORDERS,
  FIRST_LOAD_NUM,
  FKEY,
  LOAD_NUM,
  ADD_MORE_THRESHOLD,
  UNICODE,
  LOADING_IMG
} from '../constants.js'
import { getPosts } from '../api.js'
import { m, b } from '../ext-deps.js'
import { storeSet, throttle, withAttrNoRedraw } from '../util.js'
import { PostCommentsModal } from './post-comments.js'
import PostList from './post-list.js'

const Main = {
  oninit() {
    this.loading = false
    this.atPageTop = true
    this.posts = []
    state.borders = state.nightMode ? BORDERS.night : BORDERS.day
    // read hash and load posts if appropriate
    if (this.readState()) {
      this.loadPosts()
    }
  },
  somethingChanged() {
    const c = state
    return c.subreddit !== this.subreddit || c.nsfw !== this.nsfw || c.filter !== this.filter
  },
  loadPosts() {
    if (this.subreddit) {
      if (this.somethingChanged()) {
        this.loading = true
        this.resetPosts()
      }
      this.failed = false
      this.writeState()
      const after = this.posts.length > 0 ? this.posts[this.posts.length - 1].name : ''
      getPosts(this.subreddit, after, this.nsfw)
        // apply filter
        .then(newPosts => {
          if (!this.filter) return newPosts
          const filtered = this.filter.split('+')
          return newPosts.filter(post => !filtered.includes(post.subreddit))
        })
        // combine post lists
        .then(
          newPosts => {
            this.posts = this.posts.concat(newPosts)
            this.loading = false
            m.redraw()
          },
          err => {
            if (err) console.log(err)
            this.loading = false
            this.failed = true
            m.redraw()
          }
        )
    } else {
      this.setHash('')
      this.resetPosts()
    }
  },
  syncWithAppState() {
    state.subreddit = this.subreddit
    state.nsfw = this.nsfw
    state.filter = this.filter
  },
  resetPosts() {
    this.posts = []
    this.syncWithAppState()
    state.viewed.length = 0
    state.limit = FIRST_LOAD_NUM
  },
  handleSubmit(e) {
    e.preventDefault()
    if (this.somethingChanged()) {
      this.loadPosts()
    }
  },
  readState() {
    const hash = decodeURIComponent(location.hash)
    if (hash) {
      const state = {}
      hash
        .slice(1)
        .split(' and ')
        .forEach(thing => {
          const [key, val] = thing.split(' is ')
          state[key] = val
        })
      if ('subreddit' in state) {
        this.subreddit = state.subreddit
      }
      if ('nsfw' in state) {
        this.nsfw = state.nsfw === 'enabled'
      }
      if ('filter' in state) {
        storeSet(FKEY, state.filter)
        this.filter = state.filter
      }
      return true
    }
    return false
  },
  writeState() {
    this.syncWithAppState()
    storeSet(FKEY, this.filter)
    this.setHash(
      'subreddit is ' +
        this.subreddit +
        (this.filter ? ' and filter is ' + this.filter : '') +
        ' and nsfw is ' +
        (this.nsfw ? 'enabled' : 'disabled')
    )
  },
  setHash(hash) {
    clearInterval(state.timeoutId)
    state.changingHash = true
    location.hash = hash
    state.timeoutId = setTimeout(() => (state.changingHash = false), 500)
  },
  getMessage() {
    if (this.failed) {
      return 'Failed to load subreddit. Please check name and try again.'
    } else if (!this.subreddit) {
      return 'Please enter a subreddit and press enter.'
    }
  },
  handleScroll(e) {
    const scrollTop = e.target.scrollTop
    const wasAtPageTop = this.atPageTop
    this.atPageTop = scrollTop < 50
    if (e.target.scrollHeight - (window.innerHeight + scrollTop) < window.innerHeight) {
      state.limit += LOAD_NUM
    } else {
      if (wasAtPageTop === this.atPageTop) e.redraw = false
    }
  },
  view() {
    if (
      !this.loading &&
      this.posts.length > 0 &&
      this.posts.length <= state.limit + ADD_MORE_THRESHOLD &&
      state.limit !== this.lastLimit
    ) {
      this.loadPosts()
    }
    this.lastLimit = state.limit
    return m(
      'main' + b`pin;ta center;overflow auto`,
      {
        onscroll: throttle(250, e => this.handleScroll(e)),
        class: state.openPost ? b`overflow hidden;pr 20` : ''
      },
      [
        m(
          'div.theme-changer' +
            b`
            position fixed;t 5;r 25
            cursor pointer
            user-select none
            z-index 100
          `,
          {
            onclick: () => toggleTheme(),
            class: this.atPageTop ? '' : b`fade 0`.$hover`fade 1`
          },
          state.nightMode ? UNICODE.moon : UNICODE.sun
        ),
        m(
          'div' + b`mt ${this.posts.length ? '10' : '15%'};transition margin-top 1s ease`,
          m('h1.page-title' + b`fs var(--title-text)`, 'Ayy Rmao'),
          m(
            'form' +
              b
                .$nest(' > *', 'd block;m 0 auto 7 auto')
                .$nest(' input[type=text]', 'ta center;br 4;border none;p 5;fs var(--large-text)'),
            { onsubmit: e => this.handleSubmit(e) },
            m('input[type=text][placeholder=subreddit]', {
              onchange: withAttrNoRedraw('value', v => (this.subreddit = v)),
              value: this.subreddit,
              autofocus: !this.subreddit
            }),
            m('input[type=text][placeholder=filter]', {
              onchange: withAttrNoRedraw('value', v => (this.filter = v)),
              value: this.filter
            }),
            m('label' + b`mb 40`, [
              m('input[type=checkbox]', {
                onclick: withAttrNoRedraw('checked', v => (this.nsfw = v)),
                checked: this.nsfw
              }),
              m('span', 'nsfw?')
            ]),
            m('button[type=submit]' + b`d none`)
          )
        ),
        state.openPost ? m(PostCommentsModal) : '',
        this.loading
          ? m('div' + b`ta center`, m('img', { src: LOADING_IMG }))
          : m(PostList, { posts: this.posts, message: this.getMessage() })
      ]
    )
  }
}

export default Main
