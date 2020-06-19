import { state } from '../index.js'
import PostPreview from './post-preview.js'

const PostList = {
  view: ({ attrs: { posts } }) =>
    m(
      '.post-list',
      posts.length > 0 && posts.slice(0, state.limit).map(post => m(PostPreview, { post: post }))
    )
}

export default PostList
