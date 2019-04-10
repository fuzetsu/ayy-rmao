/* globals _ */
import { m, b } from '../ext-deps.js'
import { processRedditHtml, prettyTime, anim } from '../util.js'
import { postCommentRefresh, postCommentRefreshContent, fixComment } from '../styles.js'

import { getComments } from '../api.js'
import { API_URL } from '../constants.js'
import { state } from '../index.js'

import LoadMoreComments from './load-more-comments.js'

const PostComment = ({ attrs: { comment } }) => {
  let isRefreshing = false
  let refreshIndDom
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
      if (refreshIndDom) {
        // reset refreshing after animation ends
        anim(
          refreshIndDom,
          () => {
            isRefreshing = false
            m.redraw()
          },
          'iteration'
        )
      }
      if (!newCmt || !newCmt.data) return
      // normalize comment depth (will always start from 0 so set based on current depth)
      setDepth(newCmt.data, cmt.depth)
      _.mergeWith(cmt, newCmt.data, (o, i, key) => (key === 'collapsed' ? o : i))
      m.redraw()
    })
  }
  const getAuthorStyle = cmt =>
    cmt.is_submitter
      ? b`content '[OP]'; c var(--op-color)`
      : cmt.distinguished === 'moderator'
      ? b`content '[MOD]'; c var(--mod-color)`
      : cmt.distinguished === 'admin'
      ? b`content '[ADMIN]'; c var(--admin-color)`
      : null
  return {
    view: ({ attrs: { comment: cmt } }) => {
      const createdAt = new Date(cmt.created_utc * 1000)
      const editedAt = cmt.edited && new Date(cmt.edited * 1000)
      const borderColor = state.borders[cmt.depth % state.borders.length]
      return m(
        'div.post-comment' +
          b`p 0 0 0 17; border-left 3px solid ${borderColor}`.$nest(':not(:last-child)', 'mb 20'),
        [
          m('div.post-comment-info' + b`fs 90%;mb 5`, [
            m(
              'strong.post-comment-collapse' + b`ff monospace; cursor pointer; user-select none`,
              {
                onclick: () => (cmt.collapsed = !cmt.collapsed)
              },
              '[',
              cmt.collapsed ? '+' : '-',
              '] '
            ),
            m(
              'a[target=_blank].post-comment-author' +
                b`c var(--author-color)`.$nest(
                  ':after',
                  `
                    ff monospace
                    position relative
                    t -1; ml 3; c black
                    ${getAuthorStyle(cmt)}
                  `
                ),
              {
                href: `${API_URL}/u/${cmt.author}`
              },
              cmt.author
            ),
            sep(),
            cmt.score_hidden
              ? m('em' + b`c var(--score-hidden-color)`, 'Score Hidden')
              : m(
                  'span.score' + b`fw bold;c var(--${cmt.score >= 1 ? 'good' : 'bad'}-score-color)`,
                  cmt.score
                ),
            sep(),
            m(
              'span' + b`c var(--score-hidden-color)`,
              prettyTime(createdAt) || createdAt.toLocaleString(),
              editedAt ? [sep(), ' edited ', prettyTime(editedAt) || editedAt.toLocaleString()] : ''
            ),
            sep(),
            m('a[target=_blank]', { href: API_URL + cmt.permalink }, 'permalink'),
            sep(),
            m(
              'span.post-comment-refresh[title=Refresh Comment Thread]' + postCommentRefresh,
              {
                onclick: () => refreshComment(cmt)
              },
              m(
                'span' + postCommentRefreshContent,
                {
                  oncreate: ({ dom }) => (refreshIndDom = dom),
                  class: isRefreshing ? b.spinAnimation : ''
                },
                '⟳'
              )
            )
          ]),
          m(
            'div',
            {
              hidden: cmt.collapsed
            },
            [
              m('div.post-comment-text' + fixComment, commentHtml),
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
            ]
          )
        ]
      )
    }
  }
}

export default PostComment
