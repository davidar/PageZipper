const assert = require('assert')
const {JSDOM} = require('jsdom')
const PageZipper = require('..')
const tests = require('./accuracy_test/index.json')

describe('Accuracy', function () {
  for(const [name, expected, url] of tests) {
    it(name, async function () {
      let dom = await JSDOM.fromFile(`test/accuracy_test/${name}.html`, {url})
      let body = dom.window.document.body
      let pgzp = new PageZipper(url)
      let nextPage = pgzp.getNextLink(body)
      assert.strictEqual(nextPage.url, expected)

      pgzp.addNextLink(nextPage)
      nextPage = pgzp.getNextLink(body) || {}
      assert.notStrictEqual(nextPage.url, expected)
    })
  }
})
