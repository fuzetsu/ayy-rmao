export const id = id => document.getElementById(id)

export const p = (...args) => (console.log(...args), args[0])

export const titleCase = str =>
  str.replace(/([a-z]+)/gi, match => match.charAt(0).toUpperCase() + match.slice(1))

export const htmlDecode = function(input) {
  const e = document.createElement('div')
  e.innerHTML = input
  return e.childNodes.length === 0 ? '' : e.childNodes[0].nodeValue
}

export const processRedditHtml = html => htmlDecode(html).replace(/<a/gi, '<a target="_blank"')

export const throttle = (limit, callback, wait = false) => (...args) => {
  if (wait) return
  callback(...args)
  wait = true
  setTimeout(function() {
    wait = false
  }, limit)
}

export const withAttrNoRedraw = (attr, func) => e => ((e.redraw = false), func(e.target[attr]))

export const storeSet = (key, val) => (localStorage[key] = JSON.stringify(val))

export const storeGet = key => {
  const val = localStorage[key]
  if (!val || val === 'undefined') return
  return JSON.parse(val)
}

export const pluralize = (word, count) => (count !== 1 ? word + 's' : word)

export const prettyTime = d => {
  // This function was copied, and slightly adapted from John Resig's website: https://johnresig.com/files/pretty.js
  const date = new Date(d)
  const diff = (Date.now() - date.getTime()) / 1000
  const day_diff = Math.floor(diff / 86400)

  if (isNaN(day_diff) || day_diff < 0 || day_diff >= 31) return

  return (
    (day_diff == 0 &&
      ((diff < 60 && 'just now') ||
        (diff < 120 && '1 minute ago') ||
        (diff < 3600 && Math.floor(diff / 60) + ' minutes ago') ||
        (diff < 7200 && '1 hour ago') ||
        (diff < 86400 && Math.floor(diff / 3600) + ' hours ago'))) ||
    (day_diff == 1 && 'Yesterday') ||
    (day_diff < 7 && day_diff + ' days ago') ||
    (day_diff < 31 && Math.ceil(day_diff / 7) + ' weeks ago')
  )
}

export const toggleExpand = (type, e) => {
  const target = e.target
  const titled = titleCase(type)
  const style = target.style
  const viewport = window['inner' + titled]
  const orig = target['natural' + titled] || target['video' + titled] || ''
  const cur = target['client' + titled]
  let dim = style[type]
  if (!dim && (orig === cur || orig * 0.8 <= cur)) {
    dim = orig + ''
  }
  if (dim) {
    if (dim.includes(orig) && orig <= viewport * 0.99) {
      style[type] = orig * 1.75 + 'px'
      style.maxHeight = 'none'
    } else {
      style[type] = ''
      style.maxHeight = ''
    }
  } else {
    style[type] = orig + 'px'
    style.maxHeight = 'none'
  }
}

export const anim = (dom, cb, type = 'end', unbind = true) => {
  const handler = e => {
    if (unbind) dom.removeEventListener('animation' + type, handler)
    cb(e)
  }
  dom.addEventListener('animation' + type, handler)
}

export const doWith = (...args) => fn => fn(...args)

export const safeParse = (json, fallback = {}) => {
  try {
    return JSON.parse(json)
  } catch (e) {
    return fallback
  }
}

export const reduceCount = (count, digits = 1) => {
  let indicator, divisor

  if (count > 999999) {
    indicator = 'M'
    divisor = 1000000
  } else if (count > 999) {
    indicator = 'k'
    divisor = 1000
  }

  // Do not reduce if we are below 1000
  return divisor ? (count / divisor).toFixed(digits) + indicator : count
}

export const SortingOptions = [
  { value: 'new', text: 'New' },
  { value: 'top', text: 'Top' },
  { value: 'old', text: 'Old' },
  { value: 'controversial', text: 'Controversial' },
  { value: 'random', text: 'Random' },
  { value: 'qa', text: 'QA' },
  { value: 'live', text: 'Live' },
  { value: 'confidence', text: 'Confidence' }
]