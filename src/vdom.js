import z from 'zaftig'
z.setDebug(process.env.NODE_ENV === 'development')
export { z }

export { default as m } from 'mithril'

// // for debugging redraws
// const cache = new Map()
// export const m = (cmp, ...rest) => {
//   let proxy = cmp
//   if (typeof cmp === 'function') {
//     proxy = cache.get(cmp)
//     if (!proxy) {
//       proxy = (...args) => {
//         console.log('REDRAWING', cmp.name, Date.now())
//         return cmp(...args)
//       }
//       cache.set(cmp, proxy)
//     }
//   }
//   return _m(proxy, ...rest)
// }
