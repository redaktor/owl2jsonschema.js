// TODO : DOC
// ...
// following the badgerfish convention when default options are used, 
// see http://www.sklar.com/badgerfish/

var expat = require('node-expat');
var options = require('./options');
// This object will hold all raw namespaces
var namespaces = {
	'http://www.w3.org/2001/XMLSchema#': 'xsd',
	'http://www.w3.org/1999/02/22-rdf-syntax-ns#': 'rdf',
	'http://www.w3.org/2002/07/owl#': 'owl',
	'http://www.w3.org/2000/01/rdf-schema#': 'rdfs'
}
var replaceNamespace = {};
// This object will hold normalized namespaces (_) and the urls we can convert
var layers = {
	xsd : 'http://www.w3.org/2001/XMLSchema#', 
	rdf : 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
	owl : 'http://www.w3.org/2002/07/owl#',
	rdfs: 'http://www.w3.org/2000/01/rdf-schema#'
};

// This object will hold the final result.
var obj = {};
var cur = {};
var ancestors = [];
var curName = null;

module.exports = function(xml, _options) {	
	/**
	 * Parses rdf to json using node-expat.
	 * @param {String|Buffer} xml The xml to be parsed to json.
	 * @param {Object} _options An object with options provided by the user.
	 * The available options are:
	 *  - object: If true, the parser returns a Javascript object instead of
	 *            a JSON string.
	 *  - reversible: If true, the parser generates a reversible JSON, mainly
	 *                characterized by the presence of the property $.
	 *  - sanitize_values: If true, the parser escapes any element value in the xml
	 * that has any of the following characters: <, >, (, ), #, #, &, ", '.
	 *
	 * @return {String|Object} A String or an Object with the JSON representation
	 * of the XML.
	 */

    var parser = new expat.Parser('UTF-8');
	
    parser.on('startElement', startElement);
    parser.on('text', text);
    parser.on('endElement', endElement);

    obj = cur = {};
    ancestors = [];
    curName = null;

    //configuration options
    for (var opt in _options) options[opt] = _options[opt];

    if (!parser.parse(xml)) throw new Error('There are errors in your xml file: ' + parser.getError());
    if (options.object) return obj;

    var json = JSON.stringify(obj);
    //See: http://timelessrepo.com/json-isnt-a-javascript-subset
    json = json.replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    return json;
};


function startElement(name, attrs) {
	//if (curName !== name) console.log( curName, name );
	curName = name;
	// baseUri
	/*
	if (name.substr(-4) === ':RDF') {
		var _ont = layers.owl.concat('Ontology');
		var _abo = layers.rdf.concat('about');
		obj.id = toUrl( ('xml:base' in attrs) ? attrs['xml:base'] : ((_ont in attrs) ? attrs[_ont][_abo] : null) );
	}
	*/
	var name = normalize(name, true);
	
	// check attrs for coerce and xmlns
	if (options.coerce || Object.keys(attrs).indexOf('xmlns') > -1) {
		for (var key in attrs) { 
			if (options.coerce) attrs[key] = coerce(attrs[key]);
			if (key.substr(0,5) === 'xmlns') {
				if (!('@xmlns' in attrs)) attrs['@xmlns'] = { '$': ('xmlns' in attrs) ? attrs.xmlns : obj.baseUri };
				
				for (var url in layers) {
					if (!(url in layers) && attrs[key] === layers[url]) layers[url] = key.substr(6).concat(':');
				}
				
				if (attrs[key] in namespaces) {
					var def = namespaces[attrs[key]];
					if (key.substr(6) != def) {
						replaceNamespace[key.substr(6)] = layers[def];
					}
				} else if (!(key.substr(6) in layers)) {
					layers[key.substr(6)] = attrs[key];
				}
				
				if (key != 'xmlns') attrs['@xmlns'][key.substr(6)] = attrs[key];
				delete attrs[key];
			}
		}
	}
	
	for (var key in attrs) { 
		var newKey = normalize(key, true);
		if (newKey != key) {
			attrs[newKey] = normalize(attrs[key]);
			delete attrs[key];
		}
	}
	
	/*
	var normalize = function(key) {
		var newKey = key;
		for (var url in namespaces) {
			if (key.indexOf(url) > -1) {
				newKey = key.replace(url, namespaces[url].concat('$'));
			}
		}
		var keys = key.split(':');
		if (newKey === key && keys.length > 0) {
			if (keys[0] in replaceNamespace) {
				keys[0] = replaceNamespace[keys[0]];
				newKey = keys.join('$');
			}
		} 
		return newKey;
	}
	
	var name = normalize(name);
	for (var key in attrs) { 
		var newKey = normalize(key);
		attrs[newKey] = normalize(attrs[key]);
		if (newKey != key) delete attrs[key];
	}
	console.log( name );
	console.log( !!(cur) );
	*/
	// baseUri
	if (name === 'rdf$RDF') {
		obj.id = toUrl( ('xml$base' in attrs) ? attrs['xml$base'] : (('owl$Ontology' in attrs) ? attrs['owl$Ontology']['rdf$about'] : null) );
	}
	
	
	obj._layers = layers;
	
	// check attrs for options.stringProperties
	var SP = options.stringProperties;
	if (SP && SP instanceof Array && SP.length > 0) attrs = stringify(attrs);
	
	//
	if (!(name in cur)) {
		if (options.arrayNotation) {
			cur[name] = [attrs];
		} else {
			cur[name] = attrs;
		}
	} else if (!(cur[name] instanceof Array)) {
		// Put the existing object in an array.
		var newArray = [cur[name]];
		// Add the new object to the array.
		newArray.push(attrs);
		// Point to the new array.
		cur[name] = newArray;
	} else {
		// An array already exists, push the attributes on to it.
		cur[name].push(attrs);
	}
	
	// Store the current (old) parent.
	ancestors.push(cur);
	
//	console.log( name );

	// We are now working with this object, so it becomes the current parent.
	if (cur[name] instanceof Array) {
		// If it is an array, get the last element of the array.
		cur = cur[name][cur[name].length - 1];
	} else if (typeof cur === 'object'){
		// Otherwise, use the object itself.
		cur = cur[name];
	}
	
}

function text(data) {
	if (options.trim) {
		data = data.trim();
	}

	if (options.sanitize) {
		data = sanitize(data);
	}

	if (typeof cur === 'object') cur['$'] = coerce((cur['$'] || '') + data);
}

function endElement(name) {
	if (typeof cur === 'object' && curName !== name) {
		delete cur['$'];
	}
	// This should check to make sure that the name we're ending matches the name we started on.
	var ancestor = ancestors.pop();
	if (typeof cur === 'object' && !options.reversible) {
		if (('$' in cur) && (Object.keys(cur).length == 1)) {
			if (ancestor[name] instanceof Array) {
				ancestor[name].push(ancestor[name].pop()['$']);
			} else {
				ancestor[name] = cur['$'];
			}
		}
	}

	cur = ancestor;
}

function toUrl(u) { 
	return (typeof u === 'string') ? ((u.slice(-1) != '/') ? u+'/' : u) : null; 
}
function coerce(value) {
	if (!options.coerce || value.trim() === '') {
		return value;
	}

	var num = Number(value);
	if (!isNaN(num)) {
		return num;
	}

	var _value = value.toLowerCase();

	if (_value == 'true') {
		return true;
	}

	if (_value == 'false') {
		return false;
	}

	return value;
}
function normalize(prop, isProp) {
	var nProp = prop;
	for (var url in namespaces) {
		if (prop.indexOf(url) > -1) {
			nProp = prop.replace(url, namespaces[url].concat('$'));
		}
	}
	if (isProp) {
		var props = prop.split(':');
		if (props[0] in replaceNamespace) props[0] = replaceNamespace[props[0]];
		nProp = props.join('$');
	}
	return nProp;
}
function stringify(attrs) {
	// check attrs for options.stringProperties		
	var keys = Object.keys(attrs);
	if (keys.length === 1 && options.stringProperties.indexOf(keys[0]) > -1) return attrs[keys[0]];
	return attrs;
}
/**
 * Simple sanitization. It is not intended to sanitize
 * malicious element values.
 *
 * character | escaped
 *      <       &lt;
 *      >       &gt;
 *      (       &#40;
 *      )       &#41;
 *      #       &#35;
 *      &       &amp;
 *      "       &quot;
 *      '       &apos;
 */
var chars =  {  '<': '&lt;',
				'>': '&gt;',
				'(': '&#40;',
				')': '&#41;',
				'#': '&#35;',
				'&': '&amp;',
				'"': '&quot;',
				"'": '&apos;' };

function sanitize(value) {
	if (typeof value !== 'string') {
		return value;
	}

	Object.keys(chars).forEach(function(key) {
		value = value.replace(key, chars[key]);
	});

	return value;
}