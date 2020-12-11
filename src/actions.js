import { setNight } from '/styles'
import { BORDERS, FIRST_LOAD_NUM, LOAD_NUM } from '/constants'
import { update, state } from '/'
import { getPosts } from '/lib/api'

export const setNightTheme = flag =>
  update((state, m) => {
    const nightMode = flag == null ? !state.nightMode : flag
    setNight(nightMode)
    return m(state, { nightMode, borders: nightMode ? BORDERS.night : BORDERS.day })
  })

export const loadPosts = (sub, append = false) => {
  update({ subreddit: sub, failed: false, loading: false })
  if (!sub) return resetPosts()
  if (!append) resetPosts()
  const { posts } = state
  const after = posts.length > 0 ? posts[posts.length - 1].name : ''
  update({ loading: true })
  getPosts(state.subreddit, after, state.nsfw)
    // apply filter
    .then(newPosts => {
      if (!state.filter) return newPosts
      const filtered = state.filter.split('+')
      return newPosts.filter(post => !filtered.includes(post.subreddit))
    })
    // combine post lists
    .then(
      newPosts => update({ posts: x => x.concat(newPosts), loading: false }),
      err => {
        if (err) console.log(err)
        update({ failed: true, loading: false })
      }
    )
}

export const resetPosts = () => update({ posts: [], limit: FIRST_LOAD_NUM })
export const increaseLimit = () => update({ limit: x => x + LOAD_NUM })

export const toggleNsfw = () => update({ nsfw: x => !x })
export const setSub = x => update({ subreddit: x })
export const setFilter = x => update({ filter: x })
export const setOpen = x => update({ openPost: x })
export const setCommentSort = x => update({ commentSort: x })
