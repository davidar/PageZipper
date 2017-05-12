var assert = require("assert");
var jsdom = require("jsdom/lib/old-api.js");
var PageZipper = require("./index");

var tests = require("./test/accuracy_test/index.json");

var testPage = function(pageUrl, nextUrl, startUrl) {
  jsdom.env("./test/accuracy_test/" + pageUrl, function(err, window) {
    jsdom.changeURL(window, startUrl);
    window.console = console;
    var document = window.document;

    var pgzp = new PageZipper();
    pgzp.win = window;
    pgzp.doc = window.document;
    //pgzp.debug = true;

    pgzp.currDomain = pgzp.getDomain(startUrl);
    pgzp.url_list = [startUrl];
    var page = {'url': startUrl};
    pgzp.pages[0] = page;

    var nextLinkObj = pgzp.getNextLink(document.body);
    var resultUrl = nextLinkObj ? nextLinkObj.url : null;
    assert.equal(resultUrl, nextUrl);
  });
};

for(var i = 0; i < tests.length; i++) {
  testPage.apply(null, tests[i]);
}
