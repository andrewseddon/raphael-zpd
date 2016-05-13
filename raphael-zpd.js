/**
 *  Raphaël-ZPD: A zoom/pan/drag plugin for Raphaël.
 * ==================================================
 *
 * This code is licensed under the following BSD license:
 * 
 * Copyright 2012 Jameson Quave <jquave@gmail.com> (iOS compatibility). All right reserved.
 * Copyright 2010 Gabriel Zabusek <gabriel.zabusek@gmail.com> (Interface and feature extensions and modifications). All rights reserved.
 * Copyright 2010 Daniel Assange <somnidea@lemma.org> (Raphaël integration and extensions). All rights reserved.
 * Copyright 2009-2010 Andrea Leofreddi <a.leofreddi@itcharm.com> (original author). All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are
 * permitted provided that the following conditions are met:
 * 
 *    1. Redistributions of source code must retain the above copyright notice, this list of
 *       conditions and the following disclaimer.
 * 
 *    2. Redistributions in binary form must reproduce the above copyright notice, this list
 *       of conditions and the following disclaimer in the documentation and/or other materials
 *       provided with the distribution.
 * 
 * THIS SOFTWARE IS PROVIDED BY Andrea Leofreddi ``AS IS'' AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
 * FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL Andrea Leofreddi OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
 * ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * 
 * The views and conclusions contained in the software and documentation are those of the
 * authors and should not be interpreted as representing official policies, either expressed
 * or implied, of Andrea Leofreddi.
 */

var raphaelZPDId = 0;

RaphaelZPD = function(raphaelPaper, o) {
    function supportsSVG() {
        return document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1");
    }

    if (!supportsSVG()) {
        return null;
    }

    var me = this;

	me.initialized = false;
	me.opts = { 
		zoom: true, pan: true, drag: true, // Enable/disable core functionalities.
		zoomThreshold: null // Zoom [out, in] boundaries by ratio. E.g [0.1, 2] means they can shrink to 10% of size, or increase to 200%.
	};

    me.id   = ++raphaelZPDId;
    me.root = raphaelPaper.canvas;

    me.gelem = document.createElementNS('http://www.w3.org/2000/svg', 'g');
	me.gelem.id = 'viewport'+me.id;
	me.root.appendChild(me.gelem);

	function overrideElements(paper) {
		var elementTypes = ['circle', 'rect', 'ellipse', 'image', 'text', 'path'];
		for(var i = 0; i < elementTypes.length; i++) {
		  overrideElementFunc(paper, elementTypes[i]);
		}
	}

	function overrideElementFunc(paper, elementType) {    
		paper[elementType] = function(oldFunc) {
		  return function() {
			var element = oldFunc.apply(paper, arguments);
			element.gelem = me.gelem;
			me.gelem.appendChild(element.node);
			return element;
		  };
		}(paper[elementType]);
	}

	overrideElements(raphaelPaper);

	function transformEvent(evt) {
		if (typeof evt.clientX != "number") return evt;

		svgDoc = evt.target.ownerDocument;

		var g = svgDoc.getElementById("viewport"+me.id);

		var p = me.getEventPoint(evt);

		p = p.matrixTransform(g.getCTM().inverse());

		evt.zoomedX = p.x;
		evt.zoomedY = p.y;

		return evt;
	}

	var events = ['click', 'dblclick', 'mousedown', 'mousemove', 'mouseout', 'mouseover', 'mouseup', 'touchstart', 'touchmove', 'touchend', 'orientationchange', 'touchcancel', 'gesturestart', 'gesturechange', 'gestureend'];

	events.forEach(function(eventName) {
		var oldFunc = Raphael.el[eventName];
		Raphael.el[eventName] = function(fn, scope) {
			if (fn === undefined) return;
			var wrap = function(evt) {
				return fn.apply(this, [transformEvent(evt)]);
			};
			return oldFunc.apply(this, [wrap, scope]);
		}
	});
	
	//raphaelPaper.canvas = me.gelem;

    me.state = 'none'; 
    me.stateTarget = null;
    me.stateOrigin = null;
    me.stateTf = null;

    if (o) {
		for (key in o) {
			if (me.opts[key] !== undefined) {
				me.opts[key] = o[key];
			}
		}
	}

	/**
	 * Handler registration
	 */
	me.setupHandlers = function(root) {
		me.root.onmousedown = me.handleMouseDown;
		me.root.onmousemove = me.handleMouseMove;
		me.root.onmouseup   = me.handleMouseUp;
		
		
		me.root.ontouchstart = me.handleTouchStart;
		me.root.ontouchmove = me.handleTouchMove;
		me.root.ontouchend   = me.handleTouchEnd;
		
		me.root.ongesturestart = me.handleGestureStart;
		me.root.ongesturechange = me.handleGestureChange;
		

		//me.root.onmouseout = me.handleMouseUp; // Decomment me to stop the pan functionality when dragging out of the SVG element
		// The above messes with pan if you are on top of an svg element

		if (navigator.userAgent.toLowerCase().indexOf('webkit') >= 0 || navigator.userAgent.toLowerCase().indexOf('trident') >= 0)
			me.root.addEventListener('mousewheel', me.handleMouseWheel, false); // Chrome/Safari/IE9(Trident)
		else
			me.root.addEventListener('DOMMouseScroll', me.handleMouseWheel, false); // Others
	};

	/**
	 * Instance an SVGPoint object with given event coordinates.
	 */
	me.getEventPoint = function(evt) {
		var p = me.root.createSVGPoint();

		p.x = evt.clientX;
		p.y = evt.clientY;

		return p;
	};

	/**
	 * Sets the current transform matrix of an element.
	 */
	me.setCTM = function(element, matrix) {
		var s = "matrix(" + matrix.a + "," + matrix.b + "," + matrix.c + "," + matrix.d + "," + matrix.e + "," + matrix.f + ")";

		element.setAttribute("transform", s);
	};
	
	/**
	 * Dumps a matrix to a string (useful for debug).
	 */
	me.dumpMatrix = function(matrix) {
		var s = "[ " + matrix.a + ", " + matrix.c + ", " + matrix.e + "\n  " + matrix.b + ", " + matrix.d + ", " + matrix.f + "\n  0, 0, 1 ]";

		return s;
	};

	/**
	 * Sets attributes of an element.
	 */
	me.setAttributes = function(element, attributes) {
		for (i in attributes)
			element.setAttributeNS(null, i, attributes[i]);
	};
	
	var getKeys = function(obj){
   var keys = [];
   for(var key in obj){
      keys.push(key);
   }
   return keys;
}


/**
	 * Handle touch start event.
	 */
	 
	me.handleTouchStart = function(evt) {
	//	if (evt.preventDefault)
	//		evt.preventDefault();

		//evt.returnValue = false;

		var svgDoc = evt.target.ownerDocument;

		var g = svgDoc.getElementById("viewport"+me.id);

		if (evt.target.tagName == "svg" || !me.opts.drag) {
			// Pan mode
			if (!me.opts.pan) return;

			me.state = 'pan';

			me.stateTf = g.getCTM().inverse();

			//me.stateOrigin = me.getEventPoint(evt).matrixTransform(me.stateTf);
			var p = {};
			p.x = evt.pageX;
			p.y = evt.pageY;
			me.stateOrigin = p;
		} else {
			// Move mode
			if (!me.opts.drag || evt.target.draggable == false) return;

			me.state = 'move';

			me.stateTarget = evt.target;

			me.stateTf = g.getCTM().inverse();

			var p = {};
			p.x = evt.pageX;
			p.y = evt.pageY;
			me.stateOrigin = p;
		}
	};
	
	/**
	 * Handle touch end event.
	 */
	me.handleTouchEnd = function(evt) {

		var svgDoc = evt.target.ownerDocument;

		if ((me.state == 'pan' && me.opts.pan) || (me.state == 'move' && me.opts.drag)) {
			// Quit pan mode
			me.state = '';
		}
	};

	/**
	 * Handle touch move event.
	 */
	me.handleTouchMove = function(evt) {
	
		if (evt.preventDefault)
			evt.preventDefault();

		evt.returnValue = false;

		var svgDoc = evt.target.ownerDocument;

		var g = svgDoc.getElementById("viewport"+me.id);
		
		var p = {};
		p.x = evt.pageX;
		p.y = evt.pageY;
		
		var delta = {};
		
		delta.x = p.x - me.stateOrigin.x;
		delta.y = p.y - me.stateOrigin.y;

		if (me.state == 'pan') {
			// Pan mode
			if (!me.opts.pan) return;

			// Slow down the panning when zoomed in, speed it up when zoomed out
			var svgDoc = evt.target.ownerDocument;
			var g = svgDoc.getElementById("viewport"+me.id);
			var gTransform = g.getCTM();
//			var currentScale = gTransform.a;
var currentScale = gTransform.a;
			
			delta.x /= currentScale;
			delta.y /= currentScale;
			
			me.setCTM(g, me.stateTf.inverse().translate(delta.x, delta.y));
		} else if (me.state == 'move') {
			// Move mode
			if (!me.opts.drag) return;

			

			me.setCTM(me.stateTarget, me.root.createSVGMatrix().translate(delta.x, delta.y).multiply(g.getCTM().inverse()).multiply(me.stateTarget.getCTM()));

			me.stateOrigin = p;
		}
	};
	
	/**
	 * Handle zooming from the two different events that try to zoom
	 */
	me.zoomWithDeltaAndPosOnSvgDoc = function(delta, p, svgDoc) {
		var g = svgDoc.getElementById("viewport"+me.id);
		var gTransform = g.getCTM();
		
		if (delta > 0) {
            if (me.opts.zoomThreshold) 
                if (me.opts.zoomThreshold[1] <= gTransform.a) return;
        } else {
            if (me.opts.zoomThreshold)
                if (me.opts.zoomThreshold[0] >= gTransform.a) {
                	// TODO: Hit minimum threshold, make it match
	                return;
                }
        }
        
		var z = 1 + delta; // Zoom factor: 0.9/1.1
		
		// Compute new scale matrix in current mouse/gesture position
		var k = me.root.createSVGMatrix().translate(p.x, p.y).scale(z).translate(-p.x, -p.y);
		me.setCTM(g, gTransform.multiply(k));

		if (!me.stateTf)
			me.stateTf = g.getCTM().inverse();

		me.stateTf = me.stateTf.multiply(k.inverse());
	}

	/**
	 * Handle pinch/pan gestures on iOS Start
	 */
	 var lastScale;
	me.handleGestureStart = function(evt) {
		lastScale = evt.scale;
	}


	/**
	 * Handle pinch/pan gestures on iOS
	 */
	 var lastScale;
	me.handleGestureChange = function(evt) {
		if(isNaN(lastScale)) {
			lastScale = evt.scale;
			return;
		}
		
		var scaleDelta = evt.scale-lastScale;
		
		if (!me.opts.zoom) return;

		if (evt.preventDefault)
			evt.preventDefault();

		evt.returnValue = false;

		var svgDoc = evt.target.ownerDocument;

		var delta;

		if (scaleDelta)
			delta = scaleDelta / 10; // Chrome/Safari
		else
			delta = evt.detail / -90; // Mozilla
		
		var p = {};
		p.x = evt.pageX;
		p.y = evt.pageY;
		
		var g = svgDoc.getElementById("viewport"+me.id);

		me.zoomWithDeltaAndPosOnSvgDoc(delta, p, svgDoc);
	}

	/**
	 * Handle mouse move event.
	 */
	me.handleMouseWheel = function(evt) {

		if (!me.opts.zoom) return;

		if (evt.preventDefault)
			evt.preventDefault();

		evt.returnValue = false;

		var svgDoc = evt.target.ownerDocument;

		var delta;

		if (evt.wheelDelta)
			delta = evt.wheelDelta / 3600; // Chrome/Safari
		else
			delta = evt.detail / -90; // Mozilla


		if(delta==0) return;
		else if(delta>0) delta = 0.1;
		else delta = -0.1;
		
		var p = me.getEventPoint(evt);
		
		var g = svgDoc.getElementById("viewport"+me.id);

		p = p.matrixTransform(g.getCTM().inverse());
		
		me.zoomWithDeltaAndPosOnSvgDoc(delta, p, svgDoc);
	};

	/**
	 * Handle mouse move event.
	 */
	me.handleMouseMove = function(evt) {
		if (evt.preventDefault)
			evt.preventDefault();

		evt.returnValue = false;

		var svgDoc = evt.target.ownerDocument;

		var g = svgDoc.getElementById("viewport"+me.id);

		if (me.state == 'pan') {
			// Pan mode
			if (!me.opts.pan) return;

			var p = me.getEventPoint(evt).matrixTransform(me.stateTf);

			me.setCTM(g, me.stateTf.inverse().translate(p.x - me.stateOrigin.x, p.y - me.stateOrigin.y));
		} else if (me.state == 'move') {
			// Move mode
			if (!me.opts.drag) return;

			var p = me.getEventPoint(evt).matrixTransform(g.getCTM().inverse());

			me.setCTM(me.stateTarget, me.root.createSVGMatrix().translate(p.x - me.stateOrigin.x, p.y - me.stateOrigin.y).multiply(g.getCTM().inverse()).multiply(me.stateTarget.getCTM()));

			me.stateOrigin = p;
		}
	};
	
	/**
	 * Handle click event.
	 */
	me.handleMouseDown = function(evt) {
		if (evt.preventDefault)
			evt.preventDefault();

		evt.returnValue = false;

		var svgDoc = evt.target.ownerDocument;

		var g = svgDoc.getElementById("viewport"+me.id);

		if (evt.target.tagName == "svg" || !me.opts.drag || (me.opts.drag && evt.target.draggable == false)) {
			// Pan mode
			if (!me.opts.pan) return;

			me.state = 'pan';

			me.stateTf = g.getCTM().inverse();

			me.stateOrigin = me.getEventPoint(evt).matrixTransform(me.stateTf);
		} else {
			// Move mode
			if (!me.opts.drag || evt.target.draggable == false) return;

			me.state = 'move';

			me.stateTarget = evt.target;

			me.stateTf = g.getCTM().inverse();

			me.stateOrigin = me.getEventPoint(evt).matrixTransform(me.stateTf);
		}
	};
	
	/**
	 * Handle mouse button release event.
	 */
	me.handleMouseUp = function(evt) {
		if (evt.preventDefault)
			evt.preventDefault();

		evt.returnValue = false;

		var svgDoc = evt.target.ownerDocument;

		if ((me.state == 'pan' && me.opts.pan) || (me.state == 'move' && me.opts.drag)) {
			// Quit pan mode
			me.state = '';
		}
	};
	
	/**
	 * Pan to a location programmatically
	 */
	me.panTo = function(x, y) {
		var me = this;
	
		if (me.gelem.getCTM() == null) {
			alert('failed');
			return null;
		}
	
		var stateTf = me.gelem.getCTM().inverse();
	
		var svg = document.getElementsByTagName("svg")[0];
	
		if (!svg.createSVGPoint) alert("no svg");        
	
		var p = svg.createSVGPoint();
	
		p.x = x; 
		p.y = y;
	
		p = p.matrixTransform(stateTf);
	
		var element = me.gelem;
		var matrix = stateTf.inverse().translate(p.x, p.y);
	
		var s = "matrix(" + matrix.a + "," + matrix.b + "," + matrix.c + "," + matrix.d + "," + matrix.e + "," + matrix.f + ")";
	
		element.setAttribute("transform", s);
	
		return me;   
	}


    // end of constructor
  	me.setupHandlers(me.root);
	me.initialized = true;
};

Raphael.fn.ZPDPanTo = function(x, y) {
	var me = this;

	if (me.gelem.getCTM() == null) {
		alert('failed');
		return null;
	}

	var stateTf = me.gelem.getCTM().inverse();

	var svg = document.getElementsByTagName("svg")[0];

	if (!svg.createSVGPoint) alert("no svg");        

	var p = svg.createSVGPoint();

	p.x = x; 
	p.y = y;

	p = p.matrixTransform(stateTf);

	var element = me.gelem;
	var matrix = stateTf.inverse().translate(p.x, p.y);

	var s = "matrix(" + matrix.a + "," + matrix.b + "," + matrix.c + "," + matrix.d + "," + matrix.e + "," + matrix.f + ")";

	element.setAttribute("transform", s);

	return me;   
};

