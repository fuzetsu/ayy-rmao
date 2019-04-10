import { m, b } from '../ext-deps.js'

const Modal = {
  view: ({ attrs: { onclose, header, content } }) =>
    m(
      'div.overlay' +
        b`
        pin
        flexCenter
        position fixed
        bc rgba(0,0,0,0.65)
        overflow auto
        z-index 50
      `,
      {
        onclick: e => {
          if (onclose && e.target.classList.contains('overlay')) {
            onclose()
          } else {
            e.redraw = false
          }
        }
      },
      m(
        'div.modal' +
          b`
          w 90%
          max-width 1200
          max-height 90vh
          bc var(--bg-color)
          br 10
          d flex
          fd column
        `,
        [
          m(
            'div.modal-header' + b`d flex;fd row;p 10 10 5 10;box-shadow 0 3 7 -5 rgba(0,0,0,0.9)`,
            [
              m('div.modal-header-content' + b`flex 1 auto`, header),
              m('div.modal-header-actions', [
                m(
                  'span.modal-close' +
                    b`grow 1;cursor pointer;fs 150%;line-height 0`.$hover`grow 1.3`,
                  { onclick: onclose },
                  m.trust('&times;')
                )
              ])
            ]
          ),
          m('div.modal-body' + b`flex 1 auto;overflow auto;max-height 80vh;p 15`, content)
        ]
      )
    )
}

export default Modal
