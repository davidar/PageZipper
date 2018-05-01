function PageZipper(url) {

	/*------------------ Configuration -------------------*/
	//TODO add non-english synonyms
	this.nextSynonyms = [
							//beware, the order of this list is referenced elsewhere!
							{syn: "next", weight: 100},
							{syn: "older", weight: 80},
							{syn: "previous", weight: 60},
							{syn: "forward", weight: 50},
							{syn: "continue", weight: 45},
							{syn: ">", weight: 40, humanReadableOnly: true},
							{syn: ">>", weight: 30, humanReadableOnly: true},
							{syn: "more", weight: 20},
							{syn: "page", weight: 10},
							{syn: "part", weight: 5},
							{syn: "-1", weight: 0, humanReadableOnly: true, pageBar: true}		//for nav bars that list pages 1234, list the next page
						];
	this.minimumPageBuffer = 1;				//number of unread pages to keep queued
	this.minimumPageBufferGallery = 4; 		//# unread pages with image galleries
	this.poster_image_min_vmargin = 40; 		//how close from the top & bottom edge of the browser should the next poster image be placed
	this.in_compat_mode = false;				//in compat/iframe mode? default is ajax mode
	this.debug = false;

	/*------------------------- PageZipper Instance Variables ------------------*/
	this.pages = []; //page, nextLink, posterImg
	this.is_running = false;
	this.is_loading_page = false;
	this.loader_type = "";
	this.ctrl_key_pressed = false;
	this.curr_next_synonym = null; //keep track of which next synonym we use- then use it only- otherwise when we reach the end of a gallery, we will get the back/previous link
	this.onePosterPerPageMode = false;
	this.displayMode = "text";		//can be 'image' or 'text' depending on if this is an image gallery
	this.currDomain;
	this.url_list;
	this.media_path;

	if (url) {
		this.currDomain = this.getDomain(url)
		this.url_list = [url]
		this.pages[0] = {url}
	}

	//loading jQuery here to keep it out of the global scope - required by FF addon reviewers
	this.jq = jQuery.noConflict(true);

	this.trials = this.getTrials();
}


/*------------------------- Initialize ----------------------*/
PageZipper.prototype.loadPageZipper = function() {
	//start with some housekeeping
	this.ajax = new PageZipperAjax();
	this.iframe = new PageZipperIframe();

	//add in Node value - ff provides these, but they do not exist for the extension ?!?! Or for IE
	if (!this.win['Node']) {
	    this.win.Node = {
		    ELEMENT_NODE: 1,
	    	TEXT_NODE: 3
		};
	}

	this.currDomain = this.getDomain(this.win.location.href);
	this.url_list = [ this.win.location.href ];
	this.addExistingPage(this.win.location.href, this.doc.body);
	this.displayMode = this.calculateDisplayMode(this.pages[0]);
	if (this.displayMode == 'image' && this.pages[0].posterImgs.length == 1) {
		this.onePosterPerPageMode = true;
		this.minimumPageBuffer = this.minimumPageBufferGallery;
	}
	//Override document.write to prevent additional pages from writing to this closed page and messing everything up! - won't apply in iframes
	if (!this.in_compat_mode) {
		//FF makes this hard due to security: mikeconley.ca/blog/2009/05/02/overriding-firefox's-windowalert-part-2/ developer.mozilla.org/en/XPCNativeWrapper
		var currDoc = this.doc;
		currDoc.write = currDoc.writeln = currDoc.open = currDoc.close = function(str) { return; };
	}
};

PageZipper.prototype.runPageZipper = function() {
	this.jq(this.doc).bind("keydown", this.keyDown);
	this.jq(this.doc).bind("keyup", this.keyUp);
	this.addMenu();
	this.updateButtonState(this.in_compat_mode, 'compat');
	this.is_running = this.win.setInterval(this.mainBlock, 250);
};

PageZipper.prototype.stopPageZipper = function() {
	if (this.is_running) {
		this.win.clearInterval(this.is_running);
		this.is_running = null;
		this.removeMenu();
		this.jq(this.doc).unbind("keydown", this.keyDown);
		this.jq(this.doc).unbind("keyup", this.keyUp);

		//compat only - turn off key bindings added to every iframe
		if (this.in_compat_mode) {
			for (var i=1; i<this.pages.length; i++){
				this.jq(this.pages[i].ifrDoc).unbind("keydown", this.keyDown);
				this.jq(this.pages[i].ifrDoc).unbind("keyup", this.keyUp);
			}
		}
	}
};

/*------------------------- Main Block ----------------------*/
PageZipper.prototype.mainBlock = function() {
	if (!this) return; //Firefox when we have switched tabs
	var currPageIndex = this.getCurrentPage();
	var currViewablePage = this.getViewableCurrentPage(currPageIndex);

	//this.log("is loading: " + !this.is_loading_page + "# pages: " + this.pages.length + " currPageIndex: " + currPageIndex + " currViewablePage: " + currViewablePage);

	this.menuSetCurrPageNumber(currViewablePage + 1);
	this.setPageVisibility(currViewablePage);

	if (!this.is_loading_page &&
			this.pages[this.pages.length-1]["nextLinkObj"] &&		//has next link
			((this.pages.length - currPageIndex - 1) < this.minimumPageBuffer)	//scrolling
		) {
		this.is_loading_page = true;
		this.loadPage( this.pages[this.pages.length-1].nextLinkObj.url );
	}
};

/*------------------------- Determine Current Page ----------------------*/
//returns the 0-based index of the current displayed page in this.pages
PageZipper.prototype.getCurrentPage = function() {
	var i, currPage, currPageTop, currPageBottom;
	var currViewBottom = this.screen.getScrollTop() + this.screen.getViewportHeight();
	for (i=0; i<this.pages.length; i++) {
		currPage = this.pages[i].inPageElem;
		currPageTop = this.findPos(currPage).y;

		//if this is the last elem, calculate from bottom of page, else calculate distance to next page
		if (i == (this.pages.length - 1)) {
			currPageBottom = this.screen.getDocumentHeight();
			//if this is the last page, and page bottom does not extend to bottom, set currPageBottom to currViewBottom
			if (currPageBottom < currViewBottom) currPageBottom = currViewBottom;
		} else {
			currPageBottom = this.findPos( this.pages[ (i+1) ].inPageElem ).y;
		}

		//curr page if we have the following order on the page
		// pageTop
		// viewBottom
		// pageBottom
		// this.log("currPageTop: " + currPageTop + " browser bottom: " + currViewBottom + " currPageBottom: " + currPageBottom + " isGood" + (currPageTop <= currViewBottom && currViewBottom <= currPageBottom) + " currPage: " + i);
		if (currPageTop <= currViewBottom && currViewBottom <= currPageBottom) {
			return i;
		}
	}
	return this.pages.length;  //we're at the end of this.pages
};

//gets the current page as viewed by user - whichever page takes up the most space on page is current viewable page
PageZipper.prototype.getViewableCurrentPage = function(currPage) {
	//update page # once next page takes up more than 50% of space in viewport
	var currPageObj = this.pages[currPage];

	if  ((this.findPos(currPageObj.inPageElem).y - Math.abs(this.screen.getScrollTop())) > (this.screen.getViewportHeight() / 2)) {
		return currPage - 1;
	}
	return currPage;
};

/*------------------------- Display Mode ----------------------*/

PageZipper.prototype.calculateDisplayMode = function(currPage){
	var textArea = 0, imgArea = 0;
	var i=0, txtP, imgs = {};

	//first calculate the area of all text on this page
	txtP = this.doc.createElement("div");
	txtP.style.clear = "both";
	txtP.appendChild( this.doc.createTextNode(  this.getAllTextOnPage(currPage.elemContent) ));
	this.doc.body.appendChild(txtP);
	textArea = txtP.offsetWidth * txtP.offsetHeight;
	this.doc.body.removeChild(txtP);

	//calculate area of poster imgs
	if (currPage.posterImgs == null) currPage.posterImgs = this.getPosterImagesOnPage(currPage.elemContent);

	//make sure we remove all duplicates! This is important for sites like google and yahoo which use the same image multiple times (sprite.png)
	for (i=0; i<currPage.posterImgs.length; i++) {
		imgs[ currPage.posterImgs[i].src ] = currPage.posterImgs[i];
	}

	for (var imgUrl in imgs) {
		var img = imgs[imgUrl];
		imgArea += img.offsetHeight * img.offsetWidth;
	}

	//this.log("textArea: " + textArea + " imgArea: " + imgArea + " mode: " + ((textArea >= imgArea) ? "text" : "image"));
	return (textArea >= imgArea) ? "text" : "image";
};

PageZipper.prototype.getAllTextOnPage = function(pageHtml) {
	var str = "";

	this.depthFirstRecursion(pageHtml, 	function(curr) {
												if (curr.nodeType == Node.TEXT_NODE && curr.parentNode.nodeType == Node.ELEMENT_NODE && typeof(curr.parentNode.tagName) == "string") {
													try {
														var tagName = curr.parentNode.tagName.toLowerCase();
														//filter out obvious bad stuff.  could be improved, but works well enough as is
														if (tagName == "div" || tagName == "span" || tagName == "p" || tagName == "td")
															str += curr.nodeValue + "\n";
													} catch (ex) {
														console.dir(curr);
													}
												}
											});
	return str;
};

/*------------------------- Hide Old Pages ----------------------*/
//hide pages farther than 10 pages back. This conserves the browsers resources and
//prevents it from getting slowed down by displaying dozens of pages
//Leave the first page showing, and make sure the current page is always showing
PageZipper.prototype.setPageVisibility = function(currPageIndex) {

	//make sure the current page is visible
	var currPage = this.pages[currPageIndex];
	if (currPage.elemContent.style.visibility == "hidden") {
		currPage.elemContent.style.visibility = "visible";
	}

	//hide pages farther back than 10 (show the first page)
	if (currPageIndex > 5) {
		var oldPage = this.pages[currPageIndex - 5];
		if (oldPage.elemContent.style.visibility != "hidden") oldPage.elemContent.style.visibility = "hidden";
	}
};

/*------------------------- Loader ----------------------*/
// to be called after _pgzpInitBookmarklet() or _pgzpInitExtension()
function _pgzpToggleBookmarklet() {
	if (pgzp.is_running) {
		pgzp.stopPageZipper();
	} else {
		pgzp.runPageZipper();
	}
}
