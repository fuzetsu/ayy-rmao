/* global require */
const fs = require('fs').promises
const https = require('https')

const dedash = str => str.replace(/-[a-z]/gi, m => m.slice(1).toUpperCase())
const cleanName = pkg => dedash(pkg.match(/^[^@/]+/)[0])

const error = data => JSON.stringify(data, null, 2)

const get = url => {
  const parsed = new URL(url)
  return new Promise((res, rej) =>
    https
      .get(parsed, resp => {
        // handle redirects
        if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location)
          return res(get(parsed.origin + resp.headers.location))
        let data = ''
        resp.on('data', chunk => (data += chunk))
        resp.on('end', () => res({ data, url }))
      })
      .on('error', err => rej(err))
  )
}

const buildDeps = deps =>
  Promise.all(
    Object.entries(deps).map(async ([pkg, { name, exports = '*' }]) => {
      const res = await get(`https://unpkg.com/${pkg}?module`).catch(err => {
        throw error({ pkg, err })
      })
      const src = res.url
      const hasDefault = name || /\bexport\s+default\b/.test(res.data)
      let line = ''
      if (exports && exports.length > 0)
        line = `export ${
          Array.isArray(exports) ? '{ ' + exports.join(', ') + ' }' : '*'
        } from '${src}'`
      if (hasDefault)
        line += `${line ? '\n' : ''}export { default as ${name || cleanName(pkg)} } from '${src}'`
      return line + '\n'
    })
  ).then(arr => arr.join('\n'))

const pkgJson = require('./package.json') || {}

const moduleConf = pkgJson.mdeps || {}
Promise.all(
  Object.entries(moduleConf).map(async ([file, deps]) => {
    await fs.writeFile(file, await buildDeps(deps))
    console.log('built module deps', file, Object.keys(deps))
  })
)

const scriptConf = pkgJson.sdeps || {}
Promise.all(
  Object.entries(scriptConf).map(async ([file, deps]) => {
    const template = await fs.readFile(file.replace('.html', '.template.html'), 'utf-8')
    const scripts = await Promise.all(
      deps.map(path => get(`https://unpkg.com/${path}`).then(res => res.url))
    )
    let indentCount = 0
    let idx = template.indexOf('{{SCRIPTS}}')
    while (template[--idx] === ' ') indentCount += 1
    const scriptsHtml = scripts
      .map(src => `<script src="${src}"></script>`)
      .join('\n' + Array(indentCount).fill(' ').join(''))
    await fs.writeFile(file, template.replace('{{SCRIPTS}}', scriptsHtml))
    console.log('built script deps', file, deps)
  })
)
