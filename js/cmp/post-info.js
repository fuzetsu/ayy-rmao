import { m, z } from '../ext-deps.js'
import { pluralize } from '../util.js'
import { API_URL } from '../constants.js'
import { state } from '../index.js'

const PostInfo = {
  view: ({ attrs: { post, readOnly = false } }) =>
    m('div', [
      m('.post-title' + z`font-style italic;fw bold;mb 5`, [
        m(
          'a[target=_blank]' + z`c inherit`,
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
      m('.post-info' + z`mb 5; > span { fw bold }`, [
        m('span' + z`c var(--${post.score > 0 ? 'good-score' : 'bad-score'}-color)`, post.score),
        ' ',
        pluralize('point', post.score),
        ' and ',
        m('span' + z`c rgb(0, 167, 228)`, post.num_comments),
        ' comments on ',
        m('span', [
          m(
            'a' + z`c #ff5b5b`,
            { href: '/r/' + post.subreddit, oncreate: m.route.link },
            post.subreddit
          )
        ])
      ])
    ])
}

export default PostInfo
