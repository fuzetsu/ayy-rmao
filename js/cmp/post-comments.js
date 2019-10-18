import { m, z } from '../ext-deps.js'

import { getComments } from '../api.js'
import { loadingImg } from '../view-util.js'

import Modal from './modal.js'
import PostInfo from './post-info.js'
import PostComment from './post-comment.js'
import LoadMoreComments from './load-more-comments.js'
import PostPreview from './post-preview.js'
import { state } from '../index.js'
import { setOpen } from '../actions.js'
import { SortingOptions } from '../util.js'

const PostComments = ({ attrs: { post } }) => {
  let comments = []
  let loading = true

  // load comments
  const loadComments = sort => {
      getComments(post, null, sort).then(data => {
      comments = data
      loading = false
      m.redraw()
    })
  }

  loadComments('new')

  return {
    view: () =>
      loading
        ? m('div' + z`ta center`, loadingImg())
        : m('div.post-comments' + z`ta left`, [
            m('div' + z`ta right`, [
              'Sort by ',
              m('select',
                {
                  onchange: e => loadComments(e.target.value)
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
