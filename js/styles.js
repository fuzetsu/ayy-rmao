import { b } from './ext-deps.js'

// b.setDebug(true)

const dayMode = `
  --link-color #1b3e92
  --author-color #215854
  --op-color #1a1abd
  --mod-color #109610
  --admin-color red
  --good-score-color #ff7a00
  --bad-score-color #3070a9
  --score-hidden-color #666
  --text-color #444
  --bg-color #eee
  --bg-color-lighter #fff
  --scroll-track-color #e0e0e0
  --scroll-thumb-color #aaa
`

const nightMode = `
  --link-color #ffc9c9
  --author-color #ddd
  --op-color #afafff
  --mod-color #34ce34
  --admin-color red
  --good-score-color rgb(255, 181, 45)
  --bad-score-color rgb(0, 181, 247)
  --score-hidden-color #aaa
  --text-color white
  --bg-color #222
  --bg-color-lighter #444
  --scroll-track-color #444
  --scroll-thumb-color #555
`

export const setNight = on => b.css('html', on ? nightMode : dayMode)

b.css({
  html: `
    --small-text 0.8em
    --large-text 1.2em
    --title-text 1.5em

    c var(--text-color)
    bc var(--bg-color)
    ff "Segoe UI",Roboto,Oxygen,Ubuntu,"Droid Sans",sans-serif
  `,
  '*': 'box-sizing border-box',
  a: 'td none;c var(--link-color)',
  'a:hover': 'td underline'
})

b.helper({
  pin: 'position absolute;t 0;b 0;l 0;r 0',
  fade: num => b`transition opacity 500ms;opacity ${num}`,
  grow: num => b`transition transform 500ms;transform scale(${num})`,
  flexCenter: 'd flex;jc center;ai center',
  badge: `
    br 4
    d inline-block
    p 2
    fw bold
    va middle
    mw 20
    ta center
    fs smaller
  `,
  ellipsis: `
    white-space nowrap
    overflow hidden
    text-overflow ellipsis
  `,
  spinAnimation: b.$animate('1s linear infinite', {
    from: 'transform rotate(0deg)',
    to: 'transform rotate(360deg)'
  })
})

export const fixComment = b`word-break break-word`
  .$nest(
    ' blockquote',
    `
      pl 8
      bl 4px solid #a2a2a2
      m 4 0 4 8
    `
  )
  .$nest(' blockquote:last-child', 'mb 0')
  .$nest('p', 'margin 0.75em 0')

export const postCommentRefresh = b`
  background #ddd
  border-radius 15
  height 16
  width 25
  display inline-block
  text-align center
  box-sizing border-box
  color black
  cursor pointer
  user-select none
`

export const postCommentRefreshContent = b`
  display inline-block
  ta center
`
