import { m, b } from '../ext-deps.js'
import { pluralize } from '../util.js'
import { API_URL } from '../constants.js'
import { state } from '../index.js'

const PostInfo = {
  view: ({ attrs: { post, readOnly = false } }) =>
    m('div', [
      m('.post-title' + b`font-style italic;fw bold;mb 5`, [
        m(
          'a[target=_blank]' + b`c inherit`,
          {
            href: API_URL + post.permalink,
            title: post.subreddit,
            onclick: function(e) {
              if (e.ctrlKey || readOnly) return
              e.preventDefault()
              state.openPost = post
            }
          },
          m.trust(post.title)
        )
      ]),
      m('.post-info' + b`mb 5`.$nest('span', 'fw bold'), [
        m('span' + b`c var(--${post.score > 0 ? 'good-score' : 'bad-score'}-color)`, post.score),
        ' ',
        pluralize('point', post.score),
        ' and ',
        m('span' + b`c rgb(0, 167, 228)`, post.num_comments),
        ' comments on ',
        m('span', [
          m(
            'a' + b`c #ff5b5b`,
            {
              href: `#subreddit is ${post.subreddit} and nsfw is ${
                state.nsfw ? 'enabled' : 'disabled'
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

export default PostInfo
