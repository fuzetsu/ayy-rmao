import { m } from '@/vdom'
import { API_URL, REQUEST_NUM } from '@/constants'
import { getPath } from '@/lib/util'

const get = (url, params) =>
  m.request({ method: 'get', background: true, url: API_URL + url, params })

export const searchPosts = async (query, sort = true) => {
  const results = await get('/search.json', { q: query }).then(data =>
    data.data.children.map(({ data }) => {
      return {
        id: data.id,
        subreddit: data.subreddit,
        title: data.title,
        score: data.score,
        gilded: data.gilded,
        permalink: data.permalink,
        name: data.name,
        num_comments: data.num_comments
      }
    })
  )
  if (sort) results.sort((a, b) => (a.num_comments > b.num_comments ? -1 : 1))
  return results
}

export const getComments = (post, comment, sort = 'confidence') =>
  get(post.permalink + '.json', { comment: comment && comment.id, sort }).then(
    data => data[1].data.children
  )

export const getMoreComments = (postName, ids) =>
  get('/api/morechildren.json', { api_type: 'json', children: ids.join(','), link_id: postName })
    .then(data => getPath(data, 'json.data.things') || [])
    .catch(err => console.log(err))

export const getPosts = (subreddit, after, nsfw) =>
  get(`/r/${subreddit}.json`, { limit: REQUEST_NUM, after }).then(data =>
    data.data.children
      .filter(post => nsfw || !post.data.over_18)
      .map(post => detectPostType(post.data))
  )

// the base list of attributes to copy
const baseAttrs = [
  'name',
  'permalink',
  'subreddit',
  'score',
  'num_comments',
  'title',
  'author',
  'created_utc'
]

// array of post types, how to match, and how to display them
const postTypes = [
  { type: 'Image', match: post => post.post_hint === 'image' },
  {
    type: 'Video',
    postParse: true,
    match: post => Boolean(post.media.reddit_video.fallback_url),
    parse: (post, res) => {
      const url = post.media.reddit_video.fallback_url
      res.sound = [
        url.replace(/DASH[^.]*\./, 'DASH_AUDIO_128.'),
        url.split('/').slice(0, -1).join('/') + '/audio'
      ]
      return url
    }
  },
  {
    type: 'Gallery',
    match: post => post.media_metadata && post.url.includes('reddit.com/gallery'),
    postParse: true,
    parse: (post, res) => {
      res.images = Object.values(post.media_metadata).map(data => data.s.u.replace('preview', 'i'))
      return post.url
    }
  },
  {
    type: 'Embed',
    desc: 'Imgur Gallery',
    match: /imgur\.com\/(a|gallery)\/[a-z0-9]+$/i,
    parse: url =>
      url.replace(/\/gallery\//, '/a/').replace(/^http:/, 'https:') +
      '/embed?pub=true&analytics=false'
  },
  {
    type: 'Self',
    match: post => post.is_self,
    fields: ['selftext_html']
  },
  {
    type: 'Link',
    match: () => true,
    fields: ['thumbnail']
  }
]

// iterates through post types looking for a match for the given url
const detectPostType = function (post) {
  const url = post.url.replace(/[?#].*$/, '')
  const cleanPost = {}
  postTypes.some(type => {
    if (typeof type.match === 'function' ? type.match(post) : type.match.test(url)) {
      baseAttrs.concat(type.fields || []).forEach(field => (cleanPost[field] = post[field]))
      ;['type', 'parseAsync', 'desc'].forEach(field => (cleanPost[field] = type[field]))
      cleanPost.url = type.parse
        ? type.parse(type.postParse ? post : type.strip === false ? post.url : url, cleanPost)
        : type.strip
          ? url
          : post.url
      return true
    }
  })
  return cleanPost
}
