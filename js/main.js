/*global location,localStorage,_ */
import m from 'https://unpkg.com/mithril@next/mithril.mjs'
import 'https://unpkg.com/lodash'

const app = {}

const API_URL = 'https://www.reddit.com'

const IMAGES = {
  loading: 'img/loading.gif'
}

const UNICODE = { sun: '\u{1F31E}', moon: '\u{1F31D}' }

const CSS = {
  day: `
.window {
  color: #333;
  background: #EAEBEB;
}

.modal {
  background: #f7f7f7;
}

.post-comment-info {
  color: #666;
}

.score-hidden {
  color: #999;
}

.score {
  font-weight: Bold;
}

.post-comment-text a,.self-post-content a,.link {
  color: #1b3e92;
}

.post-comment-author {
  color: #215854;
}

.post-comment-special:after {
  color: black;
}

.post-comment-op {
  color: #1a1abd;
}

.post-comment-mod {
  color: #109610;
}

.post-comment-admin {
  color: red;
}

.self-post {
  box-shadow: 0 2px 2px 0 rgba(0,0,0,0.14), 0 3px 1px -2px rgba(0,0,0,0.12), 0 1px 5px 0 rgba(0,0,0,0.2);
  border-radius: 5px;
  background: white;
}

.loading {
  filter: invert(70%);
}

@media only screen and (min-device-width: 900px) {
  ::-webkit-scrollbar-track {
    background: #eee;
  }

  ::-webkit-scrollbar-thumb {
    background: #ccc;
  }
}
    `
}

const BORDERS = {
  day: [
    'rgb(226, 26, 25)',
    'rgb(243, 146, 51)',
    'rgb(249, 231, 49)',
    'rgb(84, 166, 76)',
    'rgb(54, 141, 238)'
  ],
  night: [
    'rgb(226, 26, 25)',
    'rgb(243, 146, 51)',
    'rgb(249, 231, 49)',
    'rgb(84, 166, 76)',
    'rgb(54, 141, 238)'
  ]
}

// UTIL

const util = {
  id: function(id) {
    return document.getElementById(id)
  },
  titleCase: function(str) {
    return str.replace(/([a-z]+)/gi, function(match) {
      return match.charAt(0).toUpperCase() + match.slice(1)
    })
  },
  htmlDecode: function(input) {
    const e = document.createElement('div')
    e.innerHTML = input
    return e.childNodes.length === 0 ? '' : e.childNodes[0].nodeValue
  },
  processRedditHtml(html) {
    return util.htmlDecode(html).replace(/<a/gi, '<a target="_blank"')
  },
  throttle: function(limit, callback) {
    var wait = false
    return function(...args) {
      if (!wait) {
        callback(...args)
        wait = true
        setTimeout(function() {
          wait = false
        }, limit)
      }
    }
  },
  withAttrNoRedraw: function(attr, func) {
    return e => {
      e.redraw = false
      func(e.target[attr])
    }
  },
  storeSet: function(key, val) {
    localStorage[key] = JSON.stringify(val)
  },
  storeGet: function(key) {
    const val = localStorage[key]
    if (!val || val === 'undefined') return
    return JSON.parse(val)
  },
  pluralize: function(word, count) {
    return count !== 1 ? word + 's' : word
  },
  prettyTime(d) {
    // This function was copied, and slightly adapted from John Resig's website: https://johnresig.com/files/pretty.js
    const date = new Date(d)
    const diff = (Date.now() - date.getTime()) / 1000
    const day_diff = Math.floor(diff / 86400)

    if (isNaN(day_diff) || day_diff < 0 || day_diff >= 31) return

    return (
      (day_diff == 0 &&
        ((diff < 60 && 'just now') ||
          (diff < 120 && '1 minute ago') ||
          (diff < 3600 && Math.floor(diff / 60) + ' minutes ago') ||
          (diff < 7200 && '1 hour ago') ||
          (diff < 86400 && Math.floor(diff / 3600) + ' hours ago'))) ||
      (day_diff == 1 && 'Yesterday') ||
      (day_diff < 7 && day_diff + ' days ago') ||
      (day_diff < 31 && Math.ceil(day_diff / 7) + ' weeks ago')
    )
  }
}

// common actions
const ex = {
  toggleExpand: function(type, e) {
    const target = e.target
    const titled = util.titleCase(type)
    const style = target.style
    const viewport = window['inner' + titled]
    const orig = target['natural' + titled] || target['video' + titled] || ''
    const cur = target['client' + titled]
    let dim = style[type]
    if (!dim && (orig === cur || orig * 0.8 <= cur)) {
      dim = orig + ''
    }
    if (dim) {
      if (dim.includes(orig) && orig <= viewport * 0.99) {
        style[type] = orig * 1.75 + 'px'
        style.maxHeight = 'none'
      } else {
        style[type] = ''
        style.maxHeight = ''
      }
    } else {
      style[type] = orig + 'px'
      style.maxHeight = 'none'
    }
  }
}

// MODELS
class Post {
  constructor() {}
  static list(subreddit, after, nsfw) {
    return m
      .request({
        method: 'GET',
        url: `${API_URL}/r/${subreddit}.json?limit=${app.const.REQUEST_NUM}&after=${after}`,
        background: true
      })
      .then(function(data) {
        return data.data.children
          .filter(
            post => (nsfw || !post.data.over_18) && !app.state.viewed.includes(post.data.name)
          )
          .map(post => {
            app.state.viewed.push(post.data.name)
            return detectPostType(post.data)
          })
      })
  }
}

class Comments {
  constructor() {}
  static list(post, comment) {
    const link = post.permalink.slice(-1) === '/' ? post.permalink.slice(0, -1) : post.permalink
    return m
      .request({
        method: 'GET',
        url: API_URL + link + '.json',
        background: true,
        data: {
          comment: comment && comment.id
        }
      })
      .then(function(data) {
        return data[1].data.children
      })
  }
  static setDepth(comment, depth) {
    if (!comment) return
    comment.depth = depth
    if (comment.replies)
      comment.replies.data.children.map(c => Comments.setDepth(c.data, depth + 1))
  }
}

// COMPONENTS

// container for post layouts
const pl = {}

pl.Video = {
  play: e => e.target.play(),
  pause: e => e.target.pause(),
  toggleExpand: ex.toggleExpand.bind(null, 'height'),
  view(vnode) {
    const post = vnode.attrs.post
    return m('.video-post', [
      m(
        'video.video[loop][preload=metadata]',
        { onmouseenter: this.play, onmouseleave: this.pause, onclick: this.toggleExpand },
        [m('source[type=video/mp4]', { src: post.url })]
      )
    ])
  }
}

pl.RedditVideo = {
  ...pl.Video,
  oninit({ attrs: { post } }) {
    const parts = post.url.split('/')
    parts.pop()
    parts.push('audio')
    const sound = new Audio(parts.join('/'))
    sound.loop = true
    sound.volume = 0.5
    let ready = false
    sound.oncanplay = () => (ready = true)
    this.play = ({ target: vid }) => {
      sound.currentTime = vid.currentTime
      vid.play()
      if (ready) sound.play()
    }
    this.pause = ({ target: vid }) => {
      vid.pause()
      if (ready) sound.pause()
    }
  }
}

pl.Image = {
  toggleExpand: ex.toggleExpand.bind(null, 'width'),
  view(vnode) {
    const post = vnode.attrs.post
    return m('.image-post', [m('img', { src: post.url, onclick: this.toggleExpand })])
  }
}

pl.Embed = {
  oninit() {
    this.loaded = false
  },
  view(vnode) {
    const post = vnode.attrs.post
    let url = post.url
    if (location.protocol === 'https:') {
      url = url.replace(/^.+:/, location.protocol)
    }
    return m('.embed-post', [
      this.loaded
        ? m('iframe.embed[frameborder=0]', { src: url })
        : m(
            'button.load-embed',
            { onclick: () => (this.loaded = true) },
            'Load ' + (post.desc || 'Embedded Content')
          )
    ])
  }
}

pl.Self = {
  oninit(vnode) {
    const post = vnode.attrs.post
    this.selfTextHtml = post.selftext_html && m.trust(util.processRedditHtml(post.selftext_html))
  },
  view(vnode) {
    const post = vnode.attrs.post
    return m('.self-post', [
      m(
        '.self-post-username',
        m('a[target=_blank].link', { href: `${API_URL}/u/${post.author}` }, post.author),
        ' says: '
      ),
      m('.self-post-content', this.selfTextHtml || post.title)
    ])
  }
}

pl.Link = {
  view(vnode) {
    const post = vnode.attrs.post
    return m('.link-post.self-post', [
      m(
        '.self-post-username',
        m('a[target=_blank].link', { href: `${API_URL}/u/${post.author}` }, post.author),
        ' says: '
      ),
      m('.self-post-content.center', [
        m('a[target=_blank]', { href: post.url }, post.url),
        post.thumbnail.indexOf('http') === 0 ? [m('br'), m('img', { src: post.thumbnail })] : ''
      ])
    ])
  }
}

pl.Loading = {
  oninit(vnode) {
    const args = vnode.attrs
    if (args.post && args.post.parseAsync) {
      args.post.parseAsync(args.post.url, args.post).then(function(url) {
        args.post.parseAsync = null
        args.post.url = url
        m.redraw()
      })
    }
  },
  view() {
    return m('div', [m('img.loading', { src: IMAGES.loading })])
  }
}

// the base list of attributes to copy
const baseAttrs = ['name', 'permalink', 'subreddit', 'score', 'num_comments', 'title']

// array of post types, how to match, and how to display them
var postTypes = [
  { type: 'Video', match: /\.(webm|mp4)$/i },
  {
    type: 'Video',
    match: /imgur.+\.(gif|gifv)$/i,
    parse: function(url) {
      return url.replace(/\.[^.]+$/, '.mp4')
    }
  },
  {
    type: 'RedditVideo',
    postParse: true,
    match: post => post.post_hint === 'hosted:video',
    parse: post => {
      return post.media.reddit_video.fallback_url
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
        ? type.parse(type.postParse ? post : type.strip === false ? post.url : url)
        : type.strip
        ? url
        : post.url
      return true
    }
  })
  return npost
}

const ScoreIndicator = {
  isGoodScore(score) {
    if (score >= 500) return 'super-good'
    if (score >= 20) return 'real-good'
    if (score >= 1) return 'kinda-good'
    if (score >= -5) return 'bad'
    if (score >= -20) return 'real-bad'
    return 'super-bad'
  },
  view(vnode) {
    return m(
      'span.score',
      {
        class: this.isGoodScore(vnode.attrs.score)
      },
      vnode.attrs.score
    )
  }
}

const PostInfo = {
  view(vnode) {
    const post = vnode.attrs.post
    return m('div', [
      m('.title', [
        m(
          'a[target=_blank]',
          {
            href: API_URL + post.permalink,
            title: post.subreddit,
            onclick: function(e) {
              if (e.ctrlKey || vnode.attrs.readOnly) return
              e.preventDefault()
              app.state.openPost = post
            }
          },
          m.trust(post.title)
        )
      ]),
      m('.info', [
        m(ScoreIndicator, { score: post.score }),
        ' ',
        util.pluralize('point', post.score),
        ' and ',
        m('span.num-comments', post.num_comments),
        ' comments on ',
        m('span.sub-name', [
          m(
            'a',
            {
              href: `#subreddit is ${post.subreddit} and nsfw is ${
                app.state.nsfw ? 'enabled' : 'disabled'
              }`,
              onclick: e => {
                if (e.button === 0) setTimeout(() => location.reload(), 200)
              }
            },
            post.subreddit
          )
        ])
      ])
    ])
  }
}

const PostItem = {
  view(vnode) {
    var post = vnode.attrs.post
    var comp = pl[post.type]
    return m('.post', [
      !vnode.attrs.noInfo ? m(PostInfo, { post: post }) : '',
      post.parseAsync ? m(pl.Loading, { post: post }) : m(comp, { post: post })
    ])
  }
}

const PostList = {
  view(vnode) {
    const posts = vnode.attrs.posts
      .slice(0, app.state.limit)
      .map(post => m(PostItem, { post: post }))
    return m(
      '.post-list',
      posts.length > 0 ? posts : m('p.message', vnode.attrs.message || 'Nothing here...')
    )
  }
}

// let VotingButtons = {
//   view(vnode) {
//     let post = vnode.attrs.post
//     return m('div.vote-buttons', [
//       m('span.vote-up', {
//         class: post.upvoted ? 'active' : ''
//       }),
//       m('span.vote-down', {
//         class: post.downvoted ? 'active' : ''
//       })
//     ])
//   }
// }

const Modal = {
  view(vnode) {
    const args = vnode.attrs
    return m(
      'div.overlay',
      {
        onclick: e => {
          if (args.onclose && e.target.classList.contains('overlay')) {
            args.onclose()
          } else {
            e.redraw = false
          }
        }
      },
      m('div.modal', [
        m('div.modal-header', [
          m('div.modal-header-content', args.header),
          m('div.modal-header-actions', [
            m(
              'span.modal-close',
              {
                onclick: function() {
                  args.onclose && args.onclose()
                }
              },
              m.trust('&times;')
            )
          ])
        ]),
        m('div.modal-body', args.content)
      ])
    )
  }
}

const PostCommentsModal = {
  onclose: () => (app.state.openPost = null),
  view() {
    const post = app.state.openPost
    return m(Modal, {
      onclose: this.onclose,
      header: m('div.center', m(PostInfo, { post, readOnly: true })),
      content: m(PostComments, { post })
    })
  }
}

const PostComments = {
  oninit(vnode) {
    this.comments = []
    this.loading = true
    this.post = vnode.attrs.post
    // load comments
    Comments.list(this.post).then(data => {
      this.comments = data
      this.loading = false
      m.redraw()
    })
  },
  view() {
    if (this.loading) return m('div.center', m(pl.Loading, {}))
    return m('div.post-comments', [
      m('div.center', m(PostItem, { post: this.post, noInfo: true })),
      m(
        'div.post-comments-list',
        this.comments.map((c, idx, arr) => {
          if (c.kind === 'more')
            return m(LoadMoreComments, { parentArray: arr, moreComments: c.data })
          return m(PostComment, { comment: c.data })
        })
      )
    ])
  }
}

const LoadMoreComments = {
  loading: false,
  view(vnode) {
    if (this.loading) return m(pl.Loading, {})
    const args = vnode.attrs
    const mc = args.moreComments
    const count = mc.children && mc.children.length
    // dont show button if no comments to load...
    if (count <= 0) return ''
    return m(
      'a.link.btn-load-more-comments[href=#]',
      {
        onclick: e => {
          e.preventDefault()
          this.loading = true
          const childrenToLoad = mc.children.splice(0, app.const.COMMENT_LOAD_NUM)
          m.request({
            method: 'GET',
            url: API_URL + '/api/morechildren.json',
            data: {
              api_type: 'json',
              children: childrenToLoad.join(','),
              link_id: app.state.openPost.name
            }
          }).then(
            data => {
              this.loading = false
              console.log('more comments => ', data)
              if (
                !data ||
                !data.json ||
                !data.json.data ||
                !data.json.data.things ||
                data.json.data.things.length <= 0
              ) {
                console.log(
                  'didnt get more comments to load :(',
                  data && data.json && data.json.errors
                )
                return
              }
              // detach load more button
              let loadMoreButton
              args.parentArray.some((c, idx) => {
                if (c.kind === 'more' && c.data.id === mc.id) {
                  loadMoreButton = args.parentArray.splice(idx, 1)[0]
                  return true
                }
              })
              // add in new comments
              const lastCommentAtDepth = {}
              data.json.data.things.forEach(cmt => {
                if (cmt.data.depth === mc.depth) {
                  args.parentArray.push(cmt)
                } else {
                  const parentComment = lastCommentAtDepth[cmt.data.depth - 1]
                  if (!parentComment) return
                  parentComment.data.replies = parentComment.data.replies || {
                    kind: 'Listing',
                    data: {
                      children: []
                    }
                  }
                  parentComment.data.replies.data.children.push(cmt)
                }
                lastCommentAtDepth[cmt.data.depth] = cmt
              })
              // re-add load more button if necessary
              if (mc.children.length > 0 && loadMoreButton) {
                args.parentArray.push(loadMoreButton)
              }
            },
            err => console.log(err)
          )
        }
      },
      'Load ',
      count > app.const.COMMENT_LOAD_NUM
        ? [app.const.COMMENT_LOAD_NUM, ' (of ', count, ')']
        : count,
      ' more ',
      util.pluralize('comment', count),
      '.'
    )
  }
}

const PostComment = {
  oninit(vnode) {
    const cmt = vnode.attrs.comment
    // cache comment html for performance
    this.commentHtml = m.trust(util.processRedditHtml(cmt.body_html))
  },
  sep: () => m.trust(' &#x2022; '),
  view(vnode) {
    const cmt = vnode.attrs.comment
    const createdAt = new Date(cmt.created_utc * 1000)
    const editedAt = cmt.edited && new Date(cmt.edited * 1000)
    const borderColor = app.state.borders[cmt.depth % app.state.borders.length]
    const cmtClasses = [
      cmt.is_submitter ? 'post-comment-op' : '',
      cmt.distinguished === 'moderator' ? 'post-comment-mod' : '',
      cmt.distinguished === 'admin' ? 'post-comment-admin' : ''
    ]
      .join(' ')
      .trim()
    return m(
      'div.post-comment',
      {
        style: `border-left-color: ${borderColor};`
      },
      [
        m('div.post-comment-info', [
          //m(VotingButtons, { post: cmt }),
          m(
            'strong.post-comment-collapse',
            {
              onclick: () => (cmt.collapsed = !cmt.collapsed)
            },
            '[',
            cmt.collapsed ? '+' : '-',
            '] '
          ),
          m(
            'a[target=_blank].post-comment-author',
            {
              class: cmtClasses ? 'post-comment-special ' + cmtClasses : '',
              href: `${API_URL}/u/${cmt.author}`
            },
            cmt.author
          ),
          this.sep(),
          cmt.score_hidden
            ? m('em.score-hidden', 'Score Hidden')
            : m(ScoreIndicator, { score: cmt.score }),
          this.sep(),
          util.prettyTime(createdAt) || createdAt.toLocaleString(),
          editedAt
            ? [this.sep(), ' edited ', util.prettyTime(editedAt) || editedAt.toLocaleString()]
            : '',
          this.sep(),
          m('a[target=_blank].link', { href: API_URL + cmt.permalink }, 'permalink'),
          this.sep(),
          m(
            'span.post-comment-refresh[title=Refresh Comment Thread]',
            {
              onclick: e => {
                e.redraw = false
                Comments.list(app.state.openPost, cmt).then(data => {
                  const newCmt = data[0]
                  if (!newCmt || !newCmt.data) return
                  // normalize comment depth (will always start from 0 so set based on current depth)
                  Comments.setDepth(newCmt.data, cmt.depth)
                  _.mergeWith(cmt, newCmt.data, (o, i, key) => (key === 'collapsed' ? o : i))
                  m.redraw()
                })
              }
            },
            '⟳'
          )
        ]),
        m(
          'div',
          {
            hidden: cmt.collapsed
          },
          [
            m('div.post-comment-text', this.commentHtml),
            cmt.replies
              ? m(
                  'div.post-comment-replies',
                  cmt.replies.data.children.map((c, idx, arr) => {
                    if (c.kind === 'more')
                      return m(LoadMoreComments, { parentArray: arr, moreComments: c.data })
                    return m(PostComment, { comment: c.data })
                  })
                )
              : ''
          ]
        )
      ]
    )
  }
}

// GLOBAL EVENTS
window.addEventListener('keydown', e => {
  if (e.code === 'KeyN' && e.target.nodeName !== 'INPUT') {
    e.preventDefault()
    app.state.dayMode = !app.state.dayMode
    m.redraw()
  }
})

window.addEventListener('hashchange', () => {
  if (!app.state.changingHash) {
    location.reload()
    // m.mount(app.mountElem, null);
    // m.mount(app.mountElem, app);
  } else {
    app.state.changingHash = false
  }
})

// APP

app.const = {
  FIRST_LOAD_NUM: 7,
  LOAD_NUM: 3,
  ADD_MORE_THRESHOLD: 10,
  COMMENT_LOAD_NUM: 50,
  REQUEST_NUM: 25,
  FKEY: 'ayy-rmao-filter',
  THEME_KEY: 'day-mode'
}

app.state = {
  limit: 3,
  viewed: [],
  changingHash: false,
  subreddit: '',
  nsfw: false,
  filter: util.storeGet(app.const.FKEY) || '',
  dayMode: util.storeGet(app.const.THEME_KEY) === 'true'
}

const AyyRmao = {
  oninit() {
    this.loading = false
    this.atPageTop = true
    this.posts = []
    app.state.borders = app.state.dayMode ? BORDERS.day : BORDERS.night
    // read hash and load posts if appropriate
    if (this.readState()) {
      this.loadPosts()
    }
  },
  somethingChanged() {
    const c = app.state
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
      Post.list(this.subreddit, after, this.nsfw)
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
    const c = app.state
    c.subreddit = this.subreddit
    c.nsfw = this.nsfw
    c.filter = this.filter
  },
  resetPosts() {
    this.posts = []
    this.syncWithAppState()
    const c = app.state
    c.viewed.length = 0
    c.limit = app.const.FIRST_LOAD_NUM
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
        util.storeSet(app.const.FKEY, state.filter)
        this.filter = state.filter
      }
      return true
    }
    return false
  },
  writeState() {
    this.syncWithAppState()
    util.storeSet(app.const.FKEY, this.filter)
    this.setHash(
      'subreddit is ' +
        this.subreddit +
        (this.filter ? ' and filter is ' + this.filter : '') +
        ' and nsfw is ' +
        (this.nsfw ? 'enabled' : 'disabled')
    )
  },
  setHash(hash) {
    clearInterval(app.state.timeoutId)
    app.state.changingHash = true
    location.hash = hash
    app.state.timeoutId = setTimeout(() => (app.state.changingHash = false), 500)
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
      app.state.limit += app.const.LOAD_NUM
    } else {
      if (wasAtPageTop === this.atPageTop) e.redraw = false
    }
  },
  toggleTheme() {
    app.state.dayMode = !app.state.dayMode
    util.storeSet(app.const.THEME_KEY, app.state.dayMode)
    app.state.borders = app.state.dayMode ? BORDERS.day : BORDERS.night
  },
  view() {
    if (
      !this.loading &&
      this.posts.length > 0 &&
      this.posts.length <= app.state.limit + app.const.ADD_MORE_THRESHOLD &&
      app.state.limit !== this.lastLimit
    ) {
      this.loadPosts()
    }
    this.lastLimit = app.state.limit
    return m(
      'div.window',
      {
        onscroll: util.throttle(250, e => this.handleScroll(e)),
        class: app.state.openPost ? 'noscroll' : ''
      },
      [
        m('h1.header', 'Ayy Rmao'),
        m(
          'div.theme-changer',
          { onclick: () => this.toggleTheme(), class: this.atPageTop ? '' : 'show-on-hover' },
          app.state.dayMode ? UNICODE.sun : UNICODE.moon
        ),
        m('style', app.state.dayMode ? CSS.day : ''),
        m('form.sr-form', { onsubmit: e => this.handleSubmit(e) }, [
          m('input[type=text][placeholder=subreddit]', {
            onchange: util.withAttrNoRedraw('value', v => (this.subreddit = v)),
            value: this.subreddit,
            autofocus: !this.subreddit
          }),
          m('input[type=text][placeholder=filter]', {
            onchange: util.withAttrNoRedraw('value', v => (this.filter = v)),
            value: this.filter
          }),
          m('label', [
            m('input[type=checkbox]', {
              onclick: util.withAttrNoRedraw('checked', v => (this.nsfw = v)),
              checked: this.nsfw
            }),
            m('span', 'nsfw?')
          ]),
          m('button[type=submit].hidden')
        ]),
        app.state.openPost ? m(PostCommentsModal) : '',
        this.loading
          ? m(pl.Loading, {})
          : m(PostList, { posts: this.posts, message: this.getMessage() })
      ]
    )
  }
}

m.mount(util.id('app'), AyyRmao)
