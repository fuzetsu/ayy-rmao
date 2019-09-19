import { m } from './ext-deps.js'
import { API_URL, REQUEST_NUM } from './constants.js'

export const searchPosts = async (query, sort = true) => {
  const results = await m
    .request({
      method: 'get',
      background: true,
      url: `${API_URL}/search.json`,
      data: {
        q: query
      }
    })
    .then(data =>
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

export const getComments = (post, comment) =>
  m
    .request({
      method: 'get',
      background: true,
      url: `${API_URL}/${post.permalink}.json`,
      data: {
        comment: comment && comment.id
      }
    })
    .then(data => data[1].data.children)

export const getPosts = (subreddit, after, nsfw) =>
  m
    .request({
      method: 'GET',
      url: `${API_URL}/r/${subreddit}.json?limit=${REQUEST_NUM}&after=${after}`,
      background: true
    })
    .then(data =>
      data.data.children
        .filter(post => nsfw || !post.data.over_18)
        .map(post => detectPostType(post.data))
    )

// the base list of attributes to copy
const baseAttrs = ['name', 'permalink', 'subreddit', 'score', 'num_comments', 'title']

// array of post types, how to match, and how to display them
const postTypes = [
  { type: 'Video', match: /\.(webm|mp4)$/i },
  {
    type: 'Video',
    match: /imgur.+\.(gif|gifv)$/i,
    parse: function(url) {
      return url.replace(/\.[^.]+$/, '.mp4')
    }
  },
  {
    type: 'Video',
    postParse: true,
    match: post => post.post_hint === 'hosted:video',
    parse: (post, res) => {
      const url = post.media.reddit_video.fallback_url
      res.sound = url
        .split('/')
        .slice(0, -1)
        .concat('audio')
        .join('/')
      return url
    }
  },
  {
    type: 'Image',
    match: /reddituploads/i,
    strip: false,
    parse: function(url) {
      return url.replace(/&amp;/gi, '&')
    }
  },
  { type: 'Image', match: /\.(jpg|png|gif)$/i },
  {
    type: 'Image',
    match: /imgur\.com\/[a-z0-9]+$/i,
    parse: function(url) {
      return `http://i.imgur.com/${url.match(/([^/]+)$/)[0]}.gif`
    }
  },
  {
    type: 'Embed',
    desc: 'Imgur Gallery',
    match: /imgur\.com\/(a|gallery)\/[a-z0-9]+$/i,
    parse: function(url) {
      return (
        url.replace(/\/gallery\//, '/a/').replace(/^http:/, 'https:') +
        '/embed?pub=true&analytics=false'
      )
    }
  },
  {
    type: 'Video',
    match: /gfycat\.com\/[a-z0-9]+$/i,
    strip: true,
    postParse: true,
    parse: post => post.preview.reddit_video_preview.fallback_url
  },
  {
    type: 'Self',
    match: function(post) {
      return post.is_self
    },
    fields: ['author', 'selftext_html']
  },
  {
    type: 'Link',
    match: function() {
      return true
    },
    fields: ['author', 'thumbnail']
  }
]

// iterates through post types looking for a match for the given url
const detectPostType = function(post) {
  const url = post.url.replace(/[?#].*$/, '')
  const npost = {}
  postTypes.some(type => {
    if (typeof type.match === 'function' ? type.match(post) : type.match.test(url)) {
      baseAttrs.concat(type.fields || []).forEach(field => (npost[field] = post[field]))
      ;['type', 'parseAsync', 'desc'].forEach(field => (npost[field] = type[field]))
      npost.url = type.parse
        ? type.parse(type.postParse ? post : type.strip === false ? post.url : url, npost)
        : type.strip
        ? url
        : post.url
      return true
    }
  })
  return npost
}
