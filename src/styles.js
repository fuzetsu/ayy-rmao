import { z } from '/vdom'

const dayMode = `
  $loading-filter 1
  $link-color #1b3e92
  $author-color #215854
  $op-color #1a1abd
  $mod-color #109610
  $admin-color red
  $good-score-color #ff7a00
  $bad-score-color #3070a9
  $score-hidden-color #666
  $text-color #444
  $bg-color #eee
  $bg-color-lighter #fff
  $scroll-track-color #e0e0e0
  $scroll-thumb-color #aaa
  $toggle-on #2f855a
  $toggle-off #cbd5e0
  $toggle-slider #f7fafc
`

const nightMode = `
  $loading-filter 0
  $link-color #ffc9c9
  $author-color #ddd
  $op-color #afafff
  $mod-color #34ce34
  $admin-color red
  $good-score-color rgb(255, 181, 45)
  $bad-score-color rgb(0, 181, 247)
  $score-hidden-color #aaa
  $text-color white
  $bg-color #222
  $bg-color-lighter #444
  $scroll-track-color #444
  $scroll-thumb-color #555
  $toggle-on #68d391
  $toggle-off #4a5568
  $toggle-slider #f7fafc
`

export const setNight = on => z.global`html, body { ${on ? nightMode : dayMode} }`

z.global`
  html, body {
    $small-text 0.8em
    $large-text 1.2em
    $title-text 1.5em

    c $text-color
    bc $bg-color
    ff "Segoe UI",Roboto,Oxygen,Ubuntu,"Droid Sans",sans-serif
    fs 16
  }
  * { box-sizing border-box }
  a, .link {
    td none
    c $link-color
    cursor pointer
    :hover { td underline }
  }
  @media only screen and (min-device-width: 900px) {
    ::-webkit-scrollbar { w 15 }
    ::-webkit-scrollbar-track {
      bs inset 0 0 2 rgba(0, 0, 0, 0.3)
      bc $scroll-track-color
    }
    .modal ::-webkit-scrollbar-track { bbrr 10 }
    ::-webkit-scrollbar-thumb { bc $scroll-thumb-color }
  }
`

z.helper({
  pin: 'position absolute;t 0;b 0;l 0;r 0',
  fade: num => `transition opacity 500ms;opacity ${num}`,
  grow: num => `transition transform 500ms;transform scale(${num})`,
  flexCenter: 'd flex;jc center;ai center',
  fd: val => `flex-direction ${val}`,
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
  spinAnimation: `
    animation ${z.anim`
      from { transform rotate(0deg) }
      to { transform rotate(360deg) }
    `} 1s linear infinite
  `
})
