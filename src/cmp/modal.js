import { z, m } from '/vdom'

const Modal = {
  view: ({ attrs: { onclose, header, content } }) =>
    m(
      'div.overlay' +
        z`
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
          z`
          w 90%
          max-width 1200
          max-height 90vh
          bc $bg-color
          br 10
          d flex
          fd column
        `,
        [
          m(
            'div.modal-header' +
              z`
              d flex;fd row
              p 10 10 5 10
              box-shadow 0 3 7 -5 rgba(0,0,0,0.9)
            `,
            [
              m('div.modal-header-content' + z`flex 1 auto`, header),
              m('div.modal-header-actions', [
                m(
                  'span.modal-close' +
                    z`
                    grow 1
                    cursor pointer
                    fs 150%; line-height 0
                    :hover { grow 1.3 }
                  `,
                  { onclick: onclose },
                  m.trust('&times;')
                )
              ])
            ]
          ),
          m('div.modal-body' + z`flex 1 auto;overflow auto;max-height 80vh;p 15`, content)
        ]
      )
    )
}

export default Modal
