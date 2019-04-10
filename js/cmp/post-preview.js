import { toggleExpand, processRedditHtml } from '../util.js'
import { m, b } from '../ext-deps.js'
import { API_URL, IMAGES } from '../constants.js'
import PostInfo from './post-info.js'

const pl = {}

pl.Video = ({ attrs: { post } }) => {
  let audio = null
  let ready = true

  const syncAudio = (vid, pause = false) =>
    audio && ready && ((audio.currentTime = vid.currentTime), audio[pause ? 'pause' : 'play']())
  const play = ({ target: vid }) => (vid.play(), syncAudio(vid))
  const pause = ({ target: vid }) => (vid.pause(), syncAudio(vid, true))

  if (post.sound) {
    ready = false
    audio = Object.assign(new Audio(post.sound), {
      loop: true,
      value: 0.5,
      oncanplay: () => (ready = true)
    })
  }

  return {
    view: ({ attrs: { post } }) =>
      m('.video-post', [
        m(
          'video[loop][preload=metadata]' +
            b`cursor row-resize;fade 0.25;max-width 99%;max-height 95vh`.$hover`fade 1;z-index 50`,
          {
            onmouseenter: play,
            onmouseleave: pause,
            onclick: e => toggleExpand('height', e)
          },
          m('source[type=video/mp4]', { src: post.url })
        )
      ])
  }
}

pl.Image = {
  view: ({ attrs: { post } }) =>
    m(
      '.image-post',
      m('img' + b`cursor row-resize;max-width 99%;max-height 95vh`, {
        src: post.url,
        onclick: e => toggleExpand('width', e)
      })
    )
}

pl.Embed = () => {
  let loaded = false
  return {
    view: ({ attrs: { post } }) => {
      let src = post.url
      if (location.protocol === 'https:') {
        src = src.replace(/^.+:/, location.protocol)
      }
      return m('.embed-post', [
        loaded
          ? m('iframe[frameborder=0]' + b`h 90vh;w 90%`, { src })
          : m(
              'button.load-embed' + b`p 10 15;m 7 0`,
              { onclick: () => (loaded = true) },
              'Load ',
              post.desc || 'Embedded Content'
            )
      ])
    }
  }
}

const SelfPost = {
  view: ({ attrs: { post }, children }) =>
    m(
      '.self-post' +
        b`
        w 750
        max-width 80%
        ta left
        bc var(--bg-color-lighter)
        br 5
        word-wrap break-word
        m auto
      `,
      m(
        '.self-post-username' + b`fw bold;position relative;t 8;l 13`,
        m('a[target=_blank].link', { href: `${API_URL}/u/${post.author}` }, post.author),
        ' says: '
      ),
      m('.self-post-content' + b`p 20 30 30 30`, children)
    )
}

pl.Self = ({ attrs: { post } }) => {
  const selfTextHtml = post.selftext_html && m.trust(processRedditHtml(post.selftext_html))
  return {
    view: ({ attrs: { post } }) => m(SelfPost, { post }, selfTextHtml || post.title)
  }
}

pl.Link = {
  view: ({ attrs: { post } }) =>
    m(
      SelfPost,
      { post },
      m(
        'div' + b`ta center`,
        m('a[target=_blank]', { href: post.url }, post.url),
        post.thumbnail.indexOf('http') === 0 ? [m('br'), m('img', { src: post.thumbnail })] : ''
      )
    )
}

pl.Loading = {
  oninit(vnode) {
    const args = vnode.attrs
    if (args.post && args.post.parseAsync) {
      args.post.parseAsync(args.post.url, args.post).then(function(url) {
        args.post.parseAsync = null
        args.post.url = url
        m.redraw()
      })
    }
  },
  view() {
    return m('div.loading-post', m('img.loading', { src: IMAGES.loading }))
  }
}

const PostPreview = {
  view({ attrs: { post, showInfo = true } }) {
    const comp = pl[post.type]
    return m('.post-preview' + b`m 5 auto 40 auto`, [
      showInfo ? m(PostInfo, { post }) : '',
      post.parseAsync ? m(pl.Loading, { post }) : m(comp, { post })
    ])
  }
}

export default PostPreview
