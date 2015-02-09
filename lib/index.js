// TODO - DOC and ABOUT
// CREATES files containing the JSON Schemas in a folder OUTPUT/[host]_[path] relative to your script
// RETURNS a string containing the JSON structure by default
		
var fs = require('fs');
var url = require('url');
var path = require('path');
var request = require('request');
var rdflib = require('rdflib');
var callsite = require('callsite');
var hardcoded = require('./hardcoded-schemas.json'); 
var parseOWL = require('./owl2jsonschema');
var _options = require('./options');

function merge(objA) {
	var result = {};
	for (var i = 0; i < arguments.length; i++) {
		var obj = arguments[i];
		for (var key in obj) {
			result[key] = obj[key];
		}
	}
	return result;
}

function isURL(u) {
	return new RegExp(hardcoded.xsd$anyURI.pattern).test(u);
}

function parseType(u, res) {
	var contentType = '';
	var h = (res && res.hasOwnProperty('headers')) ? res.headers : null;
	var l = ((h && h.hasOwnProperty('content-location')) ? h['content-location'] : (h && h.hasOwnProperty('location')) ? h['location'] : u);
	console.log( l );
	switch (l.split('.').pop()) {
		case 'rdf':
		case 'owl':
			contentType = 'application/rdf+xml';
			break;
		case 'n3':
		case 'nt':
		case 'ttl':
			contentType = 'text/n3';
			break;
		default:
			contentType = 'text/xml';
	}
	return contentType;
}
function getType(u, res, contentType) {
	// contentType MAY be set in advance
	if (contentType === '*') {
		if ('content-type' in res.headers) {
			contentType = res.headers['content-type'].split(';').shift().trim();
			var knownTypes = {
				'application/rdf+xml': 	'application/rdf+xml',
				'application/rdfa': 	'application/rdfa',
				'text/n3': 				'text/n3',
				'text/turtle': 			'text/n3',
				'application/x-turtle': 'text/n3',// Legacy
				'application/n3': 		'text/n3' // Legacy 
			};
			if (contentType === 'text/plain') {
				// hint: the header MIGHT say {'content-type': 'text/plain'} (if misconfigured)
				if (body.match(/\s*<\?xml\s+version\s*=[^<>]+\?>/)) {
					console.log(
						'Warning: '+ reqUri + ' has an XML declaration. '+
						'We\'ll assume it is XML already but its content-type is text/plain.\n'
					);
					contentType = 'application/rdf+xml';
					// TODO if there is no rdf in xml we can search for rdfa / microdata or fail later 
				} else {
					contentType = 'text/n3';
				}
			} else if (contentType === 'text/html') {
				// TODO - how about microdata as fallback ?
				contentType = 'application/rdfa'; 
			} else if (knownTypes.hasOwnProperty(contentType)) {
				contentType = knownTypes[contentType];
			} else {
				return console.log('Do not understand content-type', contentType, '! Try to specify contentType manually in options.');
			}
		} else {
			return parseType(u, res);
		}
	}
	return contentType;
}

function parseURL(reqUri, options, cb) {
	cb = cb || function() {};
	var protocol = url.parse(reqUri).protocol;
	if (protocol === 'file' || protocol === 'chrome' || !protocol) options.contentType = parseType(reqUri);
	var _headers = (options.contentType === '*') ? {'accept-encoding': 'utf-8'} : {'accept-encoding': 'utf-8', 'content-type': options.contentType};
	request({
		url: reqUri,
		headers: _headers
	}, function(err, res, body) {
		var h = (res && res.hasOwnProperty('headers')) ? res.headers : null;
		var b = (h && h.hasOwnProperty('location')) ? h['location'] : reqUri;
		if (options.baseUrl === '') options.baseUrl = b;
		if (err) return parseFile(reqUri, options, cb); 
		
		// console.log( res.headers, res.statusCode );
		
		if (res.statusCode == 200) {
			var xmlData = '';
			options.contentType = getType(reqUri, res, options.contentType);
			if (options.contentType === 'application/rdf+xml') {
				xmlData = body;
			} else {
				var graph = new rdflib.IndexedFormula();
				// TODO - base parameter
				var rawData = rdflib.parse(body, graph, reqUri, options.contentType);
				xmlData = rdflib.serialize(rawData, graph, reqUri, 'application/rdf+xml');
			}
			
			var json = parseOWL(xmlData, options);
			return cb(null, json);
		}
	});
}

function parseFile(filepath, options, cb) {
	cb = cb || function() {};
	if (options.callerDir) filepath = path.join(options.callerDir, filepath);
	fs.readFile(filepath, function(err, body) {
		if (err) return cb(err);
		var json = parseOWL(body, options);
		return cb(null, json);
	});
}

function parse(v, options, cb) {
	options = options || {};
	options = merge(JSON.parse(JSON.stringify(_options)), options);
	cb = cb || function() {};
	if (isURL(v)) {
		var normal = path.normalize(v);
		var absolute = path.resolve(v);
		if (normal != absolute) {
			var stack = callsite();
			var requester = stack[1].getFileName();
			console.log( requester );
			options.callerDir = path.dirname(requester);
		}
		return parseURL(v, options, cb);
	} else {
		// xml strings
		// You MUST specify a 'baseUrl' in options !
		// TODO - currently strings must be rdf/xml
		var json = parseOWL(v, options);
		// TODO err handling
		return cb(null, json);
	}
}

module.exports = exports = parse;