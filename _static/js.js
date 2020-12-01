/* Detect-zoom
 * -----------
 * Cross Browser Zoom and Pixel Ratio Detector
 * Version 1.0.4 | Apr 1 2013
 * dual-licensed under the WTFPL and MIT license
 * Maintained by https://github/tombigel
 * Original developer https://github.com/yonran
 */

//AMD and CommonJS initialization copied from https://github.com/zohararad/audio5js
(function (root, ns, factory) {
    "use strict";

    if (typeof (module) !== 'undefined' && module.exports) { // CommonJS
        module.exports = factory(ns, root);
    } else if (typeof (define) === 'function' && define.amd) { // AMD
        define("factory", function () {
            return factory(ns, root);
        });
    } else {
        root[ns] = factory(ns, root);
    }

}(window, 'detectZoom', function () {

    /**
     * Use devicePixelRatio if supported by the browser
     * @return {Number}
     * @private
     */
    var devicePixelRatio = function () {
        return window.devicePixelRatio || 1;
    };

    /**
     * Fallback function to set default values
     * @return {Object}
     * @private
     */
    var fallback = function () {
        return {
            zoom: 1,
            devicePxPerCssPx: 1
        };
    };
    /**
     * IE 8 and 9: no trick needed!
     * TODO: Test on IE10 and Windows 8 RT
     * @return {Object}
     * @private
     **/
    var ie8 = function () {
        var zoom = Math.round((screen.deviceXDPI / screen.logicalXDPI) * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * For IE10 we need to change our technique again...
     * thanks https://github.com/stefanvanburen
     * @return {Object}
     * @private
     */
    var ie10 = function () {
        var zoom = Math.round((document.documentElement.offsetHeight / window.innerHeight) * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * Mobile WebKit
     * the trick: window.innerWIdth is in CSS pixels, while
     * screen.width and screen.height are in system pixels.
     * And there are no scrollbars to mess up the measurement.
     * @return {Object}
     * @private
     */
    var webkitMobile = function () {
        var deviceWidth = (Math.abs(window.orientation) == 90) ? screen.height : screen.width;
        var zoom = deviceWidth / window.innerWidth;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * Desktop Webkit
     * the trick: an element's clientHeight is in CSS pixels, while you can
     * set its line-height in system pixels using font-size and
     * -webkit-text-size-adjust:none.
     * device-pixel-ratio: http://www.webkit.org/blog/55/high-dpi-web-sites/
     *
     * Previous trick (used before http://trac.webkit.org/changeset/100847):
     * documentElement.scrollWidth is in CSS pixels, while
     * document.width was in system pixels. Note that this is the
     * layout width of the document, which is slightly different from viewport
     * because document width does not include scrollbars and might be wider
     * due to big elements.
     * @return {Object}
     * @private
     */
    var webkit = function () {
        var important = function (str) {
            return str.replace(/;/g, " !important;");
        };

        var div = document.createElement('div');
        div.innerHTML = "1<br>2<br>3<br>4<br>5<br>6<br>7<br>8<br>9<br>0";
        div.setAttribute('style', important('font: 100px/1em sans-serif; -webkit-text-size-adjust: none; text-size-adjust: none; height: auto; width: 1em; padding: 0; overflow: visible;'));

        // The container exists so that the div will be laid out in its own flow
        // while not impacting the layout, viewport size, or display of the
        // webpage as a whole.
        // Add !important and relevant CSS rule resets
        // so that other rules cannot affect the results.
        var container = document.createElement('div');
        container.setAttribute('style', important('width:0; height:0; overflow:hidden; visibility:hidden; position: absolute;'));
        container.appendChild(div);

        document.body.appendChild(container);
        var zoom = 1000 / div.clientHeight;
        zoom = Math.round(zoom * 100) / 100;
        document.body.removeChild(container);

        return{
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * no real trick; device-pixel-ratio is the ratio of device dpi / css dpi.
     * (Note that this is a different interpretation than Webkit's device
     * pixel ratio, which is the ratio device dpi / system dpi).
     *
     * Also, for Mozilla, there is no difference between the zoom factor and the device ratio.
     *
     * @return {Object}
     * @private
     */
    var firefox4 = function () {
        var zoom = mediaQueryBinarySearch('min--moz-device-pixel-ratio', '', 0, 10, 20, 0.0001);
        zoom = Math.round(zoom * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom
        };
    };

    /**
     * Firefox 18.x
     * Mozilla added support for devicePixelRatio to Firefox 18,
     * but it is affected by the zoom level, so, like in older
     * Firefox we can't tell if we are in zoom mode or in a device
     * with a different pixel ratio
     * @return {Object}
     * @private
     */
    var firefox18 = function () {
        return {
            zoom: firefox4().zoom,
            devicePxPerCssPx: devicePixelRatio()
        };
    };

    /**
     * works starting Opera 11.11
     * the trick: outerWidth is the viewport width including scrollbars in
     * system px, while innerWidth is the viewport width including scrollbars
     * in CSS px
     * @return {Object}
     * @private
     */
    var opera11 = function () {
        var zoom = window.top.outerWidth / window.top.innerWidth;
        zoom = Math.round(zoom * 100) / 100;
        return {
            zoom: zoom,
            devicePxPerCssPx: zoom * devicePixelRatio()
        };
    };

    /**
     * Use a binary search through media queries to find zoom level in Firefox
     * @param property
     * @param unit
     * @param a
     * @param b
     * @param maxIter
     * @param epsilon
     * @return {Number}
     */
    var mediaQueryBinarySearch = function (property, unit, a, b, maxIter, epsilon) {
        var matchMedia;
        var head, style, div;
        if (window.matchMedia) {
            matchMedia = window.matchMedia;
        } else {
            head = document.getElementsByTagName('head')[0];
            style = document.createElement('style');
            head.appendChild(style);

            div = document.createElement('div');
            div.className = 'mediaQueryBinarySearch';
            div.style.display = 'none';
            document.body.appendChild(div);

            matchMedia = function (query) {
                style.sheet.insertRule('@media ' + query + '{.mediaQueryBinarySearch ' + '{text-decoration: underline} }', 0);
                var matched = getComputedStyle(div, null).textDecoration == 'underline';
                style.sheet.deleteRule(0);
                return {matches: matched};
            };
        }
        var ratio = binarySearch(a, b, maxIter);
        if (div) {
            head.removeChild(style);
            document.body.removeChild(div);
        }
        return ratio;

        function binarySearch(a, b, maxIter) {
            var mid = (a + b) / 2;
            if (maxIter <= 0 || b - a < epsilon) {
                return mid;
            }
            var query = "(" + property + ":" + mid + unit + ")";
            if (matchMedia(query).matches) {
                return binarySearch(mid, b, maxIter - 1);
            } else {
                return binarySearch(a, mid, maxIter - 1);
            }
        }
    };

    /**
     * Generate detection function
     * @private
     */
    var detectFunction = (function () {
        var func = fallback;
        //IE8+
        if (!isNaN(screen.logicalXDPI) && !isNaN(screen.systemXDPI)) {
            func = ie8;
        }
        // IE10+ / Touch
        else if (window.navigator.msMaxTouchPoints) {
            func = ie10;
        }
        //Mobile Webkit
        else if ('orientation' in window && typeof document.body.style.webkitMarquee === 'string') {
            func = webkitMobile;
        }
        //WebKit
        else if (typeof document.body.style.webkitMarquee === 'string') {
            func = webkit;
        }
        //Opera
        else if (navigator.userAgent.indexOf('Opera') >= 0) {
            func = opera11;
        }
        //Last one is Firefox
        //FF 18.x
        else if (window.devicePixelRatio) {
            func = firefox18;
        }
        //FF 4.0 - 17.x
        else if (firefox4().zoom > 0.001) {
            func = firefox4;
        }

        return func;
    }());


    return ({

        /**
         * Ratios.zoom shorthand
         * @return {Number} Zoom level
         */
        zoom: function () {
            return detectFunction().zoom;
        },

        /**
         * Ratios.devicePxPerCssPx shorthand
         * @return {Number} devicePxPerCssPx level
         */
        device: function () {
            return detectFunction().devicePxPerCssPx;
        }
    });
}));

var wpcom_img_zoomer = {
        clientHintSupport: {
                gravatar: false,
                files: false,
                photon: false,
                mshots: false,
                staticAssets: false,
                latex: false,
                imgpress: false,
        },
	useHints: false,
	zoomed: false,
	timer: null,
	interval: 1000, // zoom polling interval in millisecond

	// Should we apply width/height attributes to control the image size?
	imgNeedsSizeAtts: function( img ) {
		// Do not overwrite existing width/height attributes.
		if ( img.getAttribute('width') !== null || img.getAttribute('height') !== null )
			return false;
		// Do not apply the attributes if the image is already constrained by a parent element.
		if ( img.width < img.naturalWidth || img.height < img.naturalHeight )
			return false;
		return true;
	},

        hintsFor: function( service ) {
                if ( this.useHints === false ) {
                        return false;
                }
                if ( this.hints() === false ) {
                        return false;
                }
                if ( typeof this.clientHintSupport[service] === "undefined" ) {
                        return false;
                }
                if ( this.clientHintSupport[service] === true ) {
                        return true;
                }
                return false;
        },

	hints: function() {
		try {
			var chrome = window.navigator.userAgent.match(/\sChrome\/([0-9]+)\.[.0-9]+\s/)
			if (chrome !== null) {
				var version = parseInt(chrome[1], 10)
				if (isNaN(version) === false && version >= 46) {
					return true
				}
			}
		} catch (e) {
			return false
		}
		return false
	},

	init: function() {
		var t = this;
		try{
			t.zoomImages();
			t.timer = setInterval( function() { t.zoomImages(); }, t.interval );
		}
		catch(e){
		}
	},

	stop: function() {
		if ( this.timer )
			clearInterval( this.timer );
	},

	getScale: function() {
		var scale = detectZoom.device();
		// Round up to 1.5 or the next integer below the cap.
		if      ( scale <= 1.0 ) scale = 1.0;
		else if ( scale <= 1.5 ) scale = 1.5;
		else if ( scale <= 2.0 ) scale = 2.0;
		else if ( scale <= 3.0 ) scale = 3.0;
		else if ( scale <= 4.0 ) scale = 4.0;
		else                     scale = 5.0;
		return scale;
	},

	shouldZoom: function( scale ) {
		var t = this;
		// Do not operate on hidden frames.
		if ( "innerWidth" in window && !window.innerWidth )
			return false;
		// Don't do anything until scale > 1
		if ( scale == 1.0 && t.zoomed == false )
			return false;
		return true;
	},

	zoomImages: function() {
		var t = this;
		var scale = t.getScale();
		if ( ! t.shouldZoom( scale ) ){
			return;
		}
		t.zoomed = true;
		// Loop through all the <img> elements on the page.
		var imgs = document.getElementsByTagName("img");

		for ( var i = 0; i < imgs.length; i++ ) {
			// Wait for original images to load
			if ( "complete" in imgs[i] && ! imgs[i].complete )
				continue;

			// Skip images that have srcset attributes.
			if ( imgs[i].hasAttribute('srcset') ) {
				continue;
			}

			// Skip images that don't need processing.
			var imgScale = imgs[i].getAttribute("scale");
			if ( imgScale == scale || imgScale == "0" )
				continue;

			// Skip images that have already failed at this scale
			var scaleFail = imgs[i].getAttribute("scale-fail");
			if ( scaleFail && scaleFail <= scale )
				continue;

			// Skip images that have no dimensions yet.
			if ( ! ( imgs[i].width && imgs[i].height ) )
				continue;

			// Skip images from Lazy Load plugins
			if ( ! imgScale && imgs[i].getAttribute("data-lazy-src") && (imgs[i].getAttribute("data-lazy-src") !== imgs[i].getAttribute("src")))
				continue;

			if ( t.scaleImage( imgs[i], scale ) ) {
				// Mark the img as having been processed at this scale.
				imgs[i].setAttribute("scale", scale);
			}
			else {
				// Set the flag to skip this image.
				imgs[i].setAttribute("scale", "0");
			}
		}
	},

	scaleImage: function( img, scale ) {
		var t = this;
		var newSrc = img.src;

                var isFiles = false;
                var isLatex = false;
                var isPhoton = false;

		// Skip slideshow images
		if ( img.parentNode.className.match(/slideshow-slide/) )
			return false;

		// Skip CoBlocks Lightbox images
		if ( img.parentNode.className.match(/coblocks-lightbox__image/) )
			return false;

		// Scale gravatars that have ?s= or ?size=
		if ( img.src.match( /^https?:\/\/([^\/]*\.)?gravatar\.com\/.+[?&](s|size)=/ ) ) {
                        if ( this.hintsFor( "gravatar" ) === true ) {
                                return false;
                        }
			newSrc = img.src.replace( /([?&](s|size)=)(\d+)/, function( $0, $1, $2, $3 ) {
				// Stash the original size
				var originalAtt = "originals",
				originalSize = img.getAttribute(originalAtt);
				if ( originalSize === null ) {
					originalSize = $3;
					img.setAttribute(originalAtt, originalSize);
					if ( t.imgNeedsSizeAtts( img ) ) {
						// Fix width and height attributes to rendered dimensions.
						img.width = img.width;
						img.height = img.height;
					}
				}
				// Get the width/height of the image in CSS pixels
				var size = img.clientWidth;
				// Convert CSS pixels to device pixels
				var targetSize = Math.ceil(img.clientWidth * scale);
				// Don't go smaller than the original size
				targetSize = Math.max( targetSize, originalSize );
				// Don't go larger than the service supports
				targetSize = Math.min( targetSize, 512 );
				return $1 + targetSize;
			});
		}

		// Scale mshots that have width
		else if ( img.src.match(/^https?:\/\/([^\/]+\.)*(wordpress|wp)\.com\/mshots\/.+[?&]w=\d+/) ) {
                        if ( this.hintsFor( "mshots" ) === true ) {
                                return false;
                        }
			newSrc = img.src.replace( /([?&]w=)(\d+)/, function($0, $1, $2) {
				// Stash the original size
				var originalAtt = 'originalw', originalSize = img.getAttribute(originalAtt);
				if ( originalSize === null ) {
					originalSize = $2;
					img.setAttribute(originalAtt, originalSize);
					if ( t.imgNeedsSizeAtts( img ) ) {
						// Fix width and height attributes to rendered dimensions.
						img.width = img.width;
						img.height = img.height;
					}
				}
				// Get the width of the image in CSS pixels
				var size = img.clientWidth;
				// Convert CSS pixels to device pixels
				var targetSize = Math.ceil(size * scale);
				// Don't go smaller than the original size
				targetSize = Math.max( targetSize, originalSize );
				// Don't go bigger unless the current one is actually lacking
				if ( scale > img.getAttribute("scale") && targetSize <= img.naturalWidth )
					targetSize = $2;
				if ( $2 != targetSize )
					return $1 + targetSize;
				return $0;
			});

			// Update height attribute to match width
			newSrc = newSrc.replace( /([?&]h=)(\d+)/, function($0, $1, $2) {
				if ( newSrc == img.src ) {
					return $0;
				}
				// Stash the original size
				var originalAtt = 'originalh', originalSize = img.getAttribute(originalAtt);
				if ( originalSize === null ) {
					originalSize = $2;
					img.setAttribute(originalAtt, originalSize);
				}
				// Get the height of the image in CSS pixels
				var size = img.clientHeight;
				// Convert CSS pixels to device pixels
				var targetSize = Math.ceil(size * scale);
				// Don't go smaller than the original size
				targetSize = Math.max( targetSize, originalSize );
				// Don't go bigger unless the current one is actually lacking
				if ( scale > img.getAttribute("scale") && targetSize <= img.naturalHeight )
					targetSize = $2;
				if ( $2 != targetSize )
					return $1 + targetSize;
				return $0;
			});
		}

		// Scale simple imgpress queries (s0.wp.com) that only specify w/h/fit
		else if ( img.src.match(/^https?:\/\/([^\/.]+\.)*(wp|wordpress)\.com\/imgpress\?(.+)/) ) {
                        if ( this.hintsFor( "imgpress" ) === true ) {
                                return false; 
                        }
			var imgpressSafeFunctions = ["zoom", "url", "h", "w", "fit", "filter", "brightness", "contrast", "colorize", "smooth", "unsharpmask"];
			// Search the query string for unsupported functions.
			var qs = RegExp.$3.split('&');
			for ( var q in qs ) {
				q = qs[q].split('=')[0];
				if ( imgpressSafeFunctions.indexOf(q) == -1 ) {
					return false;
				}
			}
			// Fix width and height attributes to rendered dimensions.
			img.width = img.width;
			img.height = img.height;
			// Compute new src
			if ( scale == 1 )
				newSrc = img.src.replace(/\?(zoom=[^&]+&)?/, '?');
			else
				newSrc = img.src.replace(/\?(zoom=[^&]+&)?/, '?zoom=' + scale + '&');
		}

		// Scale files.wordpress.com, LaTeX, or Photon images (i#.wp.com)
		else if (
			( isFiles = img.src.match(/^https?:\/\/([^\/]+)\.files\.wordpress\.com\/.+[?&][wh]=/) ) ||
			( isLatex = img.src.match(/^https?:\/\/([^\/.]+\.)*(wp|wordpress)\.com\/latex\.php\?(latex|zoom)=(.+)/) ) ||
			( isPhoton = img.src.match(/^https?:\/\/i[\d]{1}\.wp\.com\/(.+)/) )
		) {
                        if ( false !== isFiles && this.hintsFor( "files" ) === true ) {
                                return false
                        }
                        if ( false !== isLatex && this.hintsFor( "latex" ) === true ) {
                                return false
                        }
                        if ( false !== isPhoton && this.hintsFor( "photon" ) === true ) {
                                return false
                        }
			// Fix width and height attributes to rendered dimensions.
			img.width = img.width;
			img.height = img.height;
			// Compute new src
			if ( scale == 1 ) {
				newSrc = img.src.replace(/\?(zoom=[^&]+&)?/, '?');
			} else {
				newSrc = img.src;

				var url_var = newSrc.match( /([?&]w=)(\d+)/ );
				if ( url_var !== null && url_var[2] ) {
					newSrc = newSrc.replace( url_var[0], url_var[1] + img.width );
				}

				url_var = newSrc.match( /([?&]h=)(\d+)/ );
				if ( url_var !== null && url_var[2] ) {
					newSrc = newSrc.replace( url_var[0], url_var[1] + img.height );
				}

				var zoom_arg = '&zoom=2';
				if ( !newSrc.match( /\?/ ) ) {
					zoom_arg = '?zoom=2';
				}
				img.setAttribute( 'srcset', newSrc + zoom_arg + ' ' + scale + 'x' );
			}
		}

		// Scale static assets that have a name matching *-1x.png or *@1x.png
		else if ( img.src.match(/^https?:\/\/[^\/]+\/.*[-@]([12])x\.(gif|jpeg|jpg|png)(\?|$)/) ) {
                        if ( this.hintsFor( "staticAssets" ) === true ) {
                                return false; 
                        }
			// Fix width and height attributes to rendered dimensions.
			img.width = img.width;
			img.height = img.height;
			var currentSize = RegExp.$1, newSize = currentSize;
			if ( scale <= 1 )
				newSize = 1;
			else
				newSize = 2;
			if ( currentSize != newSize )
				newSrc = img.src.replace(/([-@])[12]x\.(gif|jpeg|jpg|png)(\?|$)/, '$1'+newSize+'x.$2$3');
		}

		else {
			return false;
		}

		// Don't set img.src unless it has changed. This avoids unnecessary reloads.
		if ( newSrc != img.src ) {
			// Store the original img.src
			var prevSrc, origSrc = img.getAttribute("src-orig");
			if ( !origSrc ) {
				origSrc = img.src;
				img.setAttribute("src-orig", origSrc);
			}
			// In case of error, revert img.src
			prevSrc = img.src;
			img.onerror = function(){
				img.src = prevSrc;
				if ( img.getAttribute("scale-fail") < scale )
					img.setAttribute("scale-fail", scale);
				img.onerror = null;
			};
			// Finally load the new image
			img.src = newSrc;
		}

		return true;
	}
};

wpcom_img_zoomer.init();
;
/* globals infiniteScroll, _wpmejsSettings, ga, _gaq, WPCOM_sharing_counts, MediaElementPlayer */
( function () {
	// Open closure.
	// Local vars.
	var Scroller, ajaxurl, stats, type, text, totop, loading_text;

	// IE requires special handling
	var isIE = -1 != navigator.userAgent.search( 'MSIE' );
	if ( isIE ) {
		var IEVersion = navigator.userAgent.match( /MSIE\s?(\d+)\.?\d*;/ );
		IEVersion = parseInt( IEVersion[ 1 ] );
	}

	// HTTP ajaxurl when site is HTTPS causes Access-Control-Allow-Origin failure in Desktop and iOS Safari
	if ( 'https:' == document.location.protocol ) {
		infiniteScroll.settings.ajaxurl = infiniteScroll.settings.ajaxurl.replace(
			'http://',
			'https://'
		);
	}

	/**
	 * Loads new posts when users scroll near the bottom of the page.
	 */
	Scroller = function ( settings ) {
		var self = this;

		// Initialize our variables
		this.id = settings.id;
		this.body = document.body;
		this.window = window;
		this.element = document.getElementById( settings.id );
		this.wrapperClass = settings.wrapper_class;
		this.ready = true;
		this.disabled = false;
		this.page = 1;
		this.offset = settings.offset;
		this.currentday = settings.currentday;
		this.order = settings.order;
		this.throttle = false;
		this.click_handle = settings.click_handle;
		this.google_analytics = settings.google_analytics;
		this.history = settings.history;
		this.origURL = window.location.href;

		// Handle element
		this.handle = document.createElement( 'div' );
		this.handle.setAttribute( 'id', 'infinite-handle' );
		this.handle.innerHTML = '<span><button>' + text.replace( '\\', '' ) + '</button></span>';

		// Footer settings
		this.footer = {
			el: document.getElementById( 'infinite-footer' ),
			wrap: settings.footer,
		};

		// Bind methods used as callbacks
		this.checkViewportOnLoadBound = self.checkViewportOnLoad.bind( this );

		// Core's native MediaElement.js implementation needs special handling
		this.wpMediaelement = null;

		// We have two type of infinite scroll
		// cases 'scroll' and 'click'

		if ( type == 'scroll' ) {
			// Bind refresh to the scroll event
			// Throttle to check for such case every 300ms

			// On event the case becomes a fact
			this.window.addEventListener( 'scroll', function () {
				self.throttle = true;
			} );

			// Go back top method
			self.gotop();

			setInterval( function () {
				if ( self.throttle ) {
					// Once the case is the case, the action occurs and the fact is no more
					self.throttle = false;
					// Reveal or hide footer
					self.thefooter();
					// Fire the refresh
					self.refresh();
					self.determineURL(); // determine the url
				}
			}, 250 );

			// Ensure that enough posts are loaded to fill the initial viewport, to compensate for short posts and large displays.
			self.ensureFilledViewport();
			this.body.addEventListener( 'is.post-load', self.checkViewportOnLoadBound );
		} else if ( type == 'click' ) {
			if ( this.click_handle ) {
				this.element.appendChild( this.handle );
			}

			this.handle.addEventListener( 'click', function () {
				// Handle the handle
				if ( self.click_handle ) {
					self.handle.parentNode.removeChild( self.handle );
				}

				// Fire the refresh
				self.refresh();
			} );
		}

		// Initialize any Core audio or video players loaded via IS
		this.body.addEventListener( 'is.post-load', self.initializeMejs );
	};

	/**
	 * Normalize the access to the document scrollTop value.
	 */
	Scroller.prototype.getScrollTop = function () {
		return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
	};

	/**
	 * Polyfill jQuery.extend.
	 */
	Scroller.prototype.extend = function ( out ) {
		out = out || {};

		for ( var i = 1; i < arguments.length; i++ ) {
			if ( ! arguments[ i ] ) {
				continue;
			}

			for ( var key in arguments[ i ] ) {
				if ( arguments[ i ].hasOwnProperty( key ) ) {
					out[ key ] = arguments[ i ][ key ];
				}
			}
		}
		return out;
	};

	/**
	 * Check whether we should fetch any additional posts.
	 */
	Scroller.prototype.check = function () {
		var wrapperMeasurements = this.measure( this.element, [ this.wrapperClass ] );

		// Fetch more posts when we're less than 2 screens away from the bottom.
		return wrapperMeasurements.bottom < 2 * this.window.innerHeight;
	};

	/**
	 * Renders the results from a successful response.
	 */
	Scroller.prototype.render = function ( response ) {
		var childrenToAppend = Array.prototype.slice.call( response.fragment.childNodes );
		this.body.classList.add( 'infinity-success' );

		// Render the retrieved nodes.
		while ( childrenToAppend.length > 0 ) {
			var currentNode = childrenToAppend.shift();
			this.element.appendChild( currentNode );
		}

		this.trigger( this.body, 'is.post-load', {
			jqueryEventName: 'post-load',
			data: response,
		} );

		this.ready = true;
	};

	/**
	 * Returns the object used to query for new posts.
	 */
	Scroller.prototype.query = function () {
		return {
			page: this.page + this.offset, // Load the next page.
			currentday: this.currentday,
			order: this.order,
			scripts: window.infiniteScroll.settings.scripts,
			styles: window.infiniteScroll.settings.styles,
			query_args: window.infiniteScroll.settings.query_args,
			query_before: window.infiniteScroll.settings.query_before,
			last_post_date: window.infiniteScroll.settings.last_post_date,
		};
	};

	Scroller.prototype.animate = function ( cb, duration ) {
		var start = performance.now();

		requestAnimationFrame( function animate( time ) {
			var timeFraction = Math.min( 1, ( time - start ) / duration );
			cb( timeFraction );

			if ( timeFraction < 1 ) {
				requestAnimationFrame( animate );
			}
		} );
	};

	/**
	 * Scroll back to top.
	 */
	Scroller.prototype.gotop = function () {
		var blog = document.getElementById( 'infinity-blog-title' );
		var self = this;

		if ( ! blog ) {
			return;
		}

		blog.setAttribute( 'title', totop );
		blog.addEventListener( 'click', function ( e ) {
			var sourceScroll = self.window.pageYOffset;
			e.preventDefault();

			self.animate( function ( progress ) {
				var currentScroll = sourceScroll - sourceScroll * progress;
				document.documentElement.scrollTop = document.body.scrollTop = currentScroll;
			}, 200 );
		} );
	};

	/**
	 * The infinite footer.
	 */
	Scroller.prototype.thefooter = function () {
		var self = this,
			pageWrapper,
			footerContainer,
			width,
			sourceBottom,
			targetBottom,
			footerEnabled = this.footer && this.footer.el;

		if ( ! footerEnabled ) {
			return;
		}

		// Check if we have an id for the page wrapper
		if ( 'string' === typeof this.footer.wrap ) {
			try {
				pageWrapper = document.getElementById( this.footer.wrap );
				width = pageWrapper.getBoundingClientRect();
				width = width.width;
			} catch ( err ) {
				width = 0;
			}

			// Make the footer match the width of the page
			if ( width > 479 ) {
				footerContainer = this.footer.el.querySelector( '.container' );
				if ( footerContainer ) {
					footerContainer.style.width = width + 'px';
				}
			}
		}

		// Reveal footer
		sourceBottom = parseInt( self.footer.el.style.bottom || -50, 10 );
		targetBottom = this.window.pageYOffset >= 350 ? 0 : -50;

		if ( sourceBottom !== targetBottom ) {
			self.animate( function ( progress ) {
				var currentBottom = sourceBottom + ( targetBottom - sourceBottom ) * progress;
				self.footer.el.style.bottom = currentBottom + 'px';

				if ( 1 === progress ) {
					sourceBottom = targetBottom;
				}
			}, 200 );
		}
	};

	/**
	 * Recursively convert a JS object into URL encoded data.
	 */
	Scroller.prototype.urlEncodeJSON = function ( obj, prefix ) {
		var params = [],
			encodedKey,
			newPrefix;

		for ( var key in obj ) {
			encodedKey = encodeURIComponent( key );
			newPrefix = prefix ? prefix + '[' + encodedKey + ']' : encodedKey;

			if ( 'object' === typeof obj[ key ] ) {
				if ( ! Array.isArray( obj[ key ] ) || obj[ key ].length > 0 ) {
					params.push( this.urlEncodeJSON( obj[ key ], newPrefix ) );
				} else {
					// Explicitly expose empty arrays with no values
					params.push( newPrefix + '[]=' );
				}
			} else {
				params.push( newPrefix + '=' + encodeURIComponent( obj[ key ] ) );
			}
		}
		return params.join( '&' );
	};

	/**
	 * Controls the flow of the refresh. Don't mess.
	 */
	Scroller.prototype.refresh = function () {
		var self = this,
			query,
			xhr,
			loader,
			customized;

		// If we're disabled, ready, or don't pass the check, bail.
		if ( this.disabled || ! this.ready || ! this.check() ) {
			return;
		}

		// Let's get going -- set ready to false to prevent
		// multiple refreshes from occurring at once.
		this.ready = false;

		// Create a loader element to show it's working.
		if ( this.click_handle ) {
			if ( ! loader ) {
				document.getElementById( 'infinite-aria' ).textContent = loading_text;
				loader = document.createElement( 'div' );
				loader.classList.add( 'infinite-loader' );
				loader.setAttribute( 'role', 'progress' );
				loader.innerHTML =
					'<div class="spinner"><div class="spinner-inner"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div></div>';
			}
			this.element.appendChild( loader );
		}

		// Generate our query vars.
		query = self.extend(
			{
				action: 'infinite_scroll',
			},
			this.query()
		);

		// Inject Customizer state.
		if ( 'undefined' !== typeof wp && wp.customize && wp.customize.settings.theme ) {
			customized = {};
			query.wp_customize = 'on';
			query.theme = wp.customize.settings.theme.stylesheet;
			wp.customize.each( function ( setting ) {
				if ( setting._dirty ) {
					customized[ setting.id ] = setting();
				}
			} );
			query.customized = JSON.stringify( customized );
			query.nonce = wp.customize.settings.nonce.preview;
		}

		// Fire the ajax request.
		xhr = new XMLHttpRequest();
		xhr.open( 'POST', infiniteScroll.settings.ajaxurl, true );
		xhr.setRequestHeader( 'X-Requested-With', 'XMLHttpRequest' );
		xhr.setRequestHeader( 'Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8' );
		xhr.send( self.urlEncodeJSON( query ) );

		// Allow refreshes to occur again if an error is triggered.
		xhr.onerror = function () {
			if ( self.click_handle ) {
				loader.parentNode.removeChild( loader );
			}

			self.ready = true;
		};

		// Success handler
		xhr.onload = function () {
			var response = JSON.parse( xhr.responseText ),
				httpCheck = xhr.status >= 200 && xhr.status < 300,
				responseCheck = 'undefined' !== typeof response.html;

			if ( ! response || ! httpCheck || ! responseCheck ) {
				if ( self.click_handle ) {
					loader.parentNode.removeChild( loader );
				}
				return;
			}

			// On success, let's hide the loader circle.
			if ( self.click_handle ) {
				loader.parentNode.removeChild( loader );
			}

			// If additional scripts are required by the incoming set of posts, parse them
			if ( response.scripts && Array.isArray( response.scripts ) ) {
				response.scripts.forEach( function ( item ) {
					var elementToAppendTo = item.footer ? 'body' : 'head';

					// Add script handle to list of those already parsed
					window.infiniteScroll.settings.scripts.push( item.handle );

					// Output extra data, if present
					if ( item.extra_data ) {
						self.appendInlineScript( item.extra_data, elementToAppendTo );
					}

					if ( item.before_handle ) {
						self.appendInlineScript( item.before_handle, elementToAppendTo );
					}

					// Build script tag and append to DOM in requested location
					var script = document.createElement( 'script' );
					script.type = 'text/javascript';
					script.src = item.src;
					script.id = item.handle;

					// Dynamically loaded scripts are async by default.
					// We don't want that, it breaks stuff, e.g. wp-mediaelement init.
					script.async = false;

					if ( item.after_handle ) {
						script.onload = function () {
							self.appendInlineScript( item.after_handle, elementToAppendTo );
						};
					}

					// If MediaElement.js is loaded in by item set of posts, don't initialize the players a second time as it breaks them all
					if ( 'wp-mediaelement' === item.handle ) {
						self.body.removeEventListener( 'is.post-load', self.initializeMejs );
					}

					if ( 'wp-mediaelement' === item.handle && 'undefined' === typeof mejs ) {
						self.wpMediaelement = {};
						self.wpMediaelement.tag = script;
						self.wpMediaelement.element = elementToAppendTo;
						setTimeout( self.maybeLoadMejs.bind( self ), 250 );
					} else {
						document.getElementsByTagName( elementToAppendTo )[ 0 ].appendChild( script );
					}
				} );
			}

			// If additional stylesheets are required by the incoming set of posts, parse them
			if ( response.styles && Array.isArray( response.styles ) ) {
				response.styles.forEach( function ( item ) {
					// Add stylesheet handle to list of those already parsed
					window.infiniteScroll.settings.styles.push( item.handle );

					// Build link tag
					var style = document.createElement( 'link' );
					style.rel = 'stylesheet';
					style.href = item.src;
					style.id = item.handle + '-css';

					// Destroy link tag if a conditional statement is present and either the browser isn't IE, or the conditional doesn't evaluate true
					if (
						item.conditional &&
						( ! isIE || ! eval( item.conditional.replace( /%ver/g, IEVersion ) ) )
					) {
						style = false;
					}

					// Append link tag if necessary
					if ( style ) {
						document.getElementsByTagName( 'head' )[ 0 ].appendChild( style );
					}
				} );
			}

			// Convert the response.html to a fragment element.
			// Using a div instead of DocumentFragment, because the latter doesn't support innerHTML.
			response.fragment = document.createElement( 'div' );
			response.fragment.innerHTML = response.html;

			// Increment the page number
			self.page++;

			// Record pageview in WP Stats, if available.
			if ( stats ) {
				new Image().src =
					document.location.protocol +
					'//pixel.wp.com/g.gif?' +
					stats +
					'&post=0&baba=' +
					Math.random();
			}

			// Add new posts to the postflair object
			if ( 'object' === typeof response.postflair && 'object' === typeof WPCOM_sharing_counts ) {
				WPCOM_sharing_counts = self.extend( WPCOM_sharing_counts, response.postflair ); // eslint-disable-line no-global-assign
			}

			// Render the results
			self.render.call( self, response );

			// If 'click' type and there are still posts to fetch, add back the handle
			if ( type == 'click' ) {
				// add focus to new posts, only in button mode as we know where page focus currently is and only if we have a wrapper
				if ( infiniteScroll.settings.wrapper ) {
					document
						.querySelector( '#infinite-view-' + ( self.page + self.offset - 1 ) + ' a:first-of-type' )
						.focus( {
							preventScroll: true,
						} );
				}

				if ( response.lastbatch ) {
					if ( self.click_handle ) {
						// Update body classes
						self.body.classList.add( 'infinity-end' );
						self.body.classList.remove( 'infinity-success' );
					} else {
						self.trigger( this.body, 'infinite-scroll-posts-end' );
					}
				} else {
					if ( self.click_handle ) {
						self.element.appendChild( self.handle );
					} else {
						self.trigger( this.body, 'infinite-scroll-posts-more' );
					}
				}
			} else if ( response.lastbatch ) {
				self.disabled = true;

				self.body.classList.add( 'infinity-end' );
				self.body.classList.remove( 'infinity-success' );
			}

			// Update currentday to the latest value returned from the server
			if ( response.currentday ) {
				self.currentday = response.currentday;
			}

			// Fire Google Analytics pageview
			if ( self.google_analytics ) {
				var ga_url = self.history.path.replace( /%d/, self.page );
				if ( 'object' === typeof _gaq ) {
					_gaq.push( [ '_trackPageview', ga_url ] );
				}
				if ( 'function' === typeof ga ) {
					ga( 'send', 'pageview', ga_url );
				}
			}
		};

		return xhr;
	};

	/**
	 * Given JavaScript blob and the name of a parent tag, this helper function will
	 * generate a script tag, insert the JavaScript blob, and append it to the parent.
	 *
	 * It's important to note that the JavaScript blob will be evaluated immediately. If
	 * you need a parent script to load first, use that script element's onload handler.
	 *
	 * @param {string} script    The blob of JavaScript to run.
	 * @param {string} parentTag The tag name of the parent element.
	 */
	Scroller.prototype.appendInlineScript = function ( script, parentTag ) {
		var element = document.createElement( 'script' ),
			scriptContent = document.createTextNode( '//<![CDATA[ \n' + script + '\n//]]>' );

		element.type = 'text/javascript';
		element.appendChild( scriptContent );

		document.getElementsByTagName( parentTag )[ 0 ].appendChild( element );
	};

	/**
	 * Core's native media player uses MediaElement.js
	 * The library's size is sufficient that it may not be loaded in time for Core's helper to invoke it, so we need to delay until `mejs` exists.
	 */
	Scroller.prototype.maybeLoadMejs = function () {
		if ( null === this.wpMediaelement ) {
			return;
		}

		if ( 'undefined' === typeof mejs ) {
			setTimeout( this.maybeLoadMejs.bind( this ), 250 );
		} else {
			document
				.getElementsByTagName( this.wpMediaelement.element )[ 0 ]
				.appendChild( this.wpMediaelement.tag );
			this.wpMediaelement = null;

			// Ensure any subsequent IS loads initialize the players
			this.body.addEventListener( 'is.post-load', this.initializeMejs );
		}
	};

	/**
	 * Initialize the MediaElement.js player for any posts not previously initialized
	 */
	Scroller.prototype.initializeMejs = function ( e ) {
		// Are there media players in the incoming set of posts?
		if (
			! e.detail ||
			! e.detail.html ||
			( -1 === e.detail.html.indexOf( 'wp-audio-shortcode' ) &&
				-1 === e.detail.html.indexOf( 'wp-video-shortcode' ) )
		) {
			return;
		}

		// Don't bother if mejs isn't loaded for some reason
		if ( 'undefined' === typeof mejs ) {
			return;
		}

		// Adapted from wp-includes/js/mediaelement/wp-mediaelement.js
		// Modified to not initialize already-initialized players, as Mejs doesn't handle that well
		var settings = {};
		var audioVideoElements;

		if ( typeof _wpmejsSettings !== 'undefined' ) {
			settings.pluginPath = _wpmejsSettings.pluginPath;
		}

		settings.success = function ( mejs ) {
			var autoplay = mejs.attributes.autoplay && 'false' !== mejs.attributes.autoplay;
			if ( 'flash' === mejs.pluginType && autoplay ) {
				mejs.addEventListener(
					'canplay',
					function () {
						mejs.play();
					},
					false
				);
			}
		};

		audioVideoElements = document.querySelectorAll( '.wp-audio-shortcode, .wp-video-shortcode' );
		audioVideoElements = Array.prototype.slice.call( audioVideoElements );

		// Only process already unprocessed shortcodes.
		audioVideoElements = audioVideoElements.filter( function ( el ) {
			while ( el.parentNode ) {
				if ( el.classList.contains( 'mejs-container' ) ) {
					return false;
				}
				el = el.parentNode;
			}
			return true;
		} );

		for ( var i = 0; i < audioVideoElements.length; i++ ) {
			new MediaElementPlayer( audioVideoElements[ i ], settings );
		}
	};

	/**
	 * Get element measurements relative to the viewport.
	 *
	 * @returns {object}
	 */
	Scroller.prototype.measure = function ( element, expandClasses ) {
		expandClasses = expandClasses || [];

		var childrenToTest = Array.prototype.slice.call( element.children );
		var currentChild,
			minTop = Number.MAX_VALUE,
			maxBottom = 0,
			currentChildRect,
			i;

		while ( childrenToTest.length > 0 ) {
			currentChild = childrenToTest.shift();

			for ( i = 0; i < expandClasses.length; i++ ) {
				// Expand (= measure) child elements of nodes with class names from expandClasses.
				if ( currentChild.classList.contains( expandClasses[ i ] ) ) {
					childrenToTest = childrenToTest.concat(
						Array.prototype.slice.call( currentChild.children )
					);
					break;
				}
			}
			currentChildRect = currentChild.getBoundingClientRect();

			minTop = Math.min( minTop, currentChildRect.top );
			maxBottom = Math.max( maxBottom, currentChildRect.bottom );
		}

		var viewportMiddle = Math.round( window.innerHeight / 2 );

		// isActive = does the middle of the viewport cross the element?
		var isActive = minTop <= viewportMiddle && maxBottom >= viewportMiddle;

		/**
		 * Factor = percentage of viewport above the middle line occupied by the element.
		 *
		 * Negative factors are assigned for elements below the middle line. That's on purpose
		 * to only allow "page 2" to change the URL once it's in the middle of the viewport.
		 */
		var factor = ( Math.min( maxBottom, viewportMiddle ) - Math.max( minTop, 0 ) ) / viewportMiddle;

		return {
			top: minTop,
			bottom: maxBottom,
			height: maxBottom - minTop,
			factor: factor,
			isActive: isActive,
		};
	};

	/**
	 * Trigger IS to load additional posts if the initial posts don't fill the window.
	 *
	 * On large displays, or when posts are very short, the viewport may not be filled with posts,
	 * so we overcome this by loading additional posts when IS initializes.
	 */
	Scroller.prototype.ensureFilledViewport = function () {
		var self = this,
			windowHeight = self.window.innerHeight,
			wrapperMeasurements = self.measure( self.element, [ self.wrapperClass ] );

		// Only load more posts once. This prevents infinite loops when there are no more posts.
		self.body.removeEventListener( 'is.post-load', self.checkViewportOnLoadBound );

		// Load more posts if space permits, otherwise stop checking for a full viewport.
		if ( wrapperMeasurements.bottom < windowHeight ) {
			self.ready = true;
			self.refresh();
		}
	};

	/**
	 * Event handler for ensureFilledViewport(), tied to the post-load trigger.
	 * Necessary to ensure that the variable `this` contains the scroller when used in ensureFilledViewport(). Since this function is tied to an event, `this` becomes the DOM element the event is tied to.
	 */
	Scroller.prototype.checkViewportOnLoad = function () {
		this.ensureFilledViewport();
	};

	function fullscreenState() {
		return document.fullscreenElement ||
			document.mozFullScreenElement ||
			document.webkitFullscreenElement ||
			document.msFullscreenElement
			? 1
			: 0;
	}

	var previousFullScrenState = fullscreenState();

	/**
	 * Identify archive page that corresponds to majority of posts shown in the current browser window.
	 */
	Scroller.prototype.determineURL = function () {
		var self = this,
			pageNum = -1,
			currentFullScreenState = fullscreenState(),
			wrapperEls,
			maxFactor = 0;

		// xor - check if the state has changed
		if ( previousFullScrenState ^ currentFullScreenState ) {
			// If we just switched to/from fullscreen,
			// don't do the div clearing/caching or the
			// URL setting. Doing so can break video playback
			// if the video goes to fullscreen.

			previousFullScrenState = currentFullScreenState;
			return;
		}
		previousFullScrenState = currentFullScreenState;
		wrapperEls = document.querySelectorAll( '.' + self.wrapperClass );

		for ( var i = 0; i < wrapperEls.length; i++ ) {
			var setMeasurements = self.measure( wrapperEls[ i ] );

			// If it exists, pick a set that is crossed by the middle of the viewport.
			if ( setMeasurements.isActive ) {
				pageNum = parseInt( wrapperEls[ i ].dataset.pageNum, 10 );
				break;
			}

			// If there is such a set, pick the one that occupies the most space
			// above the middle of the viewport.
			if ( setMeasurements.factor > maxFactor ) {
				pageNum = parseInt( wrapperEls[ i ].dataset.pageNum, 10 );
				maxFactor = setMeasurements.factor;
			}

			// Otherwise default to -1
		}

		self.updateURL( pageNum );
	};

	/**
	 * Update address bar to reflect archive page URL for a given page number.
	 * Checks if URL is different to prevent pollution of browser history.
	 */
	Scroller.prototype.updateURL = function ( page ) {
		// IE only supports pushState() in v10 and above, so don't bother if those conditions aren't met.
		if ( ! window.history.pushState ) {
			return;
		}
		var self = this,
			pageSlug = self.origURL;

		if ( -1 !== page ) {
			pageSlug =
				window.location.protocol +
				'//' +
				self.history.host +
				self.history.path.replace( /%d/, page ) +
				self.history.parameters;
		}

		if ( window.location.href != pageSlug ) {
			history.pushState( null, null, pageSlug );
		}
	};

	/**
	 * Pause scrolling.
	 */
	Scroller.prototype.pause = function () {
		this.disabled = true;
	};

	/**
	 * Resume scrolling.
	 */
	Scroller.prototype.resume = function () {
		this.disabled = false;
	};

	/**
	 * Emits custom JS events.
	 *
	 * @param {Node}   el
	 * @param {string} eventName
	 * @param {*}      data
	 */
	Scroller.prototype.trigger = function ( el, eventName, opts ) {
		opts = opts || {};

		/**
		 * Emit the event in a jQuery way for backwards compatibility where necessary.
		 */
		if ( opts.jqueryEventName && 'undefined' !== typeof jQuery ) {
			jQuery( el ).trigger( opts.jqueryEventName, opts.data || null );
		}

		/**
		 * Emit the event in a standard way.
		 */
		var e;
		try {
			e = new CustomEvent( eventName, {
				bubbles: true,
				cancelable: true,
				detail: opts.data || null,
			} );
		} catch ( err ) {
			e = document.createEvent( 'CustomEvent' );
			e.initCustomEvent( eventName, true, true, opts.data || null );
		}
		el.dispatchEvent( e );
	};

	/**
	 * Ready, set, go!
	 */
	var jetpackInfinityModule = function () {
		var bodyClasses = infiniteScroll.settings.body_class.split( ' ' );

		// Check for our variables
		if ( 'object' !== typeof infiniteScroll ) {
			return;
		}

		bodyClasses.forEach( function ( className ) {
			if ( className ) {
				document.body.classList.add( className );
			}
		} );

		// Set ajaxurl (for brevity)
		ajaxurl = infiniteScroll.settings.ajaxurl;

		// Set stats, used for tracking stats
		stats = infiniteScroll.settings.stats;

		// Define what type of infinity we have, grab text for click-handle
		type = infiniteScroll.settings.type;
		text = infiniteScroll.settings.text;
		totop = infiniteScroll.settings.totop;

		// aria text
		loading_text = infiniteScroll.settings.loading_text;

		// Initialize the scroller (with the ID of the element from the theme)
		infiniteScroll.scroller = new Scroller( infiniteScroll.settings );

		/**
		 * Monitor user scroll activity to update URL to correspond to archive page for current set of IS posts
		 */
		if ( type == 'click' ) {
			var timer = null;
			window.addEventListener( 'scroll', function () {
				// run the real scroll handler once every 250 ms.
				if ( timer ) {
					return;
				}
				timer = setTimeout( function () {
					infiniteScroll.scroller.determineURL();
					timer = null;
				}, 250 );
			} );
		}
	};

	/**
	 * Ready, set, go!
	 */
	if ( document.readyState === 'interactive' || document.readyState === 'complete' ) {
		jetpackInfinityModule();
	} else {
		document.addEventListener( 'DOMContentLoaded', jetpackInfinityModule );
	}
} )(); // Close closure
;
!function(e){var t={};function n(c){if(t[c])return t[c].exports;var o=t[c]={i:c,l:!1,exports:{}};return e[c].call(o.exports,o,o.exports,n),o.l=!0,o.exports}n.m=e,n.c=t,n.d=function(e,t,c){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:c})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var c=Object.create(null);if(n.r(c),Object.defineProperty(c,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var o in e)n.d(c,o,function(t){return e[t]}.bind(null,o));return c},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=287)}({287:function(e,t){!function(){"use strict";var e=document.getElementsByClassName("has-lightbox");Array.from(e).forEach((function(e,t){e.className+=" lightbox-"+t+" ",function(e){var t=document.createElement("div");t.setAttribute("class","coblocks-lightbox");var n=document.createElement("div");n.setAttribute("class","coblocks-lightbox__background");var c=document.createElement("div");c.setAttribute("class","coblocks-lightbox__heading");var o=document.createElement("button");o.setAttribute("class","coblocks-lightbox__close");var r=document.createElement("span");r.setAttribute("class","coblocks-lightbox__count");var a=document.createElement("div");a.setAttribute("class","coblocks-lightbox__image");var i=document.createElement("img"),l=document.createElement("figcaption");l.setAttribute("class","coblocks-lightbox__caption");var s=document.createElement("button");s.setAttribute("class","coblocks-lightbox__arrow coblocks-lightbox__arrow--left");var u=document.createElement("button");u.setAttribute("class","coblocks-lightbox__arrow coblocks-lightbox__arrow--right");var d=document.createElement("div");d.setAttribute("class","arrow-right");var b=document.createElement("div");b.setAttribute("class","arrow-left");var f,g=document.querySelectorAll(".has-lightbox.lightbox-".concat(e," > :not(.carousel-nav) figure img, figure.has-lightbox.lightbox-").concat(e," > img")),m=document.querySelectorAll(".has-lightbox.lightbox-".concat(e," > :not(.carousel-nav) figure figcaption"));c.append(r,o),a.append(i,l),s.append(b),u.append(d),t.append(n,c,a,s,u),g.length>0&&document.getElementsByTagName("BODY")[0].append(t);m.length>0&&Array.from(m).forEach((function(e,t){e.addEventListener("click",(function(){v(t)}))}));Array.from(g).forEach((function(e,t){e.closest("figure").addEventListener("click",(function(){v(t)}))})),s.addEventListener("click",(function(){v(f=0===f?g.length-1:f-1)})),u.addEventListener("click",(function(){v(f=f===g.length-1?0:f+1)})),n.addEventListener("click",(function(){t.style.display="none"})),o.addEventListener("click",(function(){t.style.display="none"}));var p={preloaded:!1,setPreloadImages:function(){p.preloaded||(p.preloaded=!0,Array.from(g).forEach((function(e,t){p["img-".concat(t)]=new window.Image,p["img-".concat(t)].src=e.attributes.src.value,p["img-".concat(t)]["data-caption"]=g[t]&&g[t].nextElementSibling?function(e){for(var t=e.nextElementSibling;t;){if(t.matches("figcaption"))return t.innerHTML;t=t.nextElementSibling}return""}(g[t]):""})),document.onkeydown=function(e){if(void 0!==t&&"none"!==t)switch((e=e||window.event).keyCode){case 27:o.click();break;case 37:case 65:s.click();break;case 39:case 68:u.click()}})}};function v(e){p.setPreloadImages(),f=e,t.style.display="flex",n.style.backgroundImage="url(".concat(p["img-".concat(f)].src,")"),i.src=p["img-".concat(f)].src,l.innerHTML=p["img-".concat(f)]["data-caption"],r.textContent="".concat(f+1," / ").concat(g.length)}}(t)}))}()}});;
/* globals JSON */
( function () {
	var eventName = 'wpcom_masterbar_click';

	var linksTracksEvents = {
		// top level items
		'wp-admin-bar-blog'                        : 'my_sites',
		'wp-admin-bar-newdash'                     : 'reader',
		'wp-admin-bar-ab-new-post'                 : 'write_button',
		'wp-admin-bar-my-account'                  : 'my_account',
		'wp-admin-bar-notes'                       : 'notifications',
		// my sites - top items
		'wp-admin-bar-switch-site'                 : 'my_sites_switch_site',
		'wp-admin-bar-blog-info'                   : 'my_sites_site_info',
		'wp-admin-bar-site-view'                   : 'my_sites_view_site',
		'wp-admin-bar-blog-stats'                  : 'my_sites_site_stats',
		'wp-admin-bar-plan'                        : 'my_sites_plan',
		'wp-admin-bar-plan-badge'                  : 'my_sites_plan_badge',
		// my sites - manage
		'wp-admin-bar-edit-page'                   : 'my_sites_manage_site_pages',
		'wp-admin-bar-new-page-badge'              : 'my_sites_manage_add_page',
		'wp-admin-bar-edit-post'                   : 'my_sites_manage_blog_posts',
		'wp-admin-bar-new-post-badge'              : 'my_sites_manage_add_post',
		'wp-admin-bar-edit-attachment'             : 'my_sites_manage_media',
		'wp-admin-bar-new-attachment-badge'        : 'my_sites_manage_add_media',
		'wp-admin-bar-comments'                    : 'my_sites_manage_comments',
		'wp-admin-bar-edit-jetpack-testimonial'    : 'my_sites_manage_testimonials',
		'wp-admin-bar-new-jetpack-testimonial'     : 'my_sites_manage_add_testimonial',
		'wp-admin-bar-edit-jetpack-portfolio'      : 'my_sites_manage_portfolio',
		'wp-admin-bar-new-jetpack-portfolio'       : 'my_sites_manage_add_portfolio',
		// my sites - personalize
		'wp-admin-bar-themes'                      : 'my_sites_personalize_themes',
		'wp-admin-bar-cmz'                         : 'my_sites_personalize_themes_customize',
		// my sites - configure
		'wp-admin-bar-sharing'                     : 'my_sites_configure_sharing',
		'wp-admin-bar-people'                      : 'my_sites_configure_people',
		'wp-admin-bar-people-add'                  : 'my_sites_configure_people_add_button',
		'wp-admin-bar-plugins'                     : 'my_sites_configure_plugins',
		'wp-admin-bar-domains'                     : 'my_sites_configure_domains',
		'wp-admin-bar-domains-add'                 : 'my_sites_configure_add_domain',
		'wp-admin-bar-blog-settings'               : 'my_sites_configure_settings',
		'wp-admin-bar-legacy-dashboard'            : 'my_sites_configure_wp_admin',
		// reader
		'wp-admin-bar-followed-sites'              : 'reader_followed_sites',
		'wp-admin-bar-reader-followed-sites-manage': 'reader_manage_followed_sites',
		'wp-admin-bar-discover-discover'           : 'reader_discover',
		'wp-admin-bar-discover-search'             : 'reader_search',
		'wp-admin-bar-my-activity-my-likes'        : 'reader_my_likes',
		// account
		'wp-admin-bar-user-info'                   : 'my_account_user_name',
		// account - profile
		'wp-admin-bar-my-profile'                  : 'my_account_profile_my_profile',
		'wp-admin-bar-account-settings'            : 'my_account_profile_account_settings',
		'wp-admin-bar-billing'                     : 'my_account_profile_manage_purchases',
		'wp-admin-bar-security'                    : 'my_account_profile_security',
		'wp-admin-bar-notifications'               : 'my_account_profile_notifications',
		// account - special
		'wp-admin-bar-get-apps'                    : 'my_account_special_get_apps',
		'wp-admin-bar-next-steps'                  : 'my_account_special_next_steps',
		'wp-admin-bar-help'                        : 'my_account_special_help',
	};

	var notesTracksEvents = {
		openSite: function ( data ) {
			return {
				clicked: 'masterbar_notifications_panel_site',
				site_id: data.siteId
			};
		},
		openPost: function ( data ) {
			return {
				clicked: 'masterbar_notifications_panel_post',
				site_id: data.siteId,
				post_id: data.postId
			};
		},
		openComment: function ( data ) {
			return {
				clicked: 'masterbar_notifications_panel_comment',
				site_id: data.siteId,
				post_id: data.postId,
				comment_id: data.commentId
			};
		}
	};

	// Element.prototype.matches as a standalone function, with old browser fallback
	function matches( node, selector ) {
		if ( ! node ) {
			return undefined;
		}

		if ( ! Element.prototype.matches && ! Element.prototype.msMatchesSelector ) {
			throw new Error( 'Unsupported browser' );
		}

		return Element.prototype.matches ? node.matches( selector ) : node.msMatchesSelector( selector );
	}

	// Element.prototype.closest as a standalone function, with old browser fallback
	function closest( node, selector ) {
		if ( ! node ) {
			return undefined;
		}

		if ( Element.prototype.closest ) {
			return node.closest( selector );
		}

		do {
			if ( matches( node, selector ) ) {
				return node;
			}

			node = node.parentElement || node.parentNode;
		} while ( node !== null && node.nodeType === 1 );

		return null;
	}

	function recordTracksEvent( eventProps ) {
		eventProps = eventProps || {};
		window._tkq = window._tkq || [];
		window._tkq.push( [ 'recordEvent', eventName, eventProps ] );
	}

	function parseJson( s, defaultValue ) {
		try {
			return JSON.parse( s );
		} catch ( e ) {
			return defaultValue;
		}
	}

	function createTrackableLinkEventHandler( link ) {
		return function () {
			var parent = closest( link, 'li' );

			if ( ! parent ) {
				return;
			}

			var trackingId = link.getAttribute( 'ID' ) || parent.getAttribute( 'ID' );

			if ( ! linksTracksEvents.hasOwnProperty( trackingId ) ) {
				return;
			}

			var eventProps = { 'clicked': linksTracksEvents[ trackingId ] };
			recordTracksEvent( eventProps );
		}
	}

	function init() {
		var trackableLinkSelector = '.mb-trackable .ab-item:not(div),' +
			'#wp-admin-bar-notes .ab-item,' +
			'#wp-admin-bar-user-info .ab-item,' +
			'.mb-trackable .ab-secondary';

		var trackableLinks = document.querySelectorAll( trackableLinkSelector );

		for ( var i = 0; i < trackableLinks.length; i++ ) {
			var link = trackableLinks[ i ];
			var handler = createTrackableLinkEventHandler( link );

			link.addEventListener( 'click', handler );
			link.addEventListener( 'touchstart', handler );
		}
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}

	// listen for postMessage events from the notifications iframe
	window.addEventListener( 'message', function ( event ) {
		if ( event.origin !== 'https://widgets.wp.com' ) {
			return;
		}

		var data = ( typeof event.data === 'string' ) ? parseJson( event.data, {} ) : event.data;
		if ( data.type !== 'notesIframeMessage' ) {
			return;
		}

		var eventData = notesTracksEvents[ data.action ];
		if ( ! eventData ) {
			return;
		}

		recordTracksEvent( eventData( data ) );
	}, false );

} )();
;
/* global jetpackCarouselStrings, DocumentTouch */

// @start-hide-in-jetpack
if (typeof wpcom === 'undefined') {
	var wpcom = {};
}
wpcom.carousel = (function (/*$*/) {
	var prebuilt_widths = jetpackCarouselStrings.widths;
	var pageviews_stats_args = jetpackCarouselStrings.stats_query_args;

	var findFirstLargeEnoughWidth = function (original_w, original_h, dest_w, dest_h) {
		var inverse_ratio = original_h / original_w;

		for ( var i = 0; i < prebuilt_widths.length; ++i ) {
			if ( prebuilt_widths[i] >= dest_w || prebuilt_widths[i] * inverse_ratio >= dest_h ) {
				return prebuilt_widths[i];
			}
		}

		return original_w;
	};

	var removeResizeFromImageURL = function ( url ) {
		return removeArgFromURL( url, 'resize' );
	};

	var removeArgFromURL = function ( url, arg ) {
		var re = new RegExp( '[\\?&]' + arg + '(=[^?&]+)?' );
		if ( url.match( re ) ) {
			return url.replace( re, '' );
		}
		return url;
	};

	var addWidthToImageURL = function (url, width) {
		width = parseInt(width, 10);
		// Give devices with a higher devicePixelRatio higher-res images (Retina display = 2, Android phones = 1.5, etc)
		if ('undefined' !== typeof window.devicePixelRatio && window.devicePixelRatio > 1) {
			width = Math.round( width * window.devicePixelRatio );
		}
		url = addArgToURL(url, 'w', width);
		url = addArgToURL(url, 'h', '');
		return url;
	};

	var addArgToURL = function (url, arg, value) {
		var re = new RegExp(arg+'=[^?&]+');
		if ( url.match(re) ) {
			return url.replace(re, arg + '=' + value);
		} else {
			var divider = url.indexOf('?') !== -1 ? '&' : '?';
			return url + divider + arg + '=' + value;
		}
	};

	var stat = function ( names ) {
		if ( typeof names !== 'string' ) {
			names = names.join( ',' );
		}

		new Image().src = window.location.protocol +
			'//pixel.wp.com/g.gif?v=wpcom-no-pv' +
			'&x_carousel=' + names +
			'&baba=' + Math.random();
	};

	var pageview = function ( post_id ) {
		new Image().src = window.location.protocol +
			'//pixel.wp.com/g.gif?host=' + encodeURIComponent( window.location.host ) +
			'&ref=' + encodeURIComponent( document.referrer ) +
			'&rand=' + Math.random() +
			'&' + pageviews_stats_args +
			'&post=' + encodeURIComponent( post_id );
	};


	return {
		findFirstLargeEnoughWidth: findFirstLargeEnoughWidth,
		removeResizeFromImageURL: removeResizeFromImageURL,
		addWidthToImageURL: addWidthToImageURL,
		stat: stat,
		pageview: pageview
	};

})(jQuery);
// @end-hide-in-jetpack
jQuery( document ).ready( function ( $ ) {
	// gallery faded layer and container elements
	var overlay,
		comments,
		gallery,
		container,
		nextButton,
		previousButton,
		info,
		transitionBegin,
		caption,
		resizeTimeout,
		photo_info,
		close_hint,
		commentInterval,
		lastSelectedSlide,
		screenPadding = 110,
		originalOverflow = $( 'body' ).css( 'overflow' ),
		originalHOverflow = $( 'html' ).css( 'overflow' ),
		proportion = 85,
		last_known_location_hash = '',
		imageMeta,
		titleAndDescription,
		commentForm,
		leftColWrapper,
		scrollPos;

	if ( window.innerWidth <= 760 ) {
		screenPadding = Math.round( ( window.innerWidth / 760 ) * 110 );

		if (
			screenPadding < 40 &&
			( 'ontouchstart' in window || ( window.DocumentTouch && document instanceof DocumentTouch ) )
		) {
			screenPadding = 0;
		}
	}

	// Adding a polyfill for browsers that do not have Date.now
	if ( 'undefined' === typeof Date.now ) {
		Date.now = function now() {
			return new Date().getTime();
		};
	}

	var keyListener = function ( e ) {
		switch ( e.which ) {
			case 38: // up
				e.preventDefault();
				container.scrollTop( container.scrollTop() - 100 );
				break;
			case 40: // down
				e.preventDefault();
				container.scrollTop( container.scrollTop() + 100 );
				break;
			case 39: // right
				e.preventDefault();
				gallery.jp_carousel( 'next' );
				break;
			case 37: // left
			case 8: // backspace
				e.preventDefault();
				gallery.jp_carousel( 'previous' );
				break;
			case 27: // escape
				e.preventDefault();
				container.jp_carousel( 'close' );
				break;
			default:
				// making jslint happy
				break;
		}
	};

	var resizeListener = function (/*e*/) {
		clearTimeout( resizeTimeout );
		resizeTimeout = setTimeout( function () {
			gallery.jp_carousel( 'slides' ).jp_carousel( 'fitSlide', true );
			gallery.jp_carousel( 'updateSlidePositions', true );
			gallery.jp_carousel( 'fitMeta', true );
		}, 200 );
	};

	var prepareGallery = function (/*dataCarouselExtra*/) {
		if ( ! overlay ) {
			overlay = $( '<div></div>' )
				.addClass( 'jp-carousel-overlay' )
				.css( {
					position: 'fixed',
					top: 0,
					right: 0,
					bottom: 0,
					left: 0,
				} );

			var displayComments = 1 === +jetpackCarouselStrings.display_comments;
			var buttons = displayComments
				? '<a class="jp-carousel-commentlink" href="#">' + jetpackCarouselStrings.comment + '</a>'
				: '';
			if ( 1 === Number( jetpackCarouselStrings.is_logged_in ) ) {
// @start-hide-in-jetpack
				if ( 1 === Number( jetpackCarouselStrings.is_public && 1 === Number( jetpackCarouselStrings.reblog_enabled ) ) ) {
					buttons += '<a class="jp-carousel-reblog" href="#">' + jetpackCarouselStrings.reblog + '</a>';
				}
// @end-hide-in-jetpack
			}

			buttons = $( '<div class="jp-carousel-buttons">' + buttons + '</div>' );

			caption = $( '<h2 itemprop="caption description"></h2>' );
			photo_info = $( '<div class="jp-carousel-photo-info"></div>' ).append( caption );

			imageMeta = $( '<div></div>' ).addClass( 'jp-carousel-image-meta' ).css( {
				float: 'right',
				'margin-top': '20px',
				width: '250px',
			} );

			if ( 0 < buttons.children().length ) {
				imageMeta.append( buttons );
			}

			imageMeta
				.append( "<ul class='jp-carousel-image-exif' style='display:none;'></ul>" )
				.append( "<a class='jp-carousel-image-download' style='display:none;'></a>" )
				.append( "<div class='jp-carousel-image-map' style='display:none;'></div>" );

			titleAndDescription = $( '<div></div>' )
				.addClass( 'jp-carousel-titleanddesc' )
				.css( {
					width: '100%',
					'margin-top': imageMeta.css( 'margin-top' ),
				} );

			var leftWidth = $( window ).width() - screenPadding * 2 - ( imageMeta.width() + 40 );
			leftWidth += 'px';

			leftColWrapper = $( '<div></div>' )
				.addClass( 'jp-carousel-left-column-wrapper' )
				.css( {
					width: Math.floor( leftWidth ),
				} )
				.append( titleAndDescription );

			if ( displayComments ) {
				var commentFormMarkup = '<div id="jp-carousel-comment-form-container">';

				if (
					jetpackCarouselStrings.local_comments_commenting_as &&
					jetpackCarouselStrings.local_comments_commenting_as.length
				) {
					// Comments not enabled, fallback to local comments

					if (
						1 !== Number( jetpackCarouselStrings.is_logged_in ) &&
						1 === Number( jetpackCarouselStrings.comment_registration )
					) {
						commentFormMarkup +=
							'<div id="jp-carousel-comment-form-commenting-as">' +
							jetpackCarouselStrings.local_comments_commenting_as +
							'</div>';
					} else {
						commentFormMarkup += '<form id="jp-carousel-comment-form">';
						commentFormMarkup +=
							'<textarea name="comment" class="jp-carousel-comment-form-field jp-carousel-comment-form-textarea" id="jp-carousel-comment-form-comment-field" placeholder="' +
							jetpackCarouselStrings.write_comment +
							'"></textarea>';
						commentFormMarkup += '<div id="jp-carousel-comment-form-submit-and-info-wrapper">';
						commentFormMarkup +=
							'<div id="jp-carousel-comment-form-commenting-as">' +
							jetpackCarouselStrings.local_comments_commenting_as +
							'</div>';
						commentFormMarkup +=
							'<input type="submit" name="submit" class="jp-carousel-comment-form-button" id="jp-carousel-comment-form-button-submit" value="' +
							jetpackCarouselStrings.post_comment +
							'" />';
						commentFormMarkup += '<span id="jp-carousel-comment-form-spinner">&nbsp;</span>';
						commentFormMarkup += '<div id="jp-carousel-comment-post-results"></div>';
						commentFormMarkup += '</div>';
						commentFormMarkup += '</form>';
					}
				}
				commentFormMarkup += '</div>';

				commentForm = $( commentFormMarkup ).css( {
					width: '100%',
					'margin-top': '20px',
					color: '#999',
				} );

				comments = $( '<div></div>' ).addClass( 'jp-carousel-comments' ).css( {
					width: '100%',
					bottom: '10px',
					'margin-top': '20px',
				} );

				var commentsLoading = $(
					'<div id="jp-carousel-comments-loading"><span>' +
						jetpackCarouselStrings.loading_comments +
						'</span></div>'
				).css( {
					width: '100%',
					bottom: '10px',
					'margin-top': '20px',
				} );

				leftColWrapper.append( commentForm ).append( comments ).append( commentsLoading );
			}

			var fadeaway = $( '<div></div>' ).addClass( 'jp-carousel-fadeaway' );

			info = $( '<div></div>' )
				.addClass( 'jp-carousel-info' )
				.css( {
					top: Math.floor( ( $( window ).height() / 100 ) * proportion ),
					left: screenPadding,
					right: screenPadding,
				} )
				.append( photo_info )
				.append( imageMeta );

			if ( window.innerWidth <= 760 ) {
				photo_info.remove().insertAfter( titleAndDescription );
				info.prepend( leftColWrapper );
			} else {
				info.append( leftColWrapper );
			}

			var targetBottomPos = $( window ).height() - parseInt( info.css( 'top' ), 10 ) + 'px';

			nextButton = $( '<div><span></span></div>' )
				.addClass( 'jp-carousel-next-button' )
				.css( {
					right: '15px',
				} )
				.hide();

			previousButton = $( '<div><span></span></div>' )
				.addClass( 'jp-carousel-previous-button' )
				.css( {
					left: 0,
				} )
				.hide();

			nextButton.add( previousButton ).css( {
				position: 'fixed',
				top: '40px',
				bottom: targetBottomPos,
				width: screenPadding,
			} );

			gallery = $( '<div></div>' ).addClass( 'jp-carousel' ).css( {
				position: 'absolute',
				top: 0,
				bottom: targetBottomPos,
				left: 0,
				right: 0,
			} );

			close_hint = $( '<div class="jp-carousel-close-hint"><span>&times;</span></div>' ).css( {
				position: 'fixed',
			} );

			container = $( '<div></div>' )
				.addClass( 'jp-carousel-wrap' )
				.addClass( 'jp-carousel-transitions' );
			if ( 'white' === jetpackCarouselStrings.background_color ) {
				container.addClass( 'jp-carousel-light' );
			}

			container.attr( 'itemscope', '' );

			container.attr( 'itemtype', 'https://schema.org/ImageGallery' );

			container
				.css( {
					position: 'fixed',
					top: 0,
					right: 0,
					bottom: 0,
					left: 0,
					'z-index': 2147483647,
					'overflow-x': 'hidden',
					'overflow-y': 'auto',
					direction: 'ltr',
				} )
				.hide()
				.append( overlay )
				.append( gallery )
				.append( fadeaway )
				.append( info )
				.append( nextButton )
				.append( previousButton )
				.append( close_hint )
				.appendTo( $( 'body' ) )
				.click( function ( e ) {
					var target = $( e.target ),
						wrap = target.parents( 'div.jp-carousel-wrap' ),
						data = wrap.data( 'carousel-extra' ),
						slide = wrap.find( 'div.selected' ),
						attachment_id = slide.data( 'attachment-id' );
					data = data || [];

					if ( target.is( gallery ) || target.parents().add( target ).is( close_hint ) ) {
						container.jp_carousel( 'close' );
// @start-hide-in-jetpack
					} else if ( target.hasClass('jp-carousel-reblog') ) {
						e.preventDefault();
						e.stopPropagation();
						if ( !target.hasClass('reblogged') ) {
							target.jp_carousel('show_reblog_box');
							wpcom.carousel.stat('reblog_show_box');
						}
					} else if ( target.parents('#carousel-reblog-box').length ) {
						if ( target.is('a.cancel') ) {
							e.preventDefault();
							e.stopPropagation();
							target.jp_carousel('hide_reblog_box');
							wpcom.carousel.stat('reblog_cancel');
						} else if ( target.is( 'input[type="submit"]' ) ) {
							e.preventDefault();
							e.stopPropagation();

							var note = $('#carousel-reblog-box textarea').val();
							if ( jetpackCarouselStrings.reblog_add_thoughts === note ) {
								note = '';
							}

							$('#carousel-reblog-submit').val( jetpackCarouselStrings.reblogging );
							$('#carousel-reblog-submit').prop('disabled', true);
							$( '#carousel-reblog-box div.submit span.canceltext' ).show();

							$.post( jetpackCarouselStrings.ajaxurl, {
								'action': 'post_reblog',
								'reblog_source': 'carousel',
								'original_blog_id': $('#carousel-reblog-box input#carousel-reblog-blog-id').val(),
								'original_post_id': $('.jp-carousel div.selected').data('attachment-id'),
								'blog_id': $('#carousel-reblog-box select').val(),
								'blog_url': $('#carousel-reblog-box input#carousel-reblog-blog-url').val(),
								'blog_title': $('#carousel-reblog-box input#carousel-reblog-blog-title').val(),
								'post_url': $('#carousel-reblog-box input#carousel-reblog-post-url').val(),
								'post_title': slide.data( 'caption' ) || $('#carousel-reblog-box input#carousel-reblog-post-title').val(),
								'note': note,
								'_wpnonce': $('#carousel-reblog-box #_wpnonce').val()
							},
							function (/*result*/) {
								$('#carousel-reblog-box').css({ 'height': $('#carousel-reblog-box').height() + 'px' }).slideUp('fast');
								$('a.jp-carousel-reblog').html( jetpackCarouselStrings.reblogged ).removeClass( 'reblog' ).addClass( 'reblogged' );
								$( '#carousel-reblog-box div.submit span.canceltext' ).hide();
								$('#carousel-reblog-submit').val( jetpackCarouselStrings.post_reblog );
								$('div.jp-carousel-info').children().not('#carousel-reblog-box').fadeIn('fast');
								slide.data('reblogged', 1);
								$('div.gallery').find('img[data-attachment-id="' + slide.data('attachment-id') + '"]').data('reblogged', 1);


							}, 'json' );
							wpcom.carousel.stat('reblog_submit');
						}
					} else if ( target.hasClass( 'jp-carousel-image-download' ) ) {
						wpcom.carousel.stat( 'download_original_click' );
// @end-hide-in-jetpack
					} else if ( target.hasClass( 'jp-carousel-commentlink' ) ) {
						e.preventDefault();
						e.stopPropagation();
						$( window ).unbind( 'keydown', keyListener );
						container.animate( { scrollTop: parseInt( info.position()[ 'top' ], 10 ) }, 'fast' );
						$( '#jp-carousel-comment-form-submit-and-info-wrapper' ).slideDown( 'fast' );
						$( '#jp-carousel-comment-form-comment-field' ).focus();
					} else if ( target.hasClass( 'jp-carousel-comment-login' ) ) {
						var url = jetpackCarouselStrings.login_url + '%23jp-carousel-' + attachment_id;

						window.location.href = url;
					} else if ( target.parents( '#jp-carousel-comment-form-container' ).length ) {
						var textarea = $( '#jp-carousel-comment-form-comment-field' )
							.blur( function () {
								$( window ).bind( 'keydown', keyListener );
							} )
							.focus( function () {
								$( window ).unbind( 'keydown', keyListener );
							} );

						var emailField = $( '#jp-carousel-comment-form-email-field' )
							.blur( function () {
								$( window ).bind( 'keydown', keyListener );
							} )
							.focus( function () {
								$( window ).unbind( 'keydown', keyListener );
							} );

						var authorField = $( '#jp-carousel-comment-form-author-field' )
							.blur( function () {
								$( window ).bind( 'keydown', keyListener );
							} )
							.focus( function () {
								$( window ).unbind( 'keydown', keyListener );
							} );

						var urlField = $( '#jp-carousel-comment-form-url-field' )
							.blur( function () {
								$( window ).bind( 'keydown', keyListener );
							} )
							.focus( function () {
								$( window ).unbind( 'keydown', keyListener );
							} );

						if ( textarea && textarea.attr( 'id' ) === target.attr( 'id' ) ) {
							// For first page load
							$( window ).unbind( 'keydown', keyListener );
							$( '#jp-carousel-comment-form-submit-and-info-wrapper' ).slideDown( 'fast' );
						} else if ( target.is( 'input[type="submit"]' ) ) {
							e.preventDefault();
							e.stopPropagation();

							$( '#jp-carousel-comment-form-spinner' ).show();

							var ajaxData = {
								action: 'post_attachment_comment',
								nonce: jetpackCarouselStrings.nonce,
								blog_id: data[ 'blog_id' ],
								id: attachment_id,
								comment: textarea.val(),
							};

							if ( ! ajaxData[ 'comment' ].length ) {
								gallery.jp_carousel( 'postCommentError', {
									field: 'jp-carousel-comment-form-comment-field',
									error: jetpackCarouselStrings.no_comment_text,
								} );
								return;
							}

							if ( 1 !== Number( jetpackCarouselStrings.is_logged_in ) ) {
								ajaxData[ 'email' ] = emailField.val();
								ajaxData[ 'author' ] = authorField.val();
								ajaxData[ 'url' ] = urlField.val();

								if ( 1 === Number( jetpackCarouselStrings.require_name_email ) ) {
									if ( ! ajaxData[ 'email' ].length || ! ajaxData[ 'email' ].match( '@' ) ) {
										gallery.jp_carousel( 'postCommentError', {
											field: 'jp-carousel-comment-form-email-field',
											error: jetpackCarouselStrings.no_comment_email,
										} );
										return;
									} else if ( ! ajaxData[ 'author' ].length ) {
										gallery.jp_carousel( 'postCommentError', {
											field: 'jp-carousel-comment-form-author-field',
											error: jetpackCarouselStrings.no_comment_author,
										} );
										return;
									}
								}
							}

							$.ajax( {
								type: 'POST',
								url: jetpackCarouselStrings.ajaxurl,
								data: ajaxData,
								dataType: 'json',
								success: function ( response /*, status, xhr*/ ) {
									if ( 'approved' === response.comment_status ) {
										$( '#jp-carousel-comment-post-results' )
											.slideUp( 'fast' )
											.html(
												'<span class="jp-carousel-comment-post-success">' +
													jetpackCarouselStrings.comment_approved +
													'</span>'
											)
											.slideDown( 'fast' );
									} else if ( 'unapproved' === response.comment_status ) {
										$( '#jp-carousel-comment-post-results' )
											.slideUp( 'fast' )
											.html(
												'<span class="jp-carousel-comment-post-success">' +
													jetpackCarouselStrings.comment_unapproved +
													'</span>'
											)
											.slideDown( 'fast' );
									} else {
										// 'deleted', 'spam', false
										$( '#jp-carousel-comment-post-results' )
											.slideUp( 'fast' )
											.html(
												'<span class="jp-carousel-comment-post-error">' +
													jetpackCarouselStrings.comment_post_error +
													'</span>'
											)
											.slideDown( 'fast' );
									}
									gallery.jp_carousel( 'clearCommentTextAreaValue' );
									gallery.jp_carousel( 'getComments', {
										attachment_id: attachment_id,
										offset: 0,
										clear: true,
									} );
									$( '#jp-carousel-comment-form-button-submit' ).val(
										jetpackCarouselStrings.post_comment
									);
									$( '#jp-carousel-comment-form-spinner' ).hide();
								},
								error: function (/*xhr, status, error*/) {
									// TODO: Add error handling and display here
									gallery.jp_carousel( 'postCommentError', {
										field: 'jp-carousel-comment-form-comment-field',
										error: jetpackCarouselStrings.comment_post_error,
									} );
									return;
								},
							} );
						}
					} else if ( ! target.parents( '.jp-carousel-info' ).length ) {
						container.jp_carousel( 'next' );
					}
				} )
				.bind( 'jp_carousel.afterOpen', function () {
					$( window ).bind( 'keydown', keyListener );
					$( window ).bind( 'resize', resizeListener );
					gallery.opened = true;

					resizeListener();
				} )
				.bind( 'jp_carousel.beforeClose', function () {
					var scroll = $( window ).scrollTop();

					$( window ).unbind( 'keydown', keyListener );
					$( window ).unbind( 'resize', resizeListener );
					$( window ).scrollTop( scroll );
					$( '.jp-carousel-previous-button' ).hide();
					$( '.jp-carousel-next-button' ).hide();
					// Set height to original value
					// Fix some themes where closing carousel brings view back to top
					$( 'html' ).css( 'height', '' );
					gallery.jp_carousel( 'hide_reblog_box' ); // @hide-in-jetpack
				} )
				.bind( 'jp_carousel.afterClose', function () {
					if ( window.location.hash && history.back ) {
						history.back();
					}
					last_known_location_hash = '';
					gallery.opened = false;
				} )
				.on( 'transitionend.jp-carousel ', '.jp-carousel-slide', function ( e ) {
					// If the movement transitions take more than twice the allotted time, disable them.
					// There is some wiggle room in the 2x, since some of that time is taken up in
					// JavaScript, setting up the transition and calling the events.
					if ( 'transform' === e.originalEvent.propertyName ) {
						var transitionMultiplier =
							( Date.now() - transitionBegin ) / 1000 / e.originalEvent.elapsedTime;

						container.off( 'transitionend.jp-carousel' );

						if ( transitionMultiplier >= 2 ) {
							$( '.jp-carousel-transitions' ).removeClass( 'jp-carousel-transitions' );
						}
					}
				} );

			$( '.jp-carousel-wrap' ).touchwipe( {
				wipeLeft: function ( e ) {
					e.preventDefault();
					gallery.jp_carousel( 'next' );
				},
				wipeRight: function ( e ) {
					e.preventDefault();
					gallery.jp_carousel( 'previous' );
				},
				preventDefaultEvents: false,
			} );

			nextButton.add( previousButton ).click( function ( e ) {
				e.preventDefault();
				e.stopPropagation();
				if ( nextButton.is( this ) ) {
					gallery.jp_carousel( 'next' );
				} else {
					gallery.jp_carousel( 'previous' );
				}
			} );
		}
	};

	var processSingleImageGallery = function () {
		// process links that contain img tag with attribute data-attachment-id
		$( 'a img[data-attachment-id]' ).each( function () {
			var container = $( this ).parent();

			// skip if image was already added to gallery by shortcode
			if ( container.parent( '.gallery-icon' ).length ) {
				return;
			}

			// skip if the container is not a link
			if ( 'undefined' === typeof $( container ).attr( 'href' ) ) {
				return;
			}

			var valid = false;

			// if link points to 'Media File' (ignoring GET parameters) and flag is set allow it
			if (
				$( container ).attr( 'href' ).split( '?' )[ 0 ] ===
					$( this ).attr( 'data-orig-file' ).split( '?' )[ 0 ] &&
				1 === Number( jetpackCarouselStrings.single_image_gallery_media_file )
			) {
				valid = true;
			}

			// if link points to 'Attachment Page' allow it
			if ( $( container ).attr( 'href' ) === $( this ).attr( 'data-permalink' ) ) {
				valid = true;
			}

			// links to 'Custom URL' or 'Media File' when flag not set are not valid
			if ( ! valid ) {
				return;
			}

			// make this node a gallery recognizable by event listener above
			$( container ).addClass( 'single-image-gallery' );
			// blog_id is needed to allow posting comments to correct blog
			$( container ).data( 'carousel-extra', {
				blog_id: Number( jetpackCarouselStrings.blog_id ),
			} );
		} );
	};

	var methods = {
		testForData: function ( gallery ) {
			gallery = $( gallery ); // make sure we have it as a jQuery object.
			return ! ( ! gallery.length || ! gallery.data( 'carousel-extra' ) );
		},

		testIfOpened: function () {
			return !! (
				'undefined' !== typeof gallery &&
				'undefined' !== typeof gallery.opened &&
				gallery.opened
			);
		},

		openOrSelectSlide: function ( index ) {
			// The `open` method triggers an asynchronous effect, so we will get an
			// error if we try to use `open` then `selectSlideAtIndex` immediately
			// after it. We can only use `selectSlideAtIndex` if the carousel is
			// already open.
			if ( ! $( this ).jp_carousel( 'testIfOpened' ) ) {
				// The `open` method selects the correct slide during the
				// initialization.
				$( this ).jp_carousel( 'open', { start_index: index } );
			} else {
				gallery.jp_carousel( 'selectSlideAtIndex', index );
			}
		},

		open: function ( options ) {
			var settings = {
					items_selector:
						'.gallery-item [data-attachment-id], .tiled-gallery-item [data-attachment-id], img[data-attachment-id]',
					start_index: 0,
				},
				data = $( this ).data( 'carousel-extra' );

			if ( ! data ) {
				return; // don't run if the default gallery functions weren't used
			}

			prepareGallery( data );

			if ( gallery.jp_carousel( 'testIfOpened' ) ) {
				return; // don't open if already opened
			}

			// make sure to stop the page from scrolling behind the carousel overlay, so we don't trigger
			// infiniscroll for it when enabled (Reader, theme infiniscroll, etc).
			originalOverflow = $( 'body' ).css( 'overflow' );
			$( 'body' ).css( 'overflow', 'hidden' );
			// prevent html from overflowing on some of the new themes.
			originalHOverflow = $( 'html' ).css( 'overflow' );
			$( 'html' ).css( 'overflow', 'hidden' );
			scrollPos = $( window ).scrollTop();

			container.data( 'carousel-extra', data );
// @start-hide-in-jetpack
			wpcom.carousel.stat( ['open', 'view_image'] );
// @end-hide-in-jetpack

			return this.each( function () {
				// If options exist, lets merge them
				// with our default settings
				var $this = $( this );

				if ( options ) {
					$.extend( settings, options );
				}
				if ( -1 === settings.start_index ) {
					settings.start_index = 0; //-1 returned if can't find index, so start from beginning
				}

				container.trigger( 'jp_carousel.beforeOpen' ).fadeIn( 'fast', function () {
					container.trigger( 'jp_carousel.afterOpen' );
					gallery
						.jp_carousel(
							'initSlides',
							$this.find( settings.items_selector ),
							settings.start_index
						)
						.jp_carousel( 'selectSlideAtIndex', settings.start_index );
				} );
				gallery.html( '' );
			} );
		},

		selectSlideAtIndex: function ( index ) {
			var slides = this.jp_carousel( 'slides' ),
				selected = slides.eq( index );

			if ( 0 === selected.length ) {
				selected = slides.eq( 0 );
			}

			gallery.jp_carousel( 'selectSlide', selected, false );
			return this;
		},

		close: function () {
			// make sure to let the page scroll again
			$( 'body' ).css( 'overflow', originalOverflow );
			$( 'html' ).css( 'overflow', originalHOverflow );
			this.jp_carousel( 'clearCommentTextAreaValue' );
			return container.trigger( 'jp_carousel.beforeClose' ).fadeOut( 'fast', function () {
				container.trigger( 'jp_carousel.afterClose' );
				$( window ).scrollTop( scrollPos );
			} );
		},

		next: function () {
			this.jp_carousel( 'previousOrNext', 'nextSlide' );
            gallery.jp_carousel( 'hide_reblog_box' ); // @hide-in-jetpack
		},

		previous: function () {
			this.jp_carousel( 'previousOrNext', 'prevSlide' );
            gallery.jp_carousel( 'hide_reblog_box' ); // @hide-in-jetpack
		},

		previousOrNext: function ( slideSelectionMethodName ) {
			if ( ! this.jp_carousel( 'hasMultipleImages' ) ) {
				return false;
			}

			var slide = gallery.jp_carousel( slideSelectionMethodName );

			if ( slide ) {
				container.animate( { scrollTop: 0 }, 'fast' );
				this.jp_carousel( 'clearCommentTextAreaValue' );
				this.jp_carousel( 'selectSlide', slide );
                wpcom.carousel.stat( ['previous', 'view_image'] ); // @hide-in-jetpack
			}
		},

        // @start-hide-in-jetpack
       resetButtons : function (current) {
		   if ( current.data( 'reblogged' ) ) {
                $('.jp-carousel-buttons a.jp-carousel-reblog').addClass( 'reblogged' ).text( jetpackCarouselStrings.reblogged );
		   } else {
                $('.jp-carousel-buttons a.jp-carousel-reblog').removeClass( 'reblogged' ).text( jetpackCarouselStrings.reblog );
		   }
           // Must also take care of reblog/reblogged here
        },
        // @end-hide-in-jetpack
		selectedSlide: function () {
			return this.find( '.selected' );
		},

		setSlidePosition: function ( x ) {
			transitionBegin = Date.now();

			return this.css( {
				'-webkit-transform': 'translate3d(' + x + 'px,0,0)',
				'-moz-transform': 'translate3d(' + x + 'px,0,0)',
				'-ms-transform': 'translate(' + x + 'px,0)',
				'-o-transform': 'translate(' + x + 'px,0)',
				transform: 'translate3d(' + x + 'px,0,0)',
			} );
		},

		updateSlidePositions: function ( animate ) {
			var current = this.jp_carousel( 'selectedSlide' ),
				galleryWidth = gallery.width(),
				currentWidth = current.width(),
				previous = gallery.jp_carousel( 'prevSlide' ),
				next = gallery.jp_carousel( 'nextSlide' ),
				previousPrevious = previous.prev(),
				nextNext = next.next(),
				left = Math.floor( ( galleryWidth - currentWidth ) * 0.5 );

			current.jp_carousel( 'setSlidePosition', left ).show();

			// minimum width
			gallery.jp_carousel( 'fitInfo', animate );

			// prep the slides
			var direction = lastSelectedSlide.is( current.prevAll() ) ? 1 : -1;

			// Since we preload the `previousPrevious` and `nextNext` slides, we need
			// to make sure they technically visible in the DOM, but invisible to the
			// user. To hide them from the user, we position them outside the edges
			// of the window.
			//
			// This section of code only applies when there are more than three
			// slides. Otherwise, the `previousPrevious` and `nextNext` slides will
			// overlap with the `previous` and `next` slides which must be visible
			// regardless.
			if ( 1 === direction ) {
				if ( ! nextNext.is( previous ) ) {
					nextNext.jp_carousel( 'setSlidePosition', galleryWidth + next.width() ).show();
				}

				if ( ! previousPrevious.is( next ) ) {
					previousPrevious
						.jp_carousel( 'setSlidePosition', -previousPrevious.width() - currentWidth )
						.show();
				}
			} else {
				if ( ! nextNext.is( previous ) ) {
					nextNext.jp_carousel( 'setSlidePosition', galleryWidth + currentWidth ).show();
				}
			}

			previous
				.jp_carousel( 'setSlidePosition', Math.floor( -previous.width() + screenPadding * 0.75 ) )
				.show();
			next
				.jp_carousel( 'setSlidePosition', Math.ceil( galleryWidth - screenPadding * 0.75 ) )
				.show();
		},

		selectSlide: function ( slide, animate ) {
			lastSelectedSlide = this.find( '.selected' ).removeClass( 'selected' );

			var slides = gallery.jp_carousel( 'slides' ).css( { position: 'fixed' } ),
				current = $( slide ).addClass( 'selected' ).css( { position: 'relative' } ),
				attachmentId = current.data( 'attachment-id' ),
				previous = gallery.jp_carousel( 'prevSlide' ),
				next = gallery.jp_carousel( 'nextSlide' ),
				previousPrevious = previous.prev(),
				nextNext = next.next(),
				animated,
				captionHtml;

			// center the main image
			gallery.jp_carousel( 'loadFullImage', current );

			caption.hide();

			if ( next.length === 0 && slides.length <= 2 ) {
				$( '.jp-carousel-next-button' ).hide();
			} else {
				$( '.jp-carousel-next-button' ).show();
			}

			if ( previous.length === 0 && slides.length <= 2 ) {
				$( '.jp-carousel-previous-button' ).hide();
			} else {
				$( '.jp-carousel-previous-button' ).show();
			}

			animated = current
				.add( previous )
				.add( previousPrevious )
				.add( next )
				.add( nextNext )
				.jp_carousel( 'loadSlide' );

			// slide the whole view to the x we want
			slides.not( animated ).hide();

			gallery.jp_carousel( 'updateSlidePositions', animate );
			gallery.jp_carousel( 'resetButtons', current ); // @hide-in-jetpack

			container.trigger( 'jp_carousel.selectSlide', [ current ] );

			gallery.jp_carousel( 'getTitleDesc', {
				title: current.data( 'title' ),
				desc: current.data( 'desc' ),
			} );

			var imageMeta = current.data( 'image-meta' );
			gallery.jp_carousel( 'updateExif', imageMeta );
			gallery.jp_carousel( 'updateFullSizeLink', current );
			gallery.jp_carousel( 'updateMap', imageMeta );

			if ( 1 === +jetpackCarouselStrings.display_comments ) {
				gallery.jp_carousel( 'testCommentsOpened', current.data( 'comments-opened' ) );
				gallery.jp_carousel( 'getComments', {
					attachment_id: attachmentId,
					offset: 0,
					clear: true,
				} );
				$( '#jp-carousel-comment-post-results' ).slideUp();
			}

			// $('<div />').text(sometext).html() is a trick to go to HTML to plain
			// text (including HTML entities decode, etc)
			if ( current.data( 'caption' ) ) {
				captionHtml = $( '<div />' ).text( current.data( 'caption' ) ).html();

				if ( captionHtml === $( '<div />' ).text( current.data( 'title' ) ).html() ) {
					$( '.jp-carousel-titleanddesc-title' ).fadeOut( 'fast' ).empty();
				}

				if ( captionHtml === $( '<div />' ).text( current.data( 'desc' ) ).html() ) {
					$( '.jp-carousel-titleanddesc-desc' ).fadeOut( 'fast' ).empty();
				}

				caption.html( current.data( 'caption' ) ).fadeIn( 'slow' );
			} else {
				caption.fadeOut( 'fast' ).empty();
			}

			// Record pageview in WP Stats, for each new image loaded full-screen.
			if ( jetpackCarouselStrings.stats ) {
				new Image().src =
					document.location.protocol +
					'//pixel.wp.com/g.gif?' +
					jetpackCarouselStrings.stats +
					'&post=' +
					encodeURIComponent( attachmentId ) +
					'&rand=' +
					Math.random();
			}

			wpcom.carousel.pageview( attachmentId ); // @hide-in-jetpack
			// Load the images for the next and previous slides.
			$( next )
				.add( previous )
				.each( function () {
					gallery.jp_carousel( 'loadFullImage', $( this ) );
				} );

			window.location.hash = last_known_location_hash = '#jp-carousel-' + attachmentId;
		},

		slides: function () {
			return this.find( '.jp-carousel-slide' );
		},

		slideDimensions: function () {
			return {
				width: $( window ).width() - screenPadding * 2,
				height: Math.floor( ( $( window ).height() / 100 ) * proportion - 60 ),
			};
		},

		loadSlide: function () {
			return this.each( function () {
				var slide = $( this );
				slide.find( 'img' ).one( 'load', function () {
					// set the width/height of the image if it's too big
					slide.jp_carousel( 'fitSlide', false );
				} );
			} );
		},

		bestFit: function () {
			var max = gallery.jp_carousel( 'slideDimensions' ),
				orig = this.jp_carousel( 'originalDimensions' ),
				orig_ratio = orig.width / orig.height,
				w_ratio = 1,
				h_ratio = 1,
				width,
				height;

			if ( orig.width > max.width ) {
				w_ratio = max.width / orig.width;
			}
			if ( orig.height > max.height ) {
				h_ratio = max.height / orig.height;
			}

			if ( w_ratio < h_ratio ) {
				width = max.width;
				height = Math.floor( width / orig_ratio );
			} else if ( h_ratio < w_ratio ) {
				height = max.height;
				width = Math.floor( height * orig_ratio );
			} else {
				width = orig.width;
				height = orig.height;
			}

			return {
				width: width,
				height: height,
			};
		},

		fitInfo: function (/*animated*/) {
			var current = this.jp_carousel( 'selectedSlide' ),
				size = current.jp_carousel( 'bestFit' );

			photo_info.css( {
				left: Math.floor( ( info.width() - size.width ) * 0.5 ),
				width: Math.floor( size.width ),
			} );

			return this;
		},

		fitMeta: function ( animated ) {
			var newInfoTop = {
				top: Math.floor( ( $( window ).height() / 100 ) * proportion + 5 ) + 'px',
			};
			var newLeftWidth = { width: info.width() - ( imageMeta.width() + 80 ) + 'px' };

			if ( animated ) {
				info.animate( newInfoTop );
				leftColWrapper.animate( newLeftWidth );
			} else {
				info.animate( newInfoTop );
				leftColWrapper.css( newLeftWidth );
			}
		},

		fitSlide: function (/*animated*/) {
			return this.each( function () {
				var $this = $( this ),
					dimensions = $this.jp_carousel( 'bestFit' ),
					method = 'css',
					max = gallery.jp_carousel( 'slideDimensions' );

				dimensions.left = 0;
				dimensions.top = Math.floor( ( max.height - dimensions.height ) * 0.5 ) + 40;
				$this[ method ]( dimensions );
			} );
		},

		texturize: function ( text ) {
			text = '' + text; // make sure we get a string. Title "1" came in as int 1, for example, which did not support .replace().
			text = text
				.replace( /'/g, '&#8217;' )
				.replace( /&#039;/g, '&#8217;' )
				.replace( /[\u2019]/g, '&#8217;' );
			text = text
				.replace( /"/g, '&#8221;' )
				.replace( /&#034;/g, '&#8221;' )
				.replace( /&quot;/g, '&#8221;' )
				.replace( /[\u201D]/g, '&#8221;' );
			text = text.replace( /([\w]+)=&#[\d]+;(.+?)&#[\d]+;/g, '$1="$2"' ); // untexturize allowed HTML tags params double-quotes
			return $.trim( text );
		},

		initSlides: function ( items, start_index ) {
			if ( items.length < 2 ) {
				$( '.jp-carousel-next-button, .jp-carousel-previous-button' ).hide();
			} else {
				$( '.jp-carousel-next-button, .jp-carousel-previous-button' ).show();
			}

			// Calculate the new src.
			items.each( function (/*i*/) {
				var src_item = $( this ),
					orig_size = src_item.data( 'orig-size' ) || '',
					max = gallery.jp_carousel( 'slideDimensions' ),
					parts = orig_size.split( ',' ),
					medium_file = src_item.data( 'medium-file' ) || '',
					large_file = src_item.data( 'large-file' ) || '',
					src;
				orig_size = { width: parseInt( parts[ 0 ], 10 ), height: parseInt( parts[ 1 ], 10 ) };

// @start-hide-in-jetpack
				 if ( 'undefined' !== typeof wpcom ) {
					src = src_item.attr('src') || src_item.attr('original') || src_item.data('original') || src_item.data('lazy-src');
					if (src.indexOf('imgpress') !== -1) {
						src = src_item.data('orig-file');
					}
					// Square/Circle galleries use a resize param that needs to be removed.
					src = wpcom.carousel.removeResizeFromImageURL( src );
					src = wpcom.carousel.addWidthToImageURL( src, wpcom.carousel.findFirstLargeEnoughWidth( orig_size.width, orig_size.height, max.width, max.height ) );
				} else {

// @end-hide-in-jetpack
				src = src_item.data( 'orig-file' );

				src = gallery.jp_carousel( 'selectBestImageSize', {
					orig_file: src,
					orig_width: orig_size.width,
					orig_height: orig_size.height,
					max_width: max.width,
					max_height: max.height,
					medium_file: medium_file,
					large_file: large_file,
				} );
// @start-hide-in-jetpack
				 } // end else of if ( 'undefined' != typeof wpcom )
// @end-hide-in-jetpack

				// Set the final src
				$( this ).data( 'gallery-src', src );
			} );

			// If the start_index is not 0 then preload the clicked image first.
			if ( 0 !== start_index ) {
				$( '<img/>' )[ 0 ].src = $( items[ start_index ] ).data( 'gallery-src' );
			}

			var useInPageThumbnails =
				items.first().closest( '.tiled-gallery.type-rectangular' ).length > 0;

			// create the 'slide'
			items.each( function ( i ) {
				var src_item = $( this ),
					reblogged       = src_item.data( 'reblogged' ) || 0, // @hide-in-jetpack
					attachment_id = src_item.data( 'attachment-id' ) || 0,
					comments_opened = src_item.data( 'comments-opened' ) || 0,
					image_meta = src_item.data( 'image-meta' ) || {},
					orig_size = src_item.data( 'orig-size' ) || '',
					thumb_size = { width: src_item[ 0 ].naturalWidth, height: src_item[ 0 ].naturalHeight },
					title = src_item.data( 'image-title' ) || '',
					description = src_item.data( 'image-description' ) || '',
					caption = src_item.parents( '.gallery-item' ).find( '.gallery-caption' ).html() || '',
					src = src_item.data( 'gallery-src' ) || '',
					medium_file = src_item.data( 'medium-file' ) || '',
					large_file = src_item.data( 'large-file' ) || '',
					orig_file = src_item.data( 'orig-file' ) || '';

				var tiledCaption = src_item
					.parents( 'div.tiled-gallery-item' )
					.find( 'div.tiled-gallery-caption' )
					.html();
				if ( tiledCaption ) {
					caption = tiledCaption;
				}

				if ( attachment_id && orig_size.length ) {
					title = gallery.jp_carousel( 'texturize', title );
					description = gallery.jp_carousel( 'texturize', description );
					caption = gallery.jp_carousel( 'texturize', caption );

					// Initially, the image is a 1x1 transparent gif.  The preview is shown as a background image on the slide itself.
					var image = $( '<img/>' )
						.attr(
							'src',
							'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
						)
						.css( 'width', '100%' )
						.css( 'height', '100%' );

					var slide = $(
						'<div class="jp-carousel-slide" itemprop="associatedMedia" itemscope itemtype="https://schema.org/ImageObject"></div>'
					)
						.hide()
						.css( {
							//'position' : 'fixed',
							left: i < start_index ? -1000 : gallery.width(),
						} )
						.append( image )
						.appendTo( gallery )
						.data( 'src', src )
						.data( 'title', title )
						.data( 'desc', description )
						.data( 'caption', caption )
						.data( 'attachment-id', attachment_id )
						.data( 'permalink', src_item.parents( 'a' ).attr( 'href' ) )
						.data( 'orig-size', orig_size )
						.data( 'comments-opened', comments_opened )
						.data( 'image-meta', image_meta )
						.data( 'medium-file', medium_file )
						.data( 'large-file', large_file )
						.data( 'orig-file', orig_file )
						.data( 'reblogged', reblogged ) // @hide-in-jetpack
						.data( 'thumb-size', thumb_size );
					if ( useInPageThumbnails ) {
						// Use the image already loaded in the gallery as a preview.
						slide.data( 'preview-image', src_item.attr( 'src' ) ).css( {
							'background-image': 'url("' + src_item.attr( 'src' ) + '")',
							'background-size': '100% 100%',
							'background-position': 'center center',
						} );
					}

					slide.jp_carousel( 'fitSlide', false );
				}
			} );
			return this;
		},

		selectBestImageSize: function ( args ) {
			if ( 'object' !== typeof args ) {
				args = {};
			}

			if ( 'undefined' === typeof args.orig_file ) {
				return '';
			}

			if ( 'undefined' === typeof args.orig_width || 'undefined' === typeof args.max_width ) {
				return args.orig_file;
			}

			if ( 'undefined' === typeof args.medium_file || 'undefined' === typeof args.large_file ) {
				return args.orig_file;
			}

			// Check if the image is being served by Photon (using a regular expression on the hostname).

			var imageLinkParser = document.createElement( 'a' );
			imageLinkParser.href = args.large_file;

			var isPhotonUrl = /^i[0-2].wp.com$/i.test( imageLinkParser.hostname );

			var medium_size_parts = gallery.jp_carousel(
				'getImageSizeParts',
				args.medium_file,
				args.orig_width,
				isPhotonUrl
			);
			var large_size_parts = gallery.jp_carousel(
				'getImageSizeParts',
				args.large_file,
				args.orig_width,
				isPhotonUrl
			);

			var large_width = parseInt( large_size_parts[ 0 ], 10 ),
				large_height = parseInt( large_size_parts[ 1 ], 10 ),
				medium_width = parseInt( medium_size_parts[ 0 ], 10 ),
				medium_height = parseInt( medium_size_parts[ 1 ], 10 );

			// Assign max width and height.
			args.orig_max_width = args.max_width;
			args.orig_max_height = args.max_height;

			// Give devices with a higher devicePixelRatio higher-res images (Retina display = 2, Android phones = 1.5, etc)
			if ( 'undefined' !== typeof window.devicePixelRatio && window.devicePixelRatio > 1 ) {
				args.max_width = args.max_width * window.devicePixelRatio;
				args.max_height = args.max_height * window.devicePixelRatio;
			}

			if ( large_width >= args.max_width || large_height >= args.max_height ) {
				return args.large_file;
			}

			if ( medium_width >= args.max_width || medium_height >= args.max_height ) {
				return args.medium_file;
			}

			if ( isPhotonUrl ) {
				// args.orig_file doesn't point to a Photon url, so in this case we use args.large_file
				// to return the photon url of the original image.
				var largeFileIndex = args.large_file.lastIndexOf( '?' );
				var origPhotonUrl = args.large_file;
				if ( -1 !== largeFileIndex ) {
					origPhotonUrl = args.large_file.substring( 0, largeFileIndex );
					// If we have a really large image load a smaller version
					// that is closer to the viewable size
					if ( args.orig_width > args.max_width || args.orig_height > args.max_height ) {
						origPhotonUrl += '?fit=' + args.orig_max_width + '%2C' + args.orig_max_height;
					}
				}
				return origPhotonUrl;
			}

			return args.orig_file;
		},

		getImageSizeParts: function ( file, orig_width, isPhotonUrl ) {
			var size = isPhotonUrl
				? file.replace( /.*=([\d]+%2C[\d]+).*$/, '$1' )
				: file.replace( /.*-([\d]+x[\d]+)\..+$/, '$1' );

			var size_parts =
				size !== file
					? isPhotonUrl
						? size.split( '%2C' )
						: size.split( 'x' )
					: [ orig_width, 0 ];

			// If one of the dimensions is set to 9999, then the actual value of that dimension can't be retrieved from the url.
			// In that case, we set the value to 0.
			if ( '9999' === size_parts[ 0 ] ) {
				size_parts[ 0 ] = '0';
			}

			if ( '9999' === size_parts[ 1 ] ) {
				size_parts[ 1 ] = '0';
			}

			return size_parts;
		},

// @start-hide-in-jetpack
        show_reblog_box: function () {
            $('#carousel-reblog-box textarea').val(jetpackCarouselStrings.reblog_add_thoughts);
            //t.addClass('selected');
            $('#carousel-reblog-box p.response').remove();
            $('#carousel-reblog-box div.submit, #carousel-reblog-box div.submit span.canceltext').show();
            $('#carousel-reblog-box div.submit input[type=submit]').prop('disabled', false);

            var current = $('.jp-carousel div.selected');
            $('#carousel-reblog-box input#carousel-reblog-post-url').val( current.data('permalink') );
            $('#carousel-reblog-box input#carousel-reblog-post-title').val( $('div.jp-carousel-info').children('h2').text() );

            $('div.jp-carousel-info').append( $('#carousel-reblog-box') ).children().fadeOut('fast');
            $('#carousel-reblog-box').fadeIn('fast');
        },

        hide_reblog_box: function () {
            $( 'div.jp-carousel-info' ).children().not( '#carousel-reblog-box' ).fadeIn( 'fast' );
            $( '#carousel-reblog-box' ).fadeOut( 'fast' );
        },
// @end-hide-in-jetpack
		originalDimensions: function () {
			var splitted = $( this ).data( 'orig-size' ).split( ',' );
			return { width: parseInt( splitted[ 0 ], 10 ), height: parseInt( splitted[ 1 ], 10 ) };
		},

		format: function ( args ) {
			if ( 'object' !== typeof args ) {
				args = {};
			}
			if ( ! args.text || 'undefined' === typeof args.text ) {
				return;
			}
			if ( ! args.replacements || 'undefined' === typeof args.replacements ) {
				return args.text;
			}
			return args.text.replace( /{(\d+)}/g, function ( match, number ) {
				return typeof args.replacements[ number ] !== 'undefined'
					? args.replacements[ number ]
					: match;
			} );
		},

		/**
		 * Returns a number in a fraction format that represents the shutter speed.
		 * @param Number speed
		 * @return String
		 */
		shutterSpeed: function ( speed ) {
			var denominator;

			// round to one decimal if value > 1s by multiplying it by 10, rounding, then dividing by 10 again
			if ( speed >= 1 ) {
				return Math.round( speed * 10 ) / 10 + 's';
			}

			// If the speed is less than one, we find the denominator by inverting
			// the number. Since cameras usually use rational numbers as shutter
			// speeds, we should get a nice round number. Or close to one in cases
			// like 1/30. So we round it.
			denominator = Math.round( 1 / speed );

			return '1/' + denominator + 's';
		},

		parseTitleDesc: function ( value ) {
			if ( ! value.match( ' ' ) && value.match( '_' ) ) {
				return '';
			}

			return value;
		},

		getTitleDesc: function ( data ) {
			var title = '',
				desc = '',
				markup = '',
				target;

			target = $( 'div.jp-carousel-titleanddesc', 'div.jp-carousel-wrap' );
			target.hide();

			title = gallery.jp_carousel( 'parseTitleDesc', data.title ) || '';
			desc = gallery.jp_carousel( 'parseTitleDesc', data.desc ) || '';

			if ( title.length || desc.length ) {
				// Convert from HTML to plain text (including HTML entities decode, etc)
				if ( $( '<div />' ).html( title ).text() === $( '<div />' ).html( desc ).text() ) {
					title = '';
				}

				markup = title.length
					? '<div class="jp-carousel-titleanddesc-title">' + title + '</div>'
					: '';
				markup += desc.length
					? '<div class="jp-carousel-titleanddesc-desc">' + desc + '</div>'
					: '';

				target.html( markup ).fadeIn( 'slow' );
			}

			$( 'div#jp-carousel-comment-form-container' ).css( 'margin-top', '20px' );
			$( 'div#jp-carousel-comments-loading' ).css( 'margin-top', '20px' );
		},

		// updateExif updates the contents of the exif UL (.jp-carousel-image-exif)
		updateExif: function ( meta ) {
			if ( ! meta || 1 !== Number( jetpackCarouselStrings.display_exif ) ) {
				return false;
			}

			var $ul = $( "<ul class='jp-carousel-image-exif'></ul>" );

			$.each( meta, function ( key, val ) {
				if (
					0 === parseFloat( val ) ||
					! val.length ||
					-1 === $.inArray( key, $.makeArray( jetpackCarouselStrings.meta_data ) )
				) {
					return;
				}

				switch ( key ) {
					case 'focal_length':
						val = val + 'mm';
						break;
					case 'shutter_speed':
						val = gallery.jp_carousel( 'shutterSpeed', val );
						break;
					case 'aperture':
						val = 'f/' + val;
						break;
				}

				$ul.append( '<li><h5>' + jetpackCarouselStrings[ key ] + '</h5>' + val + '</li>' );
			} );

			// Update (replace) the content of the ul
			$( 'div.jp-carousel-image-meta ul.jp-carousel-image-exif' ).replaceWith( $ul );
		},

		// updateFullSizeLink updates the contents of the jp-carousel-image-download link
		updateFullSizeLink: function ( current ) {
			if ( ! current || ! current.data ) {
				return false;
			}
			var original,
				origSize = current.data( 'orig-size' ).split( ',' ),
				imageLinkParser = document.createElement( 'a' );

			imageLinkParser.href = current.data( 'src' ).replace( /\?.+$/, '' );

			// Is this a Photon URL?
			if ( imageLinkParser.hostname.match( /^i[\d]{1}.wp.com$/i ) !== null ) {
				original = imageLinkParser.href;
			} else {
				original = current.data( 'orig-file' ).replace( /\?.+$/, '' );
			}

			var permalink = $(
				'<a>' +
					gallery.jp_carousel( 'format', {
						text: jetpackCarouselStrings.download_original,
						replacements: origSize,
					} ) +
					'</a>'
			)
				.addClass( 'jp-carousel-image-download' )
				.attr( 'href', original )
				.attr( 'target', '_blank' );

			// Update (replace) the content of the anchor
			$( 'div.jp-carousel-image-meta a.jp-carousel-image-download' ).replaceWith( permalink );
		},

		updateMap: function ( meta ) {
			if (
				! meta.latitude ||
				! meta.longitude ||
				1 !== Number( jetpackCarouselStrings.display_geo )
			) {
				return;
			}

			var latitude = meta.latitude,
				longitude = meta.longitude,
				$metabox = $( 'div.jp-carousel-image-meta', 'div.jp-carousel-wrap' ),
				$mapbox = $( '<div></div>' ),
				style =
					'&scale=2&style=feature:all|element:all|invert_lightness:true|hue:0x0077FF|saturation:-50|lightness:-5|gamma:0.91';

			$mapbox
				.addClass( 'jp-carousel-image-map' )
				.html(
					'<img width="154" height="154" src="https://maps.googleapis.com/maps/api/staticmap?\
							center=' +
						latitude +
						',' +
						longitude +
						'&\
							zoom=8&\
							size=154x154&\
							sensor=false&\
							markers=size:medium%7Ccolor:blue%7C' +
						latitude +
						',' +
						longitude +
						style +
						'" class="gmap-main" />\
							\
						<div class="gmap-topright"><div class="imgclip"><img width="175" height="154" src="https://maps.googleapis.com/maps/api/staticmap?\
							center=' +
						latitude +
						',' +
						longitude +
						'&\
							zoom=3&\
							size=175x154&\
							sensor=false&\
							markers=size:small%7Ccolor:blue%7C' +
						latitude +
						',' +
						longitude +
						style +
						'"c /></div></div>\
							\
						'
				)
				.prependTo( $metabox );
		},

		testCommentsOpened: function ( opened ) {
			if ( 1 === parseInt( opened, 10 ) ) {
// @start-hide-in-jetpack
				if ( 1 === Number( jetpackCarouselStrings.is_logged_in ) ) {
					$('.jp-carousel-commentlink').fadeIn('fast');
				} else {
// @end-hide-in-jetpack
				$( '.jp-carousel-buttons' ).fadeIn( 'fast' );
// @start-hide-in-jetpack
				}
// @end-hide-in-jetpack
				commentForm.fadeIn( 'fast' );
			} else {
// @start-hide-in-jetpack
				if ( 1 === Number( jetpackCarouselStrings.is_logged_in ) ) {
					$('.jp-carousel-commentlink').fadeOut('fast');
				} else {
// @end-hide-in-jetpack
				$( '.jp-carousel-buttons' ).fadeOut( 'fast' );
// @start-hide-in-jetpack
				}
// @end-hide-in-jetpack
				commentForm.fadeOut( 'fast' );
			}
		},

		getComments: function ( args ) {
			clearInterval( commentInterval );

			if ( 'object' !== typeof args ) {
				return;
			}

			if ( 'undefined' === typeof args.attachment_id || ! args.attachment_id ) {
				return;
			}

			if ( ! args.offset || 'undefined' === typeof args.offset || args.offset < 1 ) {
				args.offset = 0;
			}

			var comments = $( '.jp-carousel-comments' ),
				commentsLoading = $( '#jp-carousel-comments-loading' ).show();

			if ( args.clear ) {
				comments.hide().empty();
			}

			$.ajax( {
				type: 'GET',
				url: jetpackCarouselStrings.ajaxurl,
				dataType: 'json',
				data: {
					action: 'get_attachment_comments',
					nonce: jetpackCarouselStrings.nonce,
					id: args.attachment_id,
					offset: args.offset,
				},
				success: function ( data /*, status, xhr*/ ) {
					if ( args.clear ) {
						comments.fadeOut( 'fast' ).empty();
					}

					$( data ).each( function () {
						var comment = $( '<div></div>' )
							.addClass( 'jp-carousel-comment' )
							.attr( 'id', 'jp-carousel-comment-' + this[ 'id' ] )
							.html(
								'<div class="comment-gravatar">' +
									this[ 'gravatar_markup' ] +
									'</div>' +
									'<div class="comment-author">' +
									this[ 'author_markup' ] +
									'</div>' +
									'<div class="comment-date">' +
									this[ 'date_gmt' ] +
									'</div>' +
									'<div class="comment-content">' +
									this[ 'content' ] +
									'</div>'
							);
						comments.append( comment );

						// Set the interval to check for a new page of comments.
						clearInterval( commentInterval );
						commentInterval = setInterval( function () {
							if (
								$( '.jp-carousel-overlay' ).height() - 150 <
								$( '.jp-carousel-wrap' ).scrollTop() + $( window ).height()
							) {
								gallery.jp_carousel( 'getComments', {
									attachment_id: args.attachment_id,
									offset: args.offset + 10,
									clear: false,
								} );
								clearInterval( commentInterval );
							}
						}, 300 );
					} );

					// Verify (late) that the user didn't repeatldy click the arrows really fast, in which case the requested
					// attachment id might no longer match the current attachment id by the time we get the data back or a now
					// registered infiniscroll event kicks in, so we don't ever display comments for the wrong image by mistake.
					var current = $( '.jp-carousel div.selected' );
					if ( current && current.data && current.data( 'attachment-id' ) != args.attachment_id ) {
						comments.fadeOut( 'fast' );
						comments.empty();
						return;
					}

					// Increase the height of the background, semi-transparent overlay to match the new length of the comments list.
					$( '.jp-carousel-overlay' ).height(
						$( window ).height() +
							titleAndDescription.height() +
							commentForm.height() +
							( comments.height() > 0 ? comments.height() : imageMeta.height() ) +
							200
					);

					comments.show();
					commentsLoading.hide();
				},
				error: function ( xhr, status, error ) {
					// TODO: proper error handling
					console.log( 'Comment get fail...', xhr, status, error );
					comments.fadeIn( 'fast' );
					commentsLoading.fadeOut( 'fast' );
				},
			} );
		},

		postCommentError: function ( args ) {
			if ( 'object' !== typeof args ) {
				args = {};
			}
			if (
				! args.field ||
				'undefined' === typeof args.field ||
				! args.error ||
				'undefined' === typeof args.error
			) {
				return;
			}
			$( '#jp-carousel-comment-post-results' )
				.slideUp( 'fast' )
				.html( '<span class="jp-carousel-comment-post-error">' + args.error + '</span>' )
				.slideDown( 'fast' );
			$( '#jp-carousel-comment-form-spinner' ).hide();
		},

		setCommentIframeSrc: function ( attachment_id ) {
			var iframe = $( '#jp-carousel-comment-iframe' );
			// Set the proper irame src for the current attachment id
			if ( iframe && iframe.length ) {
				iframe.attr( 'src', iframe.attr( 'src' ).replace( /(postid=)\d+/, '$1' + attachment_id ) );
				iframe.attr(
					'src',
					iframe.attr( 'src' ).replace( /(%23.+)?$/, '%23jp-carousel-' + attachment_id )
				);
			}
		},

		clearCommentTextAreaValue: function () {
			var commentTextArea = $( '#jp-carousel-comment-form-comment-field' );
			if ( commentTextArea ) {
				commentTextArea.val( '' );
			}
		},

		nextSlide: function () {
			var slides = this.jp_carousel( 'slides' );
			var selected = this.jp_carousel( 'selectedSlide' );

			if ( selected.length === 0 || ( slides.length > 2 && selected.is( slides.last() ) ) ) {
				return slides.first();
			}

			return selected.next();
		},

		prevSlide: function () {
			var slides = this.jp_carousel( 'slides' );
			var selected = this.jp_carousel( 'selectedSlide' );

			if ( selected.length === 0 || ( slides.length > 2 && selected.is( slides.first() ) ) ) {
				return slides.last();
			}

			return selected.prev();
		},

		loadFullImage: function ( slide ) {
			var image = slide.find( 'img:first' );

			if ( ! image.data( 'loaded' ) ) {
				// If the width of the slide is smaller than the width of the "thumbnail" we're already using,
				// don't load the full image.

				image.on( 'load.jetpack', function () {
					image.off( 'load.jetpack' );
					$( this ).closest( '.jp-carousel-slide' ).css( 'background-image', '' );
				} );

				if (
					! slide.data( 'preview-image' ) ||
					( slide.data( 'thumb-size' ) && slide.width() > slide.data( 'thumb-size' ).width )
				) {
					image
						.attr( 'src', image.closest( '.jp-carousel-slide' ).data( 'src' ) )
						.attr( 'itemprop', 'image' );
				} else {
					image.attr( 'src', slide.data( 'preview-image' ) ).attr( 'itemprop', 'image' );
				}

				image.data( 'loaded', 1 );
			}
		},

		hasMultipleImages: function () {
			return gallery.jp_carousel( 'slides' ).length > 1;
		},
	};

	$.fn.jp_carousel = function ( method ) {
		// ask for the HTML of the gallery
		// Method calling logic
		if ( methods[ method ] ) {
			return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ) );
		} else if ( typeof method === 'object' || ! method ) {
			return methods.open.apply( this, arguments );
		} else {
			$.error( 'Method ' + method + ' does not exist on jQuery.jp_carousel' );
		}
	};

	// register the event listener for starting the gallery
	$( document.body ).on(
		'click.jp-carousel',
		'div.gallery, div.tiled-gallery, ul.wp-block-gallery, ul.blocks-gallery-grid, div.wp-block-jetpack-tiled-gallery, a.single-image-gallery',
		function ( e ) {
			if ( ! $( this ).jp_carousel( 'testForData', e.currentTarget ) ) {
				return;
			}

			// Do not open the modal if we are looking at a gallery caption from before WP5, which may contain a link.
			if ( $( e.target ).parent().hasClass( 'gallery-caption' ) ) {
				return;
			}

			// Do not open the modal if we are looking at a caption of a gallery block, which may contain a link.
			if ( $( e.target ).parent().is( 'figcaption' ) ) {
				return;
			}

			// Set height to auto
			// Fix some themes where closing carousel brings view back to top
			$( 'html' ).css( 'height', 'auto' );

			e.preventDefault();

			// Stopping propagation in case there are parent elements
			// with .gallery or .tiled-gallery class
			e.stopPropagation();
			$( this ).jp_carousel( 'open', {
				start_index: $( this )
					.find( '.gallery-item, .tiled-gallery-item, .blocks-gallery-item, .tiled-gallery__item' )
					.index(
						$( e.target ).parents(
							'.gallery-item, .tiled-gallery-item, .blocks-gallery-item, .tiled-gallery__item'
						)
					),
			} );
		}
	);

	// handle lightbox (single image gallery) for images linking to 'Attachment Page'
	if ( 1 === Number( jetpackCarouselStrings.single_image_gallery ) ) {
		processSingleImageGallery();
		$( document.body ).on( 'post-load', function () {
			processSingleImageGallery();
		} );
	}

	// Makes carousel work on page load and when back button leads to same URL with carousel hash (ie: no actual document.ready trigger)
	$( window ).on( 'hashchange.jp-carousel', function () {
		var hashRegExp = /jp-carousel-(\d+)/,
			matches,
			attachmentId,
			galleries,
			selectedThumbnail;

		if ( ! window.location.hash || ! hashRegExp.test( window.location.hash ) ) {
			if ( gallery && gallery.opened ) {
				container.jp_carousel( 'close' );
			}

			return;
		}

		if ( window.location.hash === last_known_location_hash && gallery.opened ) {
			return;
		}

		if ( window.location.hash && gallery && ! gallery.opened && history.back ) {
			history.back();
			return;
		}

		last_known_location_hash = window.location.hash;
		matches = window.location.hash.match( hashRegExp );
		attachmentId = parseInt( matches[ 1 ], 10 );
		galleries = $(
			'div.gallery, div.tiled-gallery, a.single-image-gallery, ul.wp-block-gallery, div.wp-block-jetpack-tiled-gallery'
		);

		// Find the first thumbnail that matches the attachment ID in the location
		// hash, then open the gallery that contains it.
		galleries.each( function ( _, galleryEl ) {
			$( galleryEl )
				.find( 'img' )
				.each( function ( imageIndex, imageEl ) {
					if ( $( imageEl ).data( 'attachment-id' ) === parseInt( attachmentId, 10 ) ) {
						selectedThumbnail = { index: imageIndex, gallery: galleryEl };
						return false;
					}
				} );

			if ( selectedThumbnail ) {
				$( selectedThumbnail.gallery ).jp_carousel( 'openOrSelectSlide', selectedThumbnail.index );
				return false;
			}
		} );
	} );

	if ( window.location.hash ) {
		$( window ).trigger( 'hashchange' );
	}
} );

/**
 * jQuery Plugin to obtain touch gestures from iPhone, iPod Touch and iPad, should also work with Android mobile phones (not tested yet!)
 * Common usage: wipe images (left and right to show the previous or next image)
 *
 * @author Andreas Waltl, netCU Internetagentur (http://www.netcu.de)
 * Version 1.1.1, modified to pass the touchmove event to the callbacks.
 */
( function ( $ ) {
	$.fn.touchwipe = function ( settings ) {
		var config = {
			min_move_x: 20,
			min_move_y: 20,
			wipeLeft: function (/*e*/) {},
			wipeRight: function (/*e*/) {},
			wipeUp: function (/*e*/) {},
			wipeDown: function (/*e*/) {},
			preventDefaultEvents: true,
		};

		if ( settings ) {
			$.extend( config, settings );
		}

		this.each( function () {
			var startX;
			var startY;
			var isMoving = false;

			function cancelTouch() {
				this.removeEventListener( 'touchmove', onTouchMove );
				startX = null;
				isMoving = false;
			}

			function onTouchMove( e ) {
				if ( config.preventDefaultEvents ) {
					e.preventDefault();
				}
				if ( isMoving ) {
					var x = e.touches[ 0 ].pageX;
					var y = e.touches[ 0 ].pageY;
					var dx = startX - x;
					var dy = startY - y;
					if ( Math.abs( dx ) >= config.min_move_x ) {
						cancelTouch();
						if ( dx > 0 ) {
							config.wipeLeft( e );
						} else {
							config.wipeRight( e );
						}
					} else if ( Math.abs( dy ) >= config.min_move_y ) {
						cancelTouch();
						if ( dy > 0 ) {
							config.wipeDown( e );
						} else {
							config.wipeUp( e );
						}
					}
				}
			}

			function onTouchStart( e ) {
				if ( e.touches.length === 1 ) {
					startX = e.touches[ 0 ].pageX;
					startY = e.touches[ 0 ].pageY;
					isMoving = true;
					this.addEventListener( 'touchmove', onTouchMove, false );
				}
			}
			if ( 'ontouchstart' in document.documentElement ) {
				this.addEventListener( 'touchstart', onTouchStart, false );
			}
		} );

		return this;
	};
} )( jQuery );
;
/*	SWFObject v2.2 <http://code.google.com/p/swfobject/> 
	is released under the MIT License <http://www.opensource.org/licenses/mit-license.php> 
*/
var swfobject=function(){var D="undefined",r="object",S="Shockwave Flash",W="ShockwaveFlash.ShockwaveFlash",q="application/x-shockwave-flash",R="SWFObjectExprInst",x="onreadystatechange",O=window,j=document,t=navigator,T=false,U=[h],o=[],N=[],I=[],l,Q,E,B,J=false,a=false,n,G,m=true,M=function(){var aa=typeof j.getElementById!=D&&typeof j.getElementsByTagName!=D&&typeof j.createElement!=D,ah=t.userAgent.toLowerCase(),Y=t.platform.toLowerCase(),ae=Y?/win/.test(Y):/win/.test(ah),ac=Y?/mac/.test(Y):/mac/.test(ah),af=/webkit/.test(ah)?parseFloat(ah.replace(/^.*webkit\/(\d+(\.\d+)?).*$/,"$1")):false,X=!+"\v1",ag=[0,0,0],ab=null;if(typeof t.plugins!=D&&typeof t.plugins[S]==r){ab=t.plugins[S].description;if(ab&&!(typeof t.mimeTypes!=D&&t.mimeTypes[q]&&!t.mimeTypes[q].enabledPlugin)){T=true;X=false;ab=ab.replace(/^.*\s+(\S+\s+\S+$)/,"$1");ag[0]=parseInt(ab.replace(/^(.*)\..*$/,"$1"),10);ag[1]=parseInt(ab.replace(/^.*\.(.*)\s.*$/,"$1"),10);ag[2]=/[a-zA-Z]/.test(ab)?parseInt(ab.replace(/^.*[a-zA-Z]+(.*)$/,"$1"),10):0}}else{if(typeof O.ActiveXObject!=D){try{var ad=new ActiveXObject(W);if(ad){ab=ad.GetVariable("$version");if(ab){X=true;ab=ab.split(" ")[1].split(",");ag=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}}catch(Z){}}}return{w3:aa,pv:ag,wk:af,ie:X,win:ae,mac:ac}}(),k=function(){if(!M.w3){return}if((typeof j.readyState!=D&&j.readyState=="complete")||(typeof j.readyState==D&&(j.getElementsByTagName("body")[0]||j.body))){f()}if(!J){if(typeof j.addEventListener!=D){j.addEventListener("DOMContentLoaded",f,false)}if(M.ie&&M.win){j.attachEvent(x,function(){if(j.readyState=="complete"){j.detachEvent(x,arguments.callee);f()}});if(O==top){(function(){if(J){return}try{j.documentElement.doScroll("left")}catch(X){setTimeout(arguments.callee,0);return}f()})()}}if(M.wk){(function(){if(J){return}if(!/loaded|complete/.test(j.readyState)){setTimeout(arguments.callee,0);return}f()})()}s(f)}}();function f(){if(J){return}try{var Z=j.getElementsByTagName("body")[0].appendChild(C("span"));Z.parentNode.removeChild(Z)}catch(aa){return}J=true;var X=U.length;for(var Y=0;Y<X;Y++){U[Y]()}}function K(X){if(J){X()}else{U[U.length]=X}}function s(Y){if(typeof O.addEventListener!=D){O.addEventListener("load",Y,false)}else{if(typeof j.addEventListener!=D){j.addEventListener("load",Y,false)}else{if(typeof O.attachEvent!=D){i(O,"onload",Y)}else{if(typeof O.onload=="function"){var X=O.onload;O.onload=function(){X();Y()}}else{O.onload=Y}}}}}function h(){if(T){V()}else{H()}}function V(){var X=j.getElementsByTagName("body")[0];var aa=C(r);aa.setAttribute("type",q);var Z=X.appendChild(aa);if(Z){var Y=0;(function(){if(typeof Z.GetVariable!=D){var ab=Z.GetVariable("$version");if(ab){ab=ab.split(" ")[1].split(",");M.pv=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}else{if(Y<10){Y++;setTimeout(arguments.callee,10);return}}X.removeChild(aa);Z=null;H()})()}else{H()}}function H(){var ag=o.length;if(ag>0){for(var af=0;af<ag;af++){var Y=o[af].id;var ab=o[af].callbackFn;var aa={success:false,id:Y};if(M.pv[0]>0){var ae=c(Y);if(ae){if(F(o[af].swfVersion)&&!(M.wk&&M.wk<312)){w(Y,true);if(ab){aa.success=true;aa.ref=z(Y);ab(aa)}}else{if(o[af].expressInstall&&A()){var ai={};ai.data=o[af].expressInstall;ai.width=ae.getAttribute("width")||"0";ai.height=ae.getAttribute("height")||"0";if(ae.getAttribute("class")){ai.styleclass=ae.getAttribute("class")}if(ae.getAttribute("align")){ai.align=ae.getAttribute("align")}var ah={};var X=ae.getElementsByTagName("param");var ac=X.length;for(var ad=0;ad<ac;ad++){if(X[ad].getAttribute("name").toLowerCase()!="movie"){ah[X[ad].getAttribute("name")]=X[ad].getAttribute("value")}}P(ai,ah,Y,ab)}else{p(ae);if(ab){ab(aa)}}}}}else{w(Y,true);if(ab){var Z=z(Y);if(Z&&typeof Z.SetVariable!=D){aa.success=true;aa.ref=Z}ab(aa)}}}}}function z(aa){var X=null;var Y=c(aa);if(Y&&Y.nodeName=="OBJECT"){if(typeof Y.SetVariable!=D){X=Y}else{var Z=Y.getElementsByTagName(r)[0];if(Z){X=Z}}}return X}function A(){return !a&&F("6.0.65")&&(M.win||M.mac)&&!(M.wk&&M.wk<312)}function P(aa,ab,X,Z){a=true;E=Z||null;B={success:false,id:X};var ae=c(X);if(ae){if(ae.nodeName=="OBJECT"){l=g(ae);Q=null}else{l=ae;Q=X}aa.id=R;if(typeof aa.width==D||(!/%$/.test(aa.width)&&parseInt(aa.width,10)<310)){aa.width="310"}if(typeof aa.height==D||(!/%$/.test(aa.height)&&parseInt(aa.height,10)<137)){aa.height="137"}j.title=j.title.slice(0,47)+" - Flash Player Installation";var ad=M.ie&&M.win?"ActiveX":"PlugIn",ac="MMredirectURL="+encodeURI(O.location).toString().replace(/&/g,"%26")+"&MMplayerType="+ad+"&MMdoctitle="+j.title;if(typeof ab.flashvars!=D){ab.flashvars+="&"+ac}else{ab.flashvars=ac}if(M.ie&&M.win&&ae.readyState!=4){var Y=C("div");X+="SWFObjectNew";Y.setAttribute("id",X);ae.parentNode.insertBefore(Y,ae);ae.style.display="none";(function(){if(ae.readyState==4){ae.parentNode.removeChild(ae)}else{setTimeout(arguments.callee,10)}})()}u(aa,ab,X)}}function p(Y){if(M.ie&&M.win&&Y.readyState!=4){var X=C("div");Y.parentNode.insertBefore(X,Y);X.parentNode.replaceChild(g(Y),X);Y.style.display="none";(function(){if(Y.readyState==4){Y.parentNode.removeChild(Y)}else{setTimeout(arguments.callee,10)}})()}else{Y.parentNode.replaceChild(g(Y),Y)}}function g(ab){var aa=C("div");if(M.win&&M.ie){aa.innerHTML=ab.innerHTML}else{var Y=ab.getElementsByTagName(r)[0];if(Y){var ad=Y.childNodes;if(ad){var X=ad.length;for(var Z=0;Z<X;Z++){if(!(ad[Z].nodeType==1&&ad[Z].nodeName=="PARAM")&&!(ad[Z].nodeType==8)){aa.appendChild(ad[Z].cloneNode(true))}}}}}return aa}function u(ai,ag,Y){var X,aa=c(Y);if(M.wk&&M.wk<312){return X}if(aa){if(typeof ai.id==D){ai.id=Y}if(M.ie&&M.win){var ah="";for(var ae in ai){if(ai[ae]!=Object.prototype[ae]){if(ae.toLowerCase()=="data"){ag.movie=ai[ae]}else{if(ae.toLowerCase()=="styleclass"){ah+=' class="'+ai[ae]+'"'}else{if(ae.toLowerCase()!="classid"){ah+=" "+ae+'="'+ai[ae]+'"'}}}}}var af="";for(var ad in ag){if(ag[ad]!=Object.prototype[ad]){af+='<param name="'+ad+'" value="'+ag[ad]+'" />'}}aa.outerHTML='<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"'+ah+">"+af+"</object>";N[N.length]=ai.id;X=c(ai.id)}else{var Z=C(r);Z.setAttribute("type",q);for(var ac in ai){if(ai[ac]!=Object.prototype[ac]){if(ac.toLowerCase()=="styleclass"){Z.setAttribute("class",ai[ac])}else{if(ac.toLowerCase()!="classid"){Z.setAttribute(ac,ai[ac])}}}}for(var ab in ag){if(ag[ab]!=Object.prototype[ab]&&ab.toLowerCase()!="movie"){e(Z,ab,ag[ab])}}aa.parentNode.replaceChild(Z,aa);X=Z}}return X}function e(Z,X,Y){var aa=C("param");aa.setAttribute("name",X);aa.setAttribute("value",Y);Z.appendChild(aa)}function y(Y){var X=c(Y);if(X&&X.nodeName=="OBJECT"){if(M.ie&&M.win){X.style.display="none";(function(){if(X.readyState==4){b(Y)}else{setTimeout(arguments.callee,10)}})()}else{X.parentNode.removeChild(X)}}}function b(Z){var Y=c(Z);if(Y){for(var X in Y){if(typeof Y[X]=="function"){Y[X]=null}}Y.parentNode.removeChild(Y)}}function c(Z){var X=null;try{X=j.getElementById(Z)}catch(Y){}return X}function C(X){return j.createElement(X)}function i(Z,X,Y){Z.attachEvent(X,Y);I[I.length]=[Z,X,Y]}function F(Z){var Y=M.pv,X=Z.split(".");X[0]=parseInt(X[0],10);X[1]=parseInt(X[1],10)||0;X[2]=parseInt(X[2],10)||0;return(Y[0]>X[0]||(Y[0]==X[0]&&Y[1]>X[1])||(Y[0]==X[0]&&Y[1]==X[1]&&Y[2]>=X[2]))?true:false}function v(ac,Y,ad,ab){if(M.ie&&M.mac){return}var aa=j.getElementsByTagName("head")[0];if(!aa){return}var X=(ad&&typeof ad=="string")?ad:"screen";if(ab){n=null;G=null}if(!n||G!=X){var Z=C("style");Z.setAttribute("type","text/css");Z.setAttribute("media",X);n=aa.appendChild(Z);if(M.ie&&M.win&&typeof j.styleSheets!=D&&j.styleSheets.length>0){n=j.styleSheets[j.styleSheets.length-1]}G=X}if(M.ie&&M.win){if(n&&typeof n.addRule==r){n.addRule(ac,Y)}}else{if(n&&typeof j.createTextNode!=D){n.appendChild(j.createTextNode(ac+" {"+Y+"}"))}}}function w(Z,X){if(!m){return}var Y=X?"visible":"hidden";if(J&&c(Z)){c(Z).style.visibility=Y}else{v("#"+Z,"visibility:"+Y)}}function L(Y){var Z=/[\\\"<>\.;]/;var X=Z.exec(Y)!=null;return X&&typeof encodeURIComponent!=D?encodeURIComponent(Y):Y}var d=function(){if(M.ie&&M.win){window.attachEvent("onunload",function(){var ac=I.length;for(var ab=0;ab<ac;ab++){I[ab][0].detachEvent(I[ab][1],I[ab][2])}var Z=N.length;for(var aa=0;aa<Z;aa++){y(N[aa])}for(var Y in M){M[Y]=null}M=null;for(var X in swfobject){swfobject[X]=null}swfobject=null})}}();return{registerObject:function(ab,X,aa,Z){if(M.w3&&ab&&X){var Y={};Y.id=ab;Y.swfVersion=X;Y.expressInstall=aa;Y.callbackFn=Z;o[o.length]=Y;w(ab,false)}else{if(Z){Z({success:false,id:ab})}}},getObjectById:function(X){if(M.w3){return z(X)}},embedSWF:function(ab,ah,ae,ag,Y,aa,Z,ad,af,ac){var X={success:false,id:ah};if(M.w3&&!(M.wk&&M.wk<312)&&ab&&ah&&ae&&ag&&Y){w(ah,false);K(function(){ae+="";ag+="";var aj={};if(af&&typeof af===r){for(var al in af){aj[al]=af[al]}}aj.data=ab;aj.width=ae;aj.height=ag;var am={};if(ad&&typeof ad===r){for(var ak in ad){am[ak]=ad[ak]}}if(Z&&typeof Z===r){for(var ai in Z){if(typeof am.flashvars!=D){am.flashvars+="&"+ai+"="+Z[ai]}else{am.flashvars=ai+"="+Z[ai]}}}if(F(Y)){var an=u(aj,am,ah);if(aj.id==ah){w(ah,true)}X.success=true;X.ref=an}else{if(aa&&A()){aj.data=aa;P(aj,am,ah,ac);return}else{w(ah,true)}}if(ac){ac(X)}})}else{if(ac){ac(X)}}},switchOffAutoHideShow:function(){m=false},ua:M,getFlashPlayerVersion:function(){return{major:M.pv[0],minor:M.pv[1],release:M.pv[2]}},hasFlashPlayerVersion:F,createSWF:function(Z,Y,X){if(M.w3){return u(Z,Y,X)}else{return undefined}},showExpressInstall:function(Z,aa,X,Y){if(M.w3&&A()){P(Z,aa,X,Y)}},removeSWF:function(X){if(M.w3){y(X)}},createCSS:function(aa,Z,Y,X){if(M.w3){v(aa,Z,Y,X)}},addDomLoadEvent:K,addLoadEvent:s,getQueryParamValue:function(aa){var Z=j.location.search||j.location.hash;if(Z){if(/\?/.test(Z)){Z=Z.split("?")[1]}if(aa==null){return L(Z)}var Y=Z.split("&");for(var X=0;X<Y.length;X++){if(Y[X].substring(0,Y[X].indexOf("="))==aa){return L(Y[X].substring((Y[X].indexOf("=")+1)))}}}return""},expressInstallCallback:function(){if(a){var X=c(R);if(X&&l){X.parentNode.replaceChild(l,X);if(Q){w(Q,true);if(M.ie&&M.win){l.style.display="block"}}if(E){E(B)}}a=false}}}}();;
/*!
 * VideoPress JavaScript Loader 1.09
 *
 * Copyright 2011 Automattic Inc.
 * Licensed under GNU General Public License (GPL) Version 2 or later
 * http://www.gnu.org/licenses/gpl-2.0.html
 */

// jQuery.type() was introduced in 1.4.3, WP 3.0 has 1.4.2 
// To maintain backwards compatibility, insert our own version if it doesn't exist 
if ( typeof jQuery.type != 'function' ) { 
	jQuery.extend({
		class2type: {},
	
		type: function( obj ) { 
	 		return obj == null ? 
	 	    	String( obj ) : 
	 	    	jQuery.class2type[ toString.call(obj) ] || "object"; 
		}
	});
	
	jQuery.each("Boolean Number String Function Array Date RegExp Object".split(" "), function(i, name) { 
	 	jQuery.class2type[ "[object " + name + "]" ] = name.toLowerCase(); 
	}); 
	
} 

jQuery.extend({VideoPress: {
	error:{
		messages:{
			age:"You are of insufficient age to view this video.",
			error:"Unable to download and play video",
			flash:"Error loading Flash on your system",
			freedom:'You do not have sufficient <a href="http://www.gnu.org/philosophy/free-sw.html">Freedom levels</a> to view this video.',
			incompatible:'VideoPress requires either HTML5 video or <a href="http://www.adobe.com/go/getflashplayer">Adobe Flash Player 10</a> or above for playback.',
			incapable:"Your device is incapable of playing the requested video.",
			network:"A network error prevented video download and playback"
		}
	},
	support:{
		flash: function() {
			if ( typeof swfobject !== "undefined" && swfobject.hasFlashPlayerVersion( jQuery.VideoPress.video.flash.min_version ) ) {
				return true;
			} else {
				return false;
			}
		},
		html5Video: function(sourcetype) {
			var v = document.createElement("video");
			if ( !!v.canPlayType ) {
				if ( jQuery.type(sourcetype)==="string" ) {
					return !!v.canPlayType(sourcetype).replace(/no/,"");
				}
				return true;
			} else {
				return false;
			}
		}
	},
	data:[],
	analytics:{
		wpcom:{
			base_uri:"//pixel.wp.com/v.gif?",
			params:function(guid, filetype) {
				var data = jQuery.VideoPress.data[guid];
				if ( !jQuery.isPlainObject(data) ) {
					return;
				}

				var params = {blog:data.blog,post:data.post,page_url:top.document.URL};
				if ( filetype==="mp4" && data.mp4 && data.mp4.size ) {
					params.video_fmt = "fmt_" + data.mp4.size;
				} else {
					params.video_fmt = "fmt_std";
				}
				return params;
			},
			send:function(params) {
				var beacon = new Image();
				beacon.src = jQuery.VideoPress.analytics.wpcom.base_uri + jQuery.param(params);
				beacon=null;
			}
		},
		ga:{
			is_active:function(){
				if ( (typeof _gaq !== "undefined") && jQuery.type( _gaq )==="array" ) {
					return true;
				} else {
					return false;
				}
			}
		},
		/*comscore:{
			is_active()function(){
				if ( typeof COMSCORE !== "undefined" )
					return true;
			}
		}*/
		impression:function(guid) {
			var params = jQuery.VideoPress.analytics.wpcom.params( guid, "mp4" );
			if ( !jQuery.isPlainObject( params ) ) {
				return;
			}
			params.video_impression = 1;
			jQuery.VideoPress.analytics.wpcom.send( params );
		},
		played:function(guid, filetype) {
			var params = jQuery.VideoPress.analytics.wpcom.params( guid, filetype );
			if ( !jQuery.isPlainObject( params ) ) {
				return;
			}
			params.video_play = 1;
			jQuery.VideoPress.analytics.wpcom.send( params );

			if ( jQuery.VideoPress.analytics.ga.is_active() ) {
				/* Google Analytics tracks unique events per visit.
				 * Unique video value omitted since two videos on the same page that are both played would only be recorded as one play event.
				 */
				_gaq.push( ["_trackEvent", "Videos", "Play" ] );
			}
		},
		watched:function( guid, filetype, current_time, initial_time ) {
			if ( jQuery.VideoPress.data[guid].playback === undefined ) {
				var start = 0;
				if ( initial_time !== undefined && jQuery.type(initial_time)==="number" && initial_time > 0 ) {
					if ( current_time > initial_time ) {
						start = current_time - initial_time;
					}
				}
				jQuery.VideoPress.data[guid].playback = { last_observed:current_time, time_elapsed:start };
			}
			var time_watched = current_time - jQuery.VideoPress.data[guid].playback.last_observed;
			if ( time_watched > 0 ) {
				jQuery.VideoPress.data[guid].playback.time_elapsed += time_watched;
				jQuery.VideoPress.data[guid].playback.last_observed = current_time;
				if ( jQuery.VideoPress.data[guid].playback.time_elapsed > 15 ) {
					var params = jQuery.VideoPress.analytics.wpcom.params( guid, filetype );
					if ( !jQuery.isPlainObject( params ) ) {
			  			return;
					}
					params.t = 15;
					jQuery.VideoPress.analytics.wpcom.send( params );
					jQuery.VideoPress.data[guid].playback.time_elapsed -= 15;
				} else if ( current_time === jQuery.VideoPress.data[guid].duration ) {
					jQuery.VideoPress.analytics.wpcom.send( params );
					jQuery.VideoPress.data[guid].playback.time_elapsed = 0;
					delete jQuery.VideoPress.data[guid].playback;
				}
			}
		}
	},
	requirements:{
		isSufficientAge: function( container_el, min_age ) {
			var birthday = new Date( parseInt( jQuery( "select[name=year]", container_el ).val() ), parseInt( jQuery( "select[name=month]", container_el ).val() ), parseInt( jQuery( "select[name=day]", container_el ).val() ) );
			var allowed_age = new Date( Date.now() - (1000*60*60*24*365*min_age) );
			if ( birthday > allowed_age ) {
				container_el.html( '<p class="error" style="color:#fff;font-weight:bold">' + jQuery.VideoPress.error.messages.age + "</p>");
			} else {
				jQuery.VideoPress.video.play(container_el);
			}
		},
		allowedDomain: function (allowed_domains) {
			if ( jQuery.type(allowed_domains)==="array" ) {
				if ( jQuery.inArray( top.document.location.hostname, allowed_domains )===-1 ) {
					return false;
				}
			}
			return true;
		}
	},
	video:{
		flash:{
			// Protocol and domain for player_uri and expressinstall set in video.play()
			player_uri: ( 'https:' == location.protocol ? 'https://v0.wordpress.com' : 'http://s0.videopress.com' ) + "/player.swf?v=1.04",
			min_version:"10.0.0",
			params:{wmode:"direct",quality:"autohigh",seamlesstabbing:"true",allowfullscreen:"true",allowscriptaccess:"always",overstretch:"true"},
			expressinstall: ( 'https:' == location.protocol ? 'https://v0.wordpress.com' : 'http://s0.videopress.com' ) + "/playerProductInstall.swf",
			embedCallback: function(event) {
				if ( event.success===false ) {
					jQuery("#" + event.id).html("<p>" + jQuery.VideoPress.error.messages.flash + "</p>");
				}
			}
		},
		types:{mp4:'video/mp4; codecs="avc1.64001E, mp4a.40.2"',ogv:'video/ogg; codecs="theora, vorbis"'},
		canPlay:function () {
			if ( jQuery.VideoPress.support.flash() ) {
				jQuery.VideoPress.video.playerSupport = "flash";
			} else if ( jQuery.VideoPress.support.html5Video() ) {
				if ( jQuery.VideoPress.support.html5Video( jQuery.VideoPress.video.types.mp4 ) ) {
					jQuery.VideoPress.video.playerSupport = "mp4";
				} else if ( jQuery.VideoPress.support.html5Video( jQuery.VideoPress.video.types.ogv ) ) {
					jQuery.VideoPress.video.playerSupport = "ogv";
				} else {
					jQuery.VideoPress.video.playerSupport = "html5";
				}
			} else {
				jQuery.VideoPress.video.playerSupport = "";
			}
		},
		prepare: function ( guid, config, count ) {
			var video = jQuery.VideoPress.data[guid][count];
			if ( config.container === undefined || jQuery.type(video)!=="object" ) {
				return;
			}
			
			var width = 0;
			if ( config.width !== undefined ) {
				width = config.width;
			} else {
				config.container.width();
			}


			var height = 0;
			if ( config.height !== undefined ) {
				height = config.height;
			} else {
				config.container.height();
			}
			
			var div_id = "#v-" + guid + '-' + count;
			
			var parent_width = jQuery( div_id ).parent().width();
			var diffw = 0;
			var diffh = 0;
			var ratio = 0;
			if ( width > parent_width ) {
				diffw = width - parent_width + 11;
				ratio = ( width * 1.0 ) / ( height * 1.0 );
				diffh = diffw / ratio;
				
				width -= diffw;
				height -= Math.round( diffh );
			}
			
			if ( width < 60 || height < 60 ) {
				width = 400;
				height = 300;
			}
			
			jQuery.VideoPress.data[guid][count].dimensions = {};
			
			if( 0 == ratio ) {
				jQuery.VideoPress.data[guid][count].dimensions.width = width;
				jQuery.VideoPress.data[guid][count].dimensions.height = height;
			}
			else {
				jQuery.VideoPress.data[guid][count].dimensions.width = width - 7;
				jQuery.VideoPress.data[guid][count].dimensions.height = height - Math.round( 7 / ratio );
				
				jQuery( div_id ).width( width );
				jQuery( div_id ).height( height + 50 );
	
				jQuery( div_id + "-placeholder" ).width( jQuery.VideoPress.data[guid][count].dimensions.width );
				jQuery( div_id + "-placeholder" ).height( jQuery.VideoPress.data[guid][count].dimensions.height );
	
				jQuery( div_id + "-placeholder img.videopress-poster" ).width( jQuery.VideoPress.data[guid][count].dimensions.width );
				jQuery( div_id + "-placeholder img.videopress-poster" ).height( jQuery.VideoPress.data[guid][count].dimensions.height );
			}

			config.container.data( "guid", guid );
			config.container.data( "count", count );
			if ( jQuery.VideoPress.video.playerSupport === undefined ) {
				jQuery.VideoPress.video.canPlay();
			}

			if ( config.freedom===true && jQuery.type(video.ogv)==="string" ) {
				jQuery.VideoPress.video.insert( config.container, guid, count, video, "ogv", jQuery.VideoPress.data[guid][count].dimensions.width, jQuery.VideoPress.data[guid].dimensions.height );
				config.container.data( "player", "ogv" );
			} else if ( jQuery.VideoPress.video.playerSupport === "flash" ) {
				config.container.data( "player", "flash" );
				config.container.append( '<div id="v-' + guid + "-" + count + '-video">' );
			} else if ( jQuery.inArray( jQuery.VideoPress.video.playerSupport, ["html5","mp4","ogv"] ) && ( jQuery.type(video.mp4.uri)==="string" || jQuery.type(video.ogv.uri)==="string" ) ) {
				var load_type = "html5";
				if ( jQuery.VideoPress.video.playerSupport==="mp4" && video.mp4!==undefined && jQuery.type(video.mp4.uri)==="string" ) {
					load_type = "mp4";
				} else if ( jQuery.VideoPress.video.playerSupport==="ogv" && video.ogv!==undefined && jQuery.type(video.ogv.uri)==="string" ) {
					load_type = "ogv";
				}
				jQuery.VideoPress.video.insert( config.container, guid, count, video, load_type, jQuery.VideoPress.data[guid][count].dimensions.width, jQuery.VideoPress.data[guid][count].dimensions.height );
				config.container.data( "player", load_type );
				load_type=null;
			} else {
				config.container.html('<p class="videopress-error">' + jQuery.VideoPress.error.messages.incompatible + '</p>');
				return false;
			}
			return true;
		},
		insert: function( container_el, guid, count, video_data, video_type, width, height ) {
			var video_id = "v-" + guid + "-" + count + "-video";
			var video_el = jQuery("<video />");
			video_el.attr( "id", video_id );
			video_el.attr( "width", width );
			video_el.attr( "height", height );
			video_el.attr( "poster", video_data.poster );
			if ( video_type==="ogv" ) {
				video_el.attr( "preload", "metadata" );
			} else {
				video_el.attr( "preload", "none" );
			}
			video_el.attr( "controls", "true" );
			video_el.attr( "x-webkit-airplay", "allow" );
			if ( video_type==="mp4" && video_data.mp4!==undefined && jQuery.type(video_data.mp4.uri)==="string" ) {
				video_el.attr( "src", video_data.mp4.uri );
			} else if ( video_type==="ogv" && video_data.ogv!==undefined && jQuery.type(video_data.ogv.uri)==="string" ) {
				video_el.attr( "src", video_data.ogv.uri );
			} else {
				// Purposely omit source type attribute since the browser does not seem to support specifics such as canPlayType
				if ( video_data.mp4!==undefined && jQuery.type(video_data.mp4.uri)==="string" ) {
					video_el.append( '<source src="' + video_data.mp4.uri + '" />' );
				}
				if ( video_data.ogv!==undefined && jQuery.type(video_data.ogv.uri)==="string" ) {
					video_el.append( '<source src="' + video_data.ogv.uri + '" />' );
				}
			}
			
			if ( video_data.tracks !== undefined ) {
				video_el.append( video_data.tracks );
			}
			video_el.append( '<p class="videopress-error">' + jQuery.VideoPress.error.messages.incompatible + "</p>" );
			video_el.hide();
			container_el.append( video_el );
			video_el=null;
			video_id=null;
		},
		play: function( container_el ) {
			var player = container_el.data( "player" );
			if ( player===undefined ) {
				player="flash";
			}

			var guid = container_el.data( "guid" );
			var count = container_el.data( "count" );

			if ( player === "flash" ) {
				jQuery( "#" + container_el.attr("id") + "-placeholder", container_el ).remove();

				var player_uri = jQuery.VideoPress.video.flash.player_uri;
				var expressinstall = jQuery.VideoPress.video.flash.expressinstall;

				swfobject.embedSWF( player_uri, "v-" + guid + "-" + count + "-video", jQuery.VideoPress.data[guid][count].dimensions.width, jQuery.VideoPress.data[guid][count].dimensions.height, jQuery.VideoPress.video.flash.min_version, expressinstall, {guid:guid,autoPlay:"true",isDynamicSeeking:"true",hd:jQuery.VideoPress.data[guid][count].hd}, jQuery.VideoPress.video.flash.params, null, jQuery.VideoPress.video.flash.embedCallback );
			} else if ( jQuery.inArray( player, ["html5", "mp4", "ogv"] ) ) {
				var video_el = jQuery("video", container_el);
				if ( video_el ) {
					jQuery( "#" + container_el.attr("id") + "-placeholder", container_el ).remove();
					if ( player==="html5" ) {
						player = "mp4";
					}
					jQuery.VideoPress.video.playHTML5( video_el, guid, player );
				}
			} else {
				jQuery( "#" + container_el.attr("id") + "-placeholder", container_el ).remove();
				container_el.append( '<p class="videopress-error">Unable to play video. No suitable player.</p>' );
			}

			var play_event = new CustomEvent( 'videopress_play_video', { 'detail': { 'video_id': guid } } );
			window.dispatchEvent( play_event );
		},
		playHTML5: function( video_el, guid, filetype ) {
			video_el.show();
			video_el[0].load();

			/* It seems load() sometimes does not work, but play() will trigger load.
			 * Tried attaching play() to a data event but data might not load
			 * So we trigger play() even if there is not enough data loaded to begin playback
			 */
			video_el[0].play();
			jQuery.VideoPress.analytics.played(guid, filetype);
			video_el.bind( "error stalled", function(e) {
				var message = jQuery.VideoPress.error.messages.error;
				try {
					// provide a more detailed error message if a failure reason is communicated
					switch (e.target.error.code) {
						case e.target.error.MEDIA_ERR_NETWORK:
							message = jQuery.VideoPress.error.messages.network;
							break;
						case e.target.error.MEDIA_ERR_DECODE:
						case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
							message = jQuery.VideoPress.error.messages.incapable + " " + filetype.toUpperCase() + ".";
							break;
						default:
							break;
					}
				} catch( err ){}
				// provide an opportunity to silence an error with an empty string
				if ( message.length > 0 ) {
					video_el.html( '<p class="videopress-error">' + message + "</p>" );
				}
				message=null;
			} );
			video_el.bind( "durationchange", {guid:guid}, function( event ) {
				var duration = jQuery(event.target).attr("duration");
				if ( jQuery.type(duration)==="number" ) {
					jQuery.VideoPress.data[event.data.guid].duration = duration;
				}
				duration=null;
			} );

			/* Only record stats after video data has loaded
			 * If html5 video seems to work but we could not match on a specific codec descriptor then there may be multiple source elements. Browser chooses a source at runtime in source order. We check the loaded video filetype instead of assuming MP4.
			 */
			video_el.one( "loadeddata", {guid:guid, filetype:filetype}, function( event ){
				var filetype = event.data.filetype;
				var loaded_file = jQuery(event.target).attr("currentSrc");
				if ( jQuery.type(loaded_file)==="string" && loaded_file.length > 3 ) {
					var ext = loaded_file.substr( loaded_file.lastIndexOf(".") + 1 ).toLowerCase();
					if ( jQuery.inArray( ext, ["mp4","ogv"] ) ) {
						filetype = ext;
					}
					ext=null;
				}
				video_el.bind( "play", {guid:event.data.guid,filetype:filetype}, function( event ) {
					jQuery.VideoPress.analytics.played(event.data.guid, event.data.filetype);
				} );
				video_el.bind( "timeupdate", {guid:event.data.guid,filetype:filetype}, function( event ) {
					var target = jQuery(event.target);
					jQuery.VideoPress.analytics.watched( event.data.guid, event.data.filetype, target.attr("currentTime"), target.attr("initialTime") );
					target=null;
				} );
				video_el.bind( "ended", {guid:event.data.guid,filetype:filetype}, function( event ) {
					jQuery.VideoPress.analytics.watched( event.data.guid, event.data.filetype, jQuery.VideoPress.data[guid].duration, jQuery(event.target).attr("initialTime") );
				} );
			} );
		}
	}
}});
;
( function ( $ ) {
	function TiledGalleryCollection() {
		this.galleries = [];
		this.findAndSetupNewGalleries();
	}

	TiledGalleryCollection.prototype.findAndSetupNewGalleries = function () {
		var self = this;
		$( '.tiled-gallery.tiled-gallery-unresized' ).each( function () {
			self.galleries.push( new TiledGallery( $( this ) ) );
		} );
	};

	TiledGalleryCollection.prototype.resizeAll = function () {
		$.each( this.galleries, function ( i, gallery ) {
			gallery.resize();
		} );
	};

	function TiledGallery( galleryElem ) {
		this.gallery = galleryElem;

		this.addCaptionEvents();

		// Resize when initialized to fit the gallery to window dimensions
		this.resize();

		// Displays the gallery and prevents it from being initialized again
		this.gallery.removeClass( 'tiled-gallery-unresized' );
	}

	/**
	 * Selector for all resizeable elements inside a Tiled Gallery
	 */

	TiledGallery.prototype.resizeableElementsSelector =
		'.gallery-row, .gallery-group, .tiled-gallery-item img';

	/**
	 * Story
	 */

	TiledGallery.prototype.addCaptionEvents = function () {
		// Hide captions
		this.gallery.find( '.tiled-gallery-caption' ).hide();

		// Add hover effects to bring the caption up and down for each item
		this.gallery.find( '.tiled-gallery-item' ).hover(
			function () {
				$( this ).find( '.tiled-gallery-caption' ).stop( true, true ).slideDown( 'fast' );
			},
			function () {
				$( this ).find( '.tiled-gallery-caption' ).stop( true, true ).slideUp( 'fast' );
			}
		);
	};

	TiledGallery.prototype.getExtraDimension = function ( el, attribute, mode ) {
		if ( mode === 'horizontal' ) {
			var left = attribute === 'border' ? 'borderLeftWidth' : attribute + 'Left';
			var right = attribute === 'border' ? 'borderRightWidth' : attribute + 'Right';
			return ( parseInt( el.css( left ), 10 ) || 0 ) + ( parseInt( el.css( right ), 10 ) || 0 );
		} else if ( mode === 'vertical' ) {
			var top = attribute === 'border' ? 'borderTopWidth' : attribute + 'Top';
			var bottom = attribute === 'border' ? 'borderBottomWidth' : attribute + 'Bottom';
			return ( parseInt( el.css( top ), 10 ) || 0 ) + ( parseInt( el.css( bottom ), 10 ) || 0 );
		} else {
			return 0;
		}
	};

	TiledGallery.prototype.resize = function () {
		// Resize everything in the gallery based on the ratio of the current content width
		// to the original content width;
		var originalWidth = this.gallery.data( 'original-width' );
		var currentWidth = this.gallery.parent().width();
		var resizeRatio = Math.min( 1, currentWidth / originalWidth );

		var self = this;
		this.gallery.find( this.resizeableElementsSelector ).each( function () {
			var thisGalleryElement = $( this );

			var marginWidth = self.getExtraDimension( thisGalleryElement, 'margin', 'horizontal' );
			var marginHeight = self.getExtraDimension( thisGalleryElement, 'margin', 'vertical' );

			var paddingWidth = self.getExtraDimension( thisGalleryElement, 'padding', 'horizontal' );
			var paddingHeight = self.getExtraDimension( thisGalleryElement, 'padding', 'vertical' );

			var borderWidth = self.getExtraDimension( thisGalleryElement, 'border', 'horizontal' );
			var borderHeight = self.getExtraDimension( thisGalleryElement, 'border', 'vertical' );

			// Take all outer dimensions into account when resizing so that images
			// scale with constant empty space between them
			var outerWidth =
				thisGalleryElement.data( 'original-width' ) + paddingWidth + borderWidth + marginWidth;
			var outerHeight =
				thisGalleryElement.data( 'original-height' ) + paddingHeight + borderHeight + marginHeight;

			// Subtract margins so that images don't overflow on small browser windows
			thisGalleryElement
				.width( Math.floor( resizeRatio * outerWidth ) - marginWidth )
				.height( Math.floor( resizeRatio * outerHeight ) - marginHeight );
		} );
	};

	/**
	 * Resizing logic
	 */

	var requestAnimationFrame =
		window.requestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.msRequestAnimationFrame;

	function attachResizeInAnimationFrames( tiledGalleries ) {
		var resizing = false;
		var resizeTimeout = null;

		function handleFrame() {
			tiledGalleries.resizeAll();
			if ( resizing ) {
				requestAnimationFrame( handleFrame );
			}
		}

		$( window ).resize( function () {
			clearTimeout( resizeTimeout );

			if ( ! resizing ) {
				requestAnimationFrame( handleFrame );
			}
			resizing = true;
			resizeTimeout = setTimeout( function () {
				resizing = false;
			}, 15 );
		} );
	}

	function attachPlainResize( tiledGalleries ) {
		$( window ).resize( function () {
			tiledGalleries.resizeAll();
		} );
	}

	/**
	 * Ready, set...
	 */

	$( document ).ready( function () {
		var tiledGalleries = new TiledGalleryCollection();

		$( 'body' ).on( 'post-load', function ( e, maybeResize ) {
			if ( 'string' === typeof maybeResize && 'resize' === maybeResize ) {
				tiledGalleries.resizeAll();
			} else {
				tiledGalleries.findAndSetupNewGalleries();
			}
		} );
		$( document ).on( 'page-rendered.wpcom-newdash', function () {
			tiledGalleries.findAndSetupNewGalleries();
		} );

		// Chrome is a unique snow flake and will start lagging on occasion
		// It helps if we only resize on animation frames
		//
		// For other browsers it seems like there is no lag even if we resize every
		// time there is an event
		if ( window.chrome && requestAnimationFrame ) {
			attachResizeInAnimationFrames( tiledGalleries );
		} else {
			attachPlainResize( tiledGalleries );
		}

		if ( 'undefined' !== typeof wp && wp.customize && wp.customize.selectiveRefresh ) {
			wp.customize.selectiveRefresh.bind( 'partial-content-rendered', function ( placement ) {
				if ( wp.isJetpackWidgetPlaced( placement, 'gallery' ) ) {
					tiledGalleries.findAndSetupNewGalleries();
				}
			} );
		}
	} );
} )( jQuery );
;
