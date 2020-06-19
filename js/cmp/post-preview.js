import { toggleExpand, processRedditHtml } from '../util.js'
import { externalLink } from '../view-util.js'
import { z } from '../ext-deps.js'
import { API_URL, IMAGES } from '../constants.js'
import PostInfo from './post-info.js'

const pl = {}

pl.Video = ({ attrs: { post } }) => {
  let audio = null
  let id

  const play = ({ target: vid }) => {
    vid.play()
    if (audio) {
      audio.play()
      id = setInterval(() => {
        if (Math.abs(audio.currentTime - vid.currentTime) < 0.2) return
        audio.currentTime = vid.currentTime
        vid.currentTime = audio.currentTime
        vid.play()
        audio.play()
      }, 1000)
    }
  }
  const pause = ({ target: vid }) => {
    vid.pause()
    if (audio) {
      clearInterval(id)
      audio.pause()
    }
  }

  if (post.sound) {
    audio = Object.assign(new Audio(post.sound), {
      loop: true,
      value: 0.5,
      preload: 'metadata'
    })
  }

  return {
    view: ({ attrs: { post } }) =>
      m('.video-post', [
        m(
          'video[loop][preload=metadata]' +
            z`cursor row-resize;fade 0.25;max-width 99%;max-height 95vh; :hover { fade 1;z-index 50 }`,
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
      m('img' + z`cursor row-resize;max-width 99%;max-height 95vh`, {
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
          ? [
              m('a', { onclick: () => (loaded = false) }, 'close'),
              m('iframe[frameborder=0]' + z`h 90vh;w 90%`, { src })
            ]
          : m(
              'button.load-embed' + z`p 10 15;m 7 0`,
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
        z`
        w 750
        max-width 80%
        ta left
        bc $bg-color-lighter
        br 5
        word-wrap break-word
        m auto
      `,
      m(
        '.self-post-username' + z`fw bold;position relative;t 8;l 13`,
        m(externalLink, { href: `${API_URL}/u/${post.author}` }, post.author),
        ' says: '
      ),
      m('.self-post-content' + z`p 30;pt 20`, children)
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
        'div' + z`ta center`,
        m(externalLink, { href: post.url }, post.url),
        post.thumbnail.indexOf('http') === 0 ? [m('br'), m('img', { src: post.thumbnail })] : ''
      )
    )
}

pl.Loading = {
  oninit(vnode) {
    const args = vnode.attrs
    if (args.post && args.post.parseAsync) {
      args.post.parseAsync(args.post.url, args.post).then(function (url) {
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
    return m('.post-preview' + z`m 5 auto 40 auto`, [
      showInfo ? m(PostInfo, { post }) : '',
      post.parseAsync ? m(pl.Loading, { post }) : m(comp, { post })
    ])
  }
}

export default PostPreview
