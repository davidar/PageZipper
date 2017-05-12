/*-------------------------------- Utilities ----------------------*/

PageZipper.prototype.startsWith = function(pattern, str) {
	return str.indexOf(pattern) === 0;
};

PageZipper.prototype.endsWith = function(pattern, str) {
	var d = str.length - pattern.length;
 	return d >= 0 && str.lastIndexOf(pattern) === d;
};

PageZipper.prototype.log = function(html, override) {
	if (this.debug || override) {
		if (this.win["console"]) {
			this.win.console.log(html);
			return;
		}

		var div = this.doc.createElement("textarea");
		this.doc.body.appendChild(div);
		div.value = html;

	}
};

//handles log strings in form "msg: #{o.src}" where o is the object in the list
PageZipper.prototype.logList = function(list, initialStr, listStr) {
	var interpolate = function (s, o) {
		return s.replace(/\#\{([^}]+)\}/g,	function (match, exp) {
												return eval(exp);
											});
};

	for (var i=0; i<list.length; i++) {
		initialStr += "\n" + interpolate(listStr, list[i]);
	}
	this.log(initialStr);
};

PageZipper.prototype.noBubble = function(event) {
	if (event) {
		event.cancelBubble = true; //IE
		if (event.stopPropagation)
			event.stopPropagation(); //Everyone else
		event.returnValue = false; //required by stupid browsers which do not respect cancelling bubbling on arrow keys - IE and Safari
	}
	return event;
};

//Find the length of page the user has left to read, in px
PageZipper.prototype.getRemaningBufferSize = function() {
	//this.log("jtDocH: " + this.screen.getDocumentHeight() + " jtScroll: " + this.screen.getScrollTop() + " jtViewport: " + this.screen.getViewportHeight());
	var left = this.screen.getDocumentHeight() - this.screen.getScrollTop() - this.screen.getViewportHeight();
	if (left < 0) return 0;
	return Math.floor(left);
};

//http://www.quirksmode.org/js/findpos.html
PageZipper.prototype.findPos = function(obj) {
	var curleft = 0, curtop = 0, objOrig = obj;
	if (obj.offsetParent) {
		do {
			curleft += obj.offsetLeft || parseInt(obj.style.left.replace("px", ""), 10) || 0;
			curtop += obj.offsetTop || parseInt(obj.style.top.replace("px", ""), 10) || 0;
		} while (obj = obj.offsetParent);
	}

	//if obj is inside an iframe, curtop will be the pos inside the iframe
	//add the y of the iframe to make currtop absolute
	if (objOrig.ownerDocument != this.win.parent.document) {
		//get iframe
		var ifr = this.doc.getElementById( objOrig.ownerDocument.pgzp_iframe_id );
		if (ifr) {
			var ifrPos = this.findPos(ifr);
			curleft += ifrPos.x;
			curtop += ifrPos.y;
		}
	}

	return {"x": curleft, "y": curtop};
};

PageZipper.prototype.getDocumentHeight = function(doc) {
	var body = doc.body, html = doc.documentElement;
	return Math.max( body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight );
};

PageZipper.prototype.isNumber = function(str) {
	return str && (typeof(str) == "number" || (typeof(str) == "string" && (str.search(/^\d+$/) >= 0)));
};

// Returns true for strings which match a number or are format "number - number"
PageZipper.prototype.isPageBarNumber = function(str) {
	return !!(str && (this.isNumber(str) || str.match(/\d+\s*-\s*\d+/g)));
};

PageZipper.prototype.getDomain = function(url) {
	if (url.match("http://localhost/")) return "localhost";

	var hna = url.match(/^http[s]?\:\/\/([\S]+?\.\w+)(\/.*)?$/i);
	//absolute url
	if (hna) {
		//remove subdomains if they exist
		var parts = hna[1].split(".");
		if (parts.length > 2)
			return parts[parts.length-2] + "." + parts[parts.length-1];
		return hna[1];
	}
	//javascript
	hna = url.match(/^javascript\:.*$/i);
	if (hna) {
		return null;
	}
	//relative link
	return this.currDomain;
};

/* Removes the anchor part of urls */
PageZipper.prototype.getUrlWOutAnchors = function(url) {
	if (url.indexOf("#") >= 0) {
		var results = url.match(/(.*?)#.*/);
		if (results.length > 0) return results[1];
	}
	return url;
};

PageZipper.prototype.convertToArray = function(a) {
	var b = [];
	for (var i=0; i<a.length; i++) b.push(a[i]);
	return b;
};

/* Remove all elements from the given array on which filter returns true */
PageZipper.prototype.filter = function(arr, filter) {
	for (var i=0; i<arr.length; i++) {
		if (filter(arr[i])) {
			arr.splice(i, 1);
			i--;
		}
	}
};

PageZipper.prototype.depthFirstRecursion = function(root, callback) {
	for (var i=0; i<root.childNodes.length; i++) {
		//for now only include visible content
		if (root.childNodes[i].nodeType == 3 ||
			(root.childNodes[i].nodeType == 1 && this.css.getStyle(root.childNodes[i], "display") != "none")) {
			this.depthFirstRecursion(root.childNodes[i], callback);
		}
	}
	callback(root);
};

PageZipper.prototype.contains = function(ar, obj) {
	if(Array.indexOf){
		return ar.indexOf(obj) != -1;
	} else {
		//stupid IE!!!
        for(var i=0; i<ar.length; i++){
            if(ar[i]==obj){
                return true;
            }
        }
        return false;
	}
};

PageZipper.prototype.getContentType = function() {
	var metas = this.doc.getElementsByTagName("head")[0].getElementsByTagName("meta");
	for (var i=0; i<metas.length; i++) {
		if (metas[i].getAttribute("http-equiv") && metas[i].getAttribute("http-equiv").toLowerCase() == "content-type" && metas[i].getAttribute("content"))
			return metas[i].getAttribute("content");
	}
	return null;
};

/* Is word an actual word, or is it part of something else
 * ie. isStandaloneWord('older', 'more older entries') => true
 * isStandaloneWord('older', 'update folder settings') => false
 */
PageZipper.prototype.isStandaloneWord = function(word, text, humanReadable) {
	var delimiter = humanReadable ? "\\s" : "[^a-zA-Z]" ;
	return new RegExp("^(.*" + delimiter + "+)?" + word + "(" + delimiter + "+.*)?$", "i").test(text);
};

/* Given a string and a position (0 based), find the full # at that position.
 * ex. ('ab324', 3) returns 324
 * return -1 if no # is found
 */
PageZipper.prototype.getNumberAtPos = function(str, pos) {
	var currNum = "" + str.charAt(pos);
	var currPos = pos - 1;

	//walk forward
	while(currPos >= 0 && this.isNumber(str.charAt(currPos))) {
		currNum = str.charAt(currPos) + currNum;
		currPos--;
	}

	//walk backward
	currPos = pos + 1;
	while(currPos < str.length && this.isNumber(str.charAt(currPos))) {
		currNum += str.charAt(currPos);
		currPos++;
	}

	return this.isNumber(currNum) ? parseInt(currNum, 10) : -1;
};
