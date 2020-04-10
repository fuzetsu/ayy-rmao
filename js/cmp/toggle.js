import { m, z } from '../ext-deps.js'

const anim_speed = 200

export default function Toggle() {
  return {
    view: ({ attrs: { value, style = '', ontoggle } }) =>
      m(
        'div' +
          z`
          $name toggle
          d inline-block
          va middle
          position relative
          h 20px; w 35px; br 8
          cursor pointer
          transition background ${anim_speed}ms
        ` +
          z(value ? 'bc $toggle-on' : 'bc $toggle-off') +
          z(style),
        {
          onclick: ontoggle,
          tabIndex: 0,
          checked: value,
          role: 'checkbox',
          'aria-checked': String(value),
          onkeyup: e => {
            if (['Enter', ' '].includes(e.key)) ontoggle()
          }
        },
        m(
          'div' +
            z`
            $name toggle-slider
            position absolute
            bc $toggle-slider
            w 16; h 16; m 2; br 40%
            transition transform ${anim_speed}ms
          ` +
            z(value && 'transform translateX(15px)')
        )
      )
  }
}
