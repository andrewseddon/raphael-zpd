# Raphaël-ZPD
### A little plugin for the [Raphaël](http://raphaeljs.com/) Javascript SVG library enabling canvas-wide zoom, pan and drag functionality.

## Usage

Instantiate a RaphaelZPD object by passing it the Raphael paper context in which to operate, and an object expressing the desired options:

	var zpd = new RaphaelZPD(paper, { zoom: true, pan: true, drag: true });

The options object can be accessed following initialisation as zpd.opts. You may disable the drag functionality on the basis of individual Raphaël elements like so:

	el.node.draggable = false;

## Potential Issues

The coordinates given by mouse events are still relative to the SVG canvas itself. The plugin works around this by adding zoomedX and zoomedY properties to all such events, which are correctly transformed.

The ZPD function works by creating an SVG group element (with id 'viewport' + n) and overriding the constructors on the default Raphäel elements to place them within. Clearly, this technique won't work with VML. If you want to use the plugin with a browser that does not natively support SVG, it is suggested that you investigate [svgweb](http://code.google.com/p/svgweb/).

## Examples

[Treeblob](http://www.lemma.org/experiments/treeblob/) is a contrived example of network visualisation using the panning and zooming functionalities.

## Acknowledgements

Based on the [SVGPan](http://code.google.com/p/svgpan/) library created by Andrea Leofreddi.

## License

	Copyright 2012 Jameson Quave <jquave@gmail.com> (iOS Implementation and various zoom fixes). All rights reserved.
	Copyright 2010 Daniel Assange <somnidea@lemma.org> (Raphaël integration and extensions). All rights reserved.
	Copyright 2009-2010 Andrea Leofreddi <a.leofreddi@itcharm.com> (original author). All rights reserved.
	
	Redistribution and use in source and binary forms, with or without modification, are
	permitted provided that the following conditions are met:
	
	   1. Redistributions of source code must retain the above copyright notice, this list of
	      conditions and the following disclaimer.
	
	   2. Redistributions in binary form must reproduce the above copyright notice, this list
	      of conditions and the following disclaimer in the documentation and/or other materials
	      provided with the distribution.
	
	THIS SOFTWARE IS PROVIDED BY Andrea Leofreddi ``AS IS'' AND ANY EXPRESS OR IMPLIED
	WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
	FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL Andrea Leofreddi OR
	CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
	CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
	SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
	ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
	NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
	ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	
	The views and conclusions contained in the software and documentation are those of the
	authors and should not be interpreted as representing official policies, either expressed
	or implied, of Andrea Leofreddi.
