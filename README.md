PageZipper
==========

PageZipper is a free browser extension and bookmarklet which automatically merges all the 'Next' pages into one page
> Ever read one of those top ten lists or photo galleries where every item is on a different page?
> Clicking "Next" and waiting takes longer than actually reading the page.
> PageZipper automatically merges all the "Next" pages into one, so you can skip directly to the stuff you want.

PageZipper is distributed as a:

* Bookmarklet - www.printwhatyoulike.com/pagezipper
* Chrome Extension - https://chrome.google.com/webstore/detail/pagezipper/fbbmnbomimdgmecfpbilhoafgmmeagef?hl=en
* Firefox Extension - https://addons.mozilla.org/en-us/firefox/addon/pagezipper/

PageZipper is open source - https://github.com/jkoomjian/PageZipper. Contributions are welcome

=== Testing ===
Firefox:
> enter about:debugging in url bar
> click 'Load Temperary Add-on', select the manifest.json for the extension
> reload plugin by clicking 'Reload'

Chrome:
> add from chrome://extensions/
> reloading chrome://extensions/ or clicking the reload link will reload the extension

Bookmarklet:
> go to setup/setup.html, and drag the link into the browser's bookmarklets bar


=== Change Log ===

* Add {all: inital} to menu css to prevent the host page's css from altering the menu css

1.5 - 7/5/2016-----
* Get the firefox extension working with FF 49/Electrolysis
* Add a whitelist - pgzp will always run on whitelisted domains
* Now works with page bars in the format "[1-20] [21-40] [41-60]"
Bug Fixes:
* Fix bug on how tabs are handled in extensions
* Fix issue with page number not being correct after stopping then restarting pgzp