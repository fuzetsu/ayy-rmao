import { m } from '@/vdom'
import { state } from '@/index'
import PostPreview from './post-preview'

const PostList = {
  view: ({ attrs: { posts } }) =>
    m(
      '.post-list',
      posts.length > 0 && posts.slice(0, state.limit).map(post => m(PostPreview, { post: post }))
    )
}

export default PostList
