import { z, m } from '/vdom'
import { getComments } from '/lib/api.js'
import { loadingImg } from '/lib/view-util.js'
import { state } from '/'
import { setOpen, setCommentSort } from '/actions'
import { SortingOptions } from '/constants'

import Modal from './modal.js'
import PostInfo from './post-info.js'
import PostComment from './post-comment.js'
import LoadMoreComments from './load-more-comments.js'
import PostPreview from './post-preview.js'

const PostComments = ({ attrs: { post } }) => {
  let comments = []
  let loading

  // load comments
  const loadComments = sort => {
    loading = true

    if (sort) setCommentSort(sort)
    else sort = state.commentSort

    getComments(post, null, sort).then(data => {
      comments = data
      loading = false
      m.redraw()
    })
  }

  loadComments()

  return {
    view: () =>
      loading
        ? m('div' + z`ta center`, loadingImg())
        : m('div.post-comments' + z`ta left;position relative`, [
            m('span' + z`position absolute;t 0;r 0`, [
              'Sort by ',
              m(
                'select',
                {
                  onchange: e => loadComments(e.target.value),
                  value: state.commentSort
                },
                SortingOptions.map(sortOption => m('option', sortOption))
              )
            ]),
            m(
              'div.post-comments-list',
              comments.length < 1
                ? m('div' + z`ta center`, 'No comments yet...')
                : comments.map((c, _idx, arr) => {
                    if (c.kind === 'more')
                      return m(LoadMoreComments, { parentArray: arr, moreComments: c.data })
                    return m(PostComment, { comment: c.data })
                  })
            )
          ])
  }
}
export default PostComments

export const PostCommentsModal = {
  onclose: () => setOpen(null),
  view() {
    const post = state.openPost
    return m(Modal, {
      onclose: this.onclose,
      header: m('div' + z`ta center`, m(PostInfo, { post, readOnly: true })),
      content: [
        m('div' + z`ta center`, m(PostPreview, { post, showInfo: false })),
        m(PostComments, { post })
      ]
    })
  }
}
