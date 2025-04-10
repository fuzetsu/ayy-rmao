import { z, m } from '@/vdom'
import { COMMENT_LOAD_NUM } from '@/constants'
import { state } from '@/index'
import { pluralize } from '@/lib/util'
import { loadingImg } from '@/lib/view-util'
import { getMoreComments } from '@/lib/api'

const LoadMoreComments = () => {
  let loading = false
  return {
    view({ attrs: { parentArray, moreComments: mc } }) {
      if (loading) return m('div' + z`ta center`, loadingImg())
      const count = mc.children && mc.children.length
      // don't show button if no comments to load...
      if (count <= 0) return ''
      return m(
        'a.load-more-comments[href=#]' + z`d inline-block;mt 5`,
        {
          onclick: e => {
            e.preventDefault()
            loading = true
            const childrenToLoad = mc.children.splice(0, COMMENT_LOAD_NUM)
            getMoreComments(state.openPost.name, childrenToLoad).then(data => {
              m.redraw()
              loading = false
              if (!data.length) return
              console.log('more comments => ', data)
              // detach load more button
              let loadMoreButton
              parentArray.some((c, idx) => {
                if (c.kind === 'more' && c.data.id === mc.id) {
                  loadMoreButton = parentArray.splice(idx, 1)[0]
                  return true
                }
              })
              // add in new comments
              const lastCommentAtDepth = {}
              data.forEach(cmt => {
                if (cmt.data.depth === mc.depth) {
                  parentArray.push(cmt)
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
                parentArray.push(loadMoreButton)
              }
            })
          }
        },
        'Load ',
        count > COMMENT_LOAD_NUM ? [COMMENT_LOAD_NUM, ' (of ', count, ')'] : count,
        ' more ',
        pluralize('comment', count),
        '.'
      )
    }
  }
}

export default LoadMoreComments
