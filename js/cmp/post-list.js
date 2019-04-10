import { m, b } from '../ext-deps.js'
import { state } from '../index.js'
import PostPreview from './post-preview.js'

const PostList = {
  view(vnode) {
    const posts = vnode.attrs.posts
      .slice(0, state.limit)
      .map(post => m(PostPreview, { post: post }))
    return m(
      '.post-list',
      posts.length > 0
        ? posts
        : m('p' + b`fs var(--small-text)`, vnode.attrs.message || 'Nothing here...')
    )
  }
}

export default PostList
