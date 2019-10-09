const fs = require('fs').promises
const https = require('https')

const dedash = str => str.replace(/-[a-z]/gi, m => m.slice(1).toUpperCase())
const cleanName = pkg => dedash(pkg.match(/^[^@\/]+/)[0])

const error = data => JSON.stringify(data, null, 2)

const get = url => {
  const parsed = new URL(url)
  return new Promise((res, rej) =>
    https
      .get(parsed, resp => {
        let data = ''
        if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
          console.log('following redirect', resp.statusCode, parsed.origin + resp.headers.location)
          return res(get(parsed.origin + resp.headers.location))
        }
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
      let hasDefault = name || /\bexport\s+default\b/.test(res.data)
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
const conf = pkgJson.extdeps || {}

Promise.all(
  Object.entries(conf).map(async ([file, deps]) => {
    const script = await buildDeps(deps)
    await fs.writeFile(file, script)
    console.log(file, 'built!', Object.keys(deps))
  })
).then(() => console.log('== BUILD COMPLETE =='))
