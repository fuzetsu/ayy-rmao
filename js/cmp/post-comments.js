import { m, b } from '../ext-deps.js'

import { getComments } from '../api.js'
import { state } from '../index.js'
import { loadingImg } from '../view-util.js'

import Modal from './modal.js'
import PostInfo from './post-info.js'
import PostComment from './post-comment.js'
import LoadMoreComments from './load-more-comments.js'
import PostPreview from './post-preview.js'

const PostComments = ({ attrs: { post } }) => {
  let comments = []
  let loading = true
  // load comments
  getComments(post).then(data => {
    comments = data
    loading = false
    m.redraw()
  })
  return {
    view: () =>
      loading
        ? m('div' + b`ta center`, loadingImg())
        : m('div.post-comments' + b`ta left`, [
            m(
              'div.post-comments-list',
              comments.length < 1
                ? m('div' + b`ta center`, 'No comments yet...')
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
  onclose: () => (state.openPost = null),
  view() {
    const post = state.openPost
    return m(Modal, {
      onclose: this.onclose,
      header: m('div' + b`ta center`, m(PostInfo, { post, readOnly: true })),
      content: [
        m('div' + b`ta center`, m(PostPreview, { post, showInfo: false })),
        m(PostComments, { post })
      ]
    })
  }
}
