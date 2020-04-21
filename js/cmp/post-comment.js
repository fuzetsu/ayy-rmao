import { m, z } from '../ext-deps.js'
import { processRedditHtml, prettyTime, reduceCount } from '../util.js'
import { externalLink } from '../view-util.js'

import { getComments } from '../api.js'
import { API_URL } from '../constants.js'
import { state } from '../index.js'

import LoadMoreComments from './load-more-comments.js'

const commentContents = z`
  word-break break-word
  blockquote {
    pl 8
    bl 4px solid #a2a2a2
    m 4 0 4 8
  }
  blockquote:last-child { mb 0 }
  p { margin 0.75em 0 }
  pre { white-space pre-wrap }
`

const PostComment = ({ attrs: { comment } }) => {
  let isRefreshing = false
  // cache comment html for performance
  const commentHtml = m.trust(processRedditHtml(comment.body_html))
  const setDepth = (comment, depth) => {
    if (!comment) return
    comment.depth = depth
    if (comment.replies) comment.replies.data.children.map(c => setDepth(c.data, depth + 1))
  }
  const sep = () => m.trust(' &#x2022; ')
  const refreshComment = cmt => {
    isRefreshing = true
    getComments(state.openPost, cmt).then(([newCmt]) => {
      isRefreshing = false
      if (newCmt && newCmt.data) {
        // normalize comment depth (will always start from 0 so set based on current depth)
        setDepth(newCmt.data, cmt.depth)
        Object.assign(cmt, newCmt.data)
      }
      m.redraw()
    })
  }
  const getAuthorStyle = cmt =>
    cmt.is_submitter
      ? `content '[OP]'; c $op-color`
      : cmt.distinguished === 'moderator'
      ? `content '[MOD]'; c $mod-color`
      : cmt.distinguished === 'admin'
      ? `content '[ADMIN]'; c $admin-color`
      : ''
  return {
    view: ({ attrs: { comment: cmt } }) => {
      const createdAt = new Date(cmt.created_utc * 1000)
      const editedAt = cmt.edited && new Date(cmt.edited * 1000)
      const borderColor = state.borders[cmt.depth % state.borders.length]
      return m(
        'div.post-comment' +
          z`pl 17; border-left 3px solid ${borderColor}; :not(:last-child) { mb 20 }`,
        [
          m('div.post-comment-info' + z`fs 90%;mb 5`, [
            m(
              'strong.post-comment-collapse' + z`ff monospace; cursor pointer; user-select none`,
              { onclick: () => (cmt.collapsed = !cmt.collapsed) },
              '[',
              cmt.collapsed ? '+' : '-',
              '] '
            ),
            m(
              externalLink +
                '.post-comment-author' +
                z`
                c $author-color
                :after {
                  ff monospace
                  position relative
                  t -1; ml 3; c black
                  ${getAuthorStyle(cmt)}
                }
              `,
              { href: `${API_URL}/u/${cmt.author}` },
              cmt.author
            ),
            sep(),
            cmt.score_hidden
              ? m('em' + z`c $score-hidden-color`, 'Score Hidden')
              : m(
                  'span.score' + z`fw bold;c $${cmt.score >= 1 ? 'good' : 'bad'}-score-color`,
                  reduceCount(cmt.score)
                ),
            sep(),
            m(
              'span' + z`c $score-hidden-color)`,
              prettyTime(createdAt) || createdAt.toLocaleString(),
              editedAt ? [sep(), ' edited ', prettyTime(editedAt) || editedAt.toLocaleString()] : ''
            ),
            sep(),
            m(externalLink, { href: API_URL + cmt.permalink }, 'permalink'),
            sep(),
            m(
              'a.refresh-comment' +
                z`cursor pointer` +
                z(isRefreshing && 'color $score-hidden-color'),
              { onclick: () => !isRefreshing && refreshComment(cmt) },
              'refresh'
            )
          ]),
          m('div', { hidden: cmt.collapsed }, [
            m(
              'div.post-comment-text' + commentContents,
              {
                onmousedown: e => {
                  if (
                    e.which === 1 &&
                    e.target.pathname &&
                    e.target.pathname.startsWith('/r/') &&
                    !e.target.pathname.includes('/comments/')
                  ) {
                    window.open(location.pathname + '#!' + e.target.pathname)
                    return false
                  }
                }
              },
              commentHtml
            ),
            cmt.replies
              ? m(
                  'div.post-comment-replies',
                  cmt.replies.data.children.map((c, _, arr) => {
                    if (c.kind === 'more')
                      return m(LoadMoreComments, { parentArray: arr, moreComments: c.data })
                    return m(PostComment, { comment: c.data })
                  })
                )
              : ''
          ])
        ]
      )
    }
  }
}

export default PostComment
