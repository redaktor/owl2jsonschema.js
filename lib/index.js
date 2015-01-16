// TODO - DOC and ABOUT
// CREATES files containing the JSON Schemas in a folder OUTPUT/[host]_[path]
// RETURNS a string containing the JSON structure by default
		
var fs = require('fs');
var path = require('path');
var request = require('request');
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

function isURL(url) {
	return new RegExp(hardcoded.xsd$anyURI.pattern).test(url);
}

function parseURL(url, options, cb) {
	cb = cb || function() {};
	request(url, function(err, res, body) {
		if (err) return parseFile(url, options, cb);		
		var json = parseOWL(body, options);
		return cb(null, json);
	});
}

function parseFile(url, options, cb) {
	cb = cb || function() {};
	if (options.callerDir) url = path.join(options.callerDir, url);
	fs.readFile(url, function(err, body) {
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
			options.callerDir = path.dirname(requester);
		}
		return parseURL(v, options, cb);
	} else {
		var json = parseOWL(v, options);
		// TODO err handling
		return cb(null, json);
	}
}

module.exports = exports = parse;