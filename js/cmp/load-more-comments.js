import { m, b } from '../ext-deps.js'
import { COMMENT_LOAD_NUM, API_URL } from '../constants.js'
import { state } from '../index.js'
import { pluralize } from '../util.js'
import { loadingImg } from '../view-util.js';

const LoadMoreComments = () => {
  let loading = false
  return {
    view(vnode) {
      if (loading) return m('div' + b`ta center`, loadingImg())
      const args = vnode.attrs
      const mc = args.moreComments
      const count = mc.children && mc.children.length
      // dont show button if no comments to load...
      if (count <= 0) return ''
      return m(
        'a.load-more-comments[href=#]' + b`d inline-block;mt 5`,
        {
          onclick: e => {
            e.preventDefault()
            loading = true
            const childrenToLoad = mc.children.splice(0, COMMENT_LOAD_NUM)
            m.request({
              method: 'GET',
              url: API_URL + '/api/morechildren.json',
              data: {
                api_type: 'json',
                children: childrenToLoad.join(','),
                link_id: state.openPost.name
              }
            }).then(
              data => {
                loading = false
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
        count > COMMENT_LOAD_NUM ? [COMMENT_LOAD_NUM, ' (of ', count, ')'] : count,
        ' more ',
        pluralize('comment', count),
        '.'
      )
    }
  }
}

export default LoadMoreComments
