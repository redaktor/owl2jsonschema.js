"use strict";
// TODO - DOC and ABOUT
// for now seeAlso: https://github.com/redaktor/owl2jsonschema.js
// CREATES files containing the JSON Schemas in a folder OUTPUT/[host]_[path] relative to your script
// RETURNS a string containing the JSON structure by default

/* DEFAULT OPTIONS
{
	object: false,
	reversible: true,
	coerce: true,
	sanitize: true,
	trim: true,
	stringProperties: ['rdf:resource'],
	defaultLocale: 'en',
	outputDir: '',
	relPrefix: '',
	prefix: '',
	suffix: '.json'
}
*/

var fs = require('fs');
var url = require('url');
var path = require('path');
var mkdirp = require('mkdirp');
var request = require('request');
var callsite = require('callsite');
// support for n3 and turtle, JSON-LD support planned:
var rdflib = require('rdflib');
// submodules (in my folder 'lib'):
var rdfjson = require('./rdf2json');
var prettyJson = require('./pretty-json');
// for instance xsd predefined datatypes:
var hardcoded = require('./hardcoded-schemas.json');
var opt = require('./options');
var c = require('./constants');

// only needed for schema.org compat:
var ignore = require('./ignore-properties.json');
var propertyMultiplicity = {};

// the only 'privates', currently used for debugging :
// describing the totalCount and remaining (not touched) external URIs
var i = 0;
var externalCount = 0;

// some 'helper' functions for convenience
function getHardcoded(key) {
	return JSON.parse(JSON.stringify(hardcoded[key]));
}

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

function arrayUnique(array) {
	var a = array.concat();
	for(var i=0; i<a.length; ++i) {
		for(var j=i+1; j<a.length; ++j) {
			if(a[i] === a[j])
				a.splice(j--, 1);
		}
	}
	return a;
};

function extensionType(u, res) {
	var contentType = '';
	var h = (res && res.hasOwnProperty('headers')) ? res.headers : null;
	var l = ((h && h.hasOwnProperty('content-location')) ? h['content-location'] : (h && h.hasOwnProperty('location')) ? h['location'] : u);
	console.log( '78:', l );
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

function isURL(uri) {
	return new RegExp(hardcoded.xsd$anyURI.pattern).test(uri);
}

function isRestriction(o) {
	return (o && typeof o === 'object' && !('url' in o) && 'restrictions' in o);	
}

function toUrl(uri) { 
	var lastChar = uri.slice(-1);
	return (typeof uri === 'string') ? ((lastChar != '/' && lastChar != '#') ? uri+'/' : uri) : null; 
}

function toFilename(uri) {
	var firstRegex = /^([A-Z]|[a-z]|\d)/;
	var regex = /[\/\?<>\\:\*\|":\x00-\x1f\x80-\x9f]/g;
	if (!firstRegex.test(uri)) uri = '_'.concat(uri);
	return uri.replace(regex, '_');
};

function defaultPath(uri) {
	var u = url.parse(uri, false, true);
	console.log( '117:', uri, u );
	return path.join('./OUTPUT/', u.host.concat(u.pathname.replace(new RegExp('\\' + path.sep, 'g'), '_')) );
}

function defaultId(uri, suffix) {
	// dbpedia.org_ontology/1
	var u = url.parse(uri, false, true);
	return (u.host.concat(u.pathname, suffix.toString())).replace(new RegExp('\\' + path.sep, 'g'), '_');
}

function getText(o) {
	if (typeof o === 'object' && '$' in o) return o.$
	return o;
}

function getUrl(o) {
	// In RDF declaration is not mandatory anyway, 
	// so put :about (reference) over :ID (declaration)
	// TODO anonymous classes
	if (typeof o === 'object' && c._about in o) return o[c._about];
	return (c._id in o) ? o[c._id] : '';
}

function trimSchema(schema) {
	if (!schema.title) delete schema.title;
	if (!schema.description) delete schema.description;
	if (!schema.title && !schema.description) delete schema.translations;
	if (schema.type.length == 0) delete schema.type;
	if (schema.anyOf.length == 0) delete schema.anyOf;
	if (schema.allOf.length == 0) delete schema.allOf;
	if (schema.oneOf.length == 0) delete schema.oneOf;
	if (schema.not.length == 0) delete schema.not;
	if (schema.links.length == 0) delete schema.links;
	if (Object.keys(schema.properties).length == 0) {
		delete schema.properties;
		if (schema.type == 'object' && schema.allOf) {
			delete schema.type;
		}
	}
	if (Object.keys(schema.definitions).length == 0) delete schema.definitions;
	return schema;
}
/* TODO
resolving external URIs (doing now, see debug file debugOWLext.json)
 
special use of
- rdfs:Literal
- rdf:XMLLiteral
- owl:Axiom
- owl:DataRange

OWL 2 constraints
- owl:AllDifferent
- owl:AllDisjointClasses
- owl:AllDisjointProperties
- owl:AsymmetricProperty
- owl:ReflexiveProperty
- owl:IrreflexiveProperty
- ? owl:InverseFunctionalProperty
- ? owl:NegativePropertyAssertion
- owl:propertyDisjointWith
- owl:annotatedProperty / owl:annotatedSource / owl:annotatedTarget
- owl:assertionProperty
- owl:hasSelf
- owl:qualifiedCardinality
- owl:maxQualifiedCardinality
- owl:minQualifiedCardinality
- onDataRange
- onDatatype

OWL full includes 
- make this generic for RDFS - 
rdf:type
rdfs:subClassOf
rdfs:subPropertyOf
rdfs:domain
rdfs:range

The used 'full' OWL namespace includes
OWL DL		http://www.w3.org/TR/owl-features/#term_OWLDL
OWL Lite	http://www.w3.org/TR/owl-features/#term_OWLLite
!!!

practical problems
schema.org 			--> 				special parser rdfs.schema.org (schema.org is cheaper than OWL or RDFS) - TODO options.schemaOrgCompat
wikidata.dbpedia.org --> 				unknown host (just wondering)
and 
http://xmlns.com/foaf/0.1/Person -->	http://xmlns.com/foaf/spec/index.rdf#Person (error in dbpedia ?)

// JSON-graph and owl$Ontology (in meta / graph.meta)

// make generate independent (w. credits...)

// ! What to do with anonymous classes <owl:Class> ? autoId
rdf:resource and owl:thing ???

http://www.w3.org/TR/owl2-syntax/#Entities.2C_Literals.2C_and_Anonymous_Individuals
5.5 Annotation Properties


TODO for SCHEMER ["validation of property keys"]:
Table 3. Reserved Vocabulary of OWL 2 with Special Treatment :
['owl:backwardCompatibleWith', 'owl:bottomDataProperty', 'owl:bottomObjectProperty', 'owl:deprecated', 'owl:incompatibleWith', 'owl:Nothing', 'owl:priorVersion', 'owl:rational', 'owl:real', 'owl:versionInfo', 'owl:Thing', 'owl:topDataProperty', 'owl:topObjectProperty', 'rdf:langRange', 'rdf:PlainLiteral', 'rdf:XMLLiteral', 'rdfs:comment', 'rdfs:isDefinedBy', 'rdfs:label', 'rdfs:Literal', 'rdfs:seeAlso', 'xsd:anyURI', 'xsd:base64Binary', 'xsd:boolean', 'xsd:byte', 'xsd:dateTime', 'xsd:dateTimeStamp', 'xsd:decimal', 'xsd:double', 'xsd:float', 'xsd:hexBinary', 'xsd:int', 'xsd:integer', 'xsd:language', 'xsd:length', 'xsd:long', 'xsd:maxExclusive', 'xsd:maxInclusive', 'xsd:maxLength', 'xsd:minExclusive', 'xsd:minInclusive', 'xsd:minLength', 'xsd:Name', 'xsd:NCName', 'xsd:negativeInteger', 'xsd:NMTOKEN', 'xsd:nonNegativeInteger', 'xsd:nonPositiveInteger', 'xsd:normalizedString', 'xsd:pattern', 'xsd:positiveInteger', 'xsd:short', 'xsd:string', 'xsd:token', 'xsd:unsignedByte', 'xsd:unsignedInt', 'xsd:unsignedLong', 'xsd:unsignedShort']
*/


/* owl2jsonschema

*/
module.exports = constructor;

function constructor(options){
	this._externals = {};
	this.cb = function(){};
	this.uri = '';
	this.string = '';
	this.base = '';
	this.options = merge(JSON.parse(JSON.stringify(opt)), options);
	if (this.options.schemaOrgCompat) propertyMultiplicity = require('./property-multiplicity.json');
	console.log( this );
}

constructor.prototype.parse = function(v, cb) {
	if (cb) this.cb = cb;
	if (isURL(v)) {
		this.uri = v;
		var normal = path.normalize(v);
		var absolute = path.resolve(v);
		if (normal != absolute) {
			var stack = callsite();
			var requester = stack[1].getFileName();
			console.log( '245:', requester );
			this.options.callerDir = path.dirname(requester);
		}
		return this.parseURL();
	} else {
		// xml strings
		// You MUST specify a 'baseUrl' in options !
		// TODO - currently strings must be rdf/xml
		var json = this.parseOWL(v);
		// TODO err handling ...
		return this.cb(null, json);
	}
}

constructor.prototype.parseURL = function () {
	var protocol = url.parse(this.uri).protocol;
	if (protocol === 'file' || protocol === 'chrome' || !protocol) this.options.contentType = extensionType(this.uri);
	var _headers = (this.options.contentType === '*') ? {'accept-encoding': 'utf-8'} : {'accept-encoding': 'utf-8', 'content-type': this.options.contentType};
	
	request({
		url: this.uri,
		headers: _headers
	}, this.result.bind(this));
}
constructor.prototype.result = function(err, res, body) {
	console.log( '270:', this.options );
	var h = (res && res.hasOwnProperty('headers')) ? res.headers : null;
	var b = (h && h.hasOwnProperty('location')) ? h['location'] : this.uri;
	if (this.options.baseUrl === '') this.options.baseUrl = b;
	if (err) return this.parseFile(); 
	// console.log( res.headers, res.statusCode );
	
	if (res.statusCode == 200) {
		var xmlData = '';
		this.options.contentType = this.getType(this.uri, res, this.options.contentType);
		if (this.options.contentType === 'application/rdf+xml') {
			xmlData = body;
		} else {
			var graph = new rdflib.IndexedFormula();
			// TODO - base parameter
			var rawData = rdflib.parse(body, graph, this.uri, this.options.contentType);
			xmlData = rdflib.serialize(rawData, graph, this.uri, 'application/rdf+xml');
		}
		
		var json = this.parseOWL(xmlData, this.options);
		return this.cb(null, json);
	}
}

constructor.prototype.parseFile = function() {
	if (this.options.callerDir) this.uri = path.join(this.options.callerDir, this.uri);
	fs.readFile(filepath, function(err, body) {
		if (err) return this.cb(err);
		var json = this.parseOWL(body, this.options);
		return this.cb(null, json);
	}.bind(this));
}


constructor.prototype.getType = function(u, res, contentType) {
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
				// default to RDF -- JWC, body not found
					contentType = 'application/rdf+xml';
/*
				if (body.match(/\s*<\?xml\s+version\s*=[^<>]+\?>/)) {
					console.log(
						'Warning: '+ this.uri + ' has an XML declaration. '+
						'We\'ll assume it is XML already but its content-type is text/plain.\n'
					);
					contentType = 'application/rdf+xml';
					// TODO if there is no rdf in xml we can search for rdfa / microdata or fail later 
				} else {
					contentType = 'text/n3';
				}
*/
			} else if (contentType === 'text/html') {
				// TODO - how about microdata as fallback ?
				contentType = 'application/rdfa'; 
			} else if (knownTypes.hasOwnProperty(contentType)) {
				contentType = knownTypes[contentType];
			} else {
				return console.log('Do not understand content-type', contentType, '! Try to specify contentType manually in options.');
			}
		} else {
			return extensionType(u, res);
		}
	}
	return contentType;
}
/*
	convert to a JSON structure which is introduced by http://schema.rdfs.org
*/
constructor.prototype.getRestrictions = function(o) {
	var restrictions = {}
	var _id = o[c._restriction][c._onProperty].replace(this.base, '');
	if (!(_id in restrictions)) restrictions[_id] = {};
	
	if (c._cardinality in o[c._restriction]) {
		var cardinality = getText(o[c._restriction][c._cardinality]);
		restrictions[_id].minItems = cardinality;
		restrictions[_id].maxItems = cardinality;
	}
	if (c._minCardinality in o[c._restriction]) restrictions[_id].minItems = getText(o[c._restriction][c._minCardinality]);
	if (c._maxCardinality in o[c._restriction]) restrictions[_id].maxItems = getText(o[c._restriction][c._maxCardinality]);
	
	if (c._allValuesFrom in o[c._restriction]) {
		if (!('allValuesFrom' in restrictions[_id])) restrictions[_id].allValuesFrom = [];
		restrictions[_id].allValuesFrom.push(this.getResource(o[c._restriction][c._allValuesFrom]));
	}
	if (c._someValuesFrom in o[c._restriction]) {
		if (!('someValuesFrom' in restrictions[_id])) restrictions[_id].someValuesFrom = [];
		restrictions[_id].someValuesFrom.push(this.getResource(o[c._restriction][c._someValuesFrom]));
	}
	if (c._hasValue in o[c._restriction]) {
		if (!('hasValue' in restrictions[_id])) restrictions[_id].hasValue = [];
		restrictions[_id].hasValue.push(this.getResource(o[c._restriction][c._hasValue]));
	}
	return restrictions;
}
constructor.prototype.getResource = function(o) {
	if (typeof o === 'object' && c._thing in o) return o[c._thing];
	// rdf$resource or string
	var resource = '';
	if (typeof o === 'string') {
		resource = (o.substr(0,1) === '#') ? o.substr(1) : o;
		return resource.replace(this.base, '');
	}
	if (typeof o === 'object' && c._resource in o) {
		resource = (o[c._resource].substr(0,1) === '#') ? o[c._resource].substr(1) : o[c._resource];
		return resource.replace(this.base, '');
	}
		
	// this is an 'anonymous' resource
	// e.g. an 'anonymous' class or an owl$Restriction
	// in equivalentClass or subclassOf !
	console.log( 'anonymous resource', o );
	resource = (c._class in o) ? this.OWL(o[c._class]) : {restrictions: this.getRestrictions(o)};
	// xTODO
	return (resource) ? resource : '';
}









constructor.prototype.OWL = function(o) { 
	i++; // if a top class is neither defined (:ID) nor referenced, for auto id;
	var base = this.base;
	var loca = this.options.defaultLocale; // as fallback for main language when only localized objects
	var getId = function(o) {
		// In RDF declaration is not mandatory anyway, 
		// so put :about (reference) over :ID (declaration)
		// and support OWL 2 :NamedIndividual
		// <owl:NamedIndividual rdf:about="Aubergine"> TODO
		
		if (typeof o === 'object' && c._about in o) return o[c._about].replace(base, '');
		return (c._id in o) ? o[c._id].replace(base, '') : defaultId(base, i);
	}
	var isExternal = function(uri) {
		if (!uri || typeof uri != 'string' || uri === '') return false;
		return (uri.indexOf(base) === -1 && uri.indexOf('//') > -1);
	}
	var addExternal = function(uri) {
		var u = url.parse(uri, false, true);
		
		if (u.host === 'schema.org') {
			var parts = uri.split('schema.org/');
			parts[0] = parts[0].concat('schema.org');
		} else {
			var parts = uri.split('#');
		}
		if (!(parts[0] in this._externals)) this._externals[parts[0]] = [];
		if (parts.length > 1 && this._externals[parts[0]].indexOf(parts[1]) < 0) this._externals[parts[0]].push(parts[1]);
	}
	var r = {
		id: getId(o),
		url: getUrl(o),
		comment: '',
		title: '',		// was label
		description: '',// was comment_plain
		translations: { title: {}, description: {} },
		restrictionProperties: {},
		ancestors: 	[],
		enum: 		[], // was instances
		supertypes: [],
		equivalents:[]
	};
	
	// is it external
	if (isExternal(r.url)){
		addExternal.bind(this)(r.url);
		console.log( 'EXTERNAL', r.url );
		console.log( '--> ', defaultPath(r.url)+'#' );
	}		
	
	// support JSON schema meta 0.5 proposal 'translations'
	var titleAndDesc = function(type, t) {
		if (typeof t === 'object' && c._lang in t) {
			if (t[c._lang].substr(0,2) === loca) {
				r[type] = t['$'];
			} else {
				r.translations[type][t[c._lang]] = t['$'];
			}
		} else {
			r[type] = getText(t);
		}
	}
	
	// title
	if (c._label in o) { 
		var titles =  (o[c._label] instanceof Array) ? o[c._label] : [o[c._label]];
		titles.forEach(function(t){ titleAndDesc('title', t); });
	}
	// description
	if (c._comment in o) { 
		var descriptions =  (o[c._comment] instanceof Array) ? o[c._comment] : [o[c._comment]];
		descriptions.forEach(function(d){ titleAndDesc('description', d); });
	}
	// comment - no html parsing here ...
	r.comment = r.description;
	
	// global cardinality constraints on properties
	if (c._type in o) {
		var prArr = (o[c._type] instanceof Array) ? o[c._type] : [o[c._type]];
		if (this.mode != 'types') {
			var pr = prArr.filter(function(t){
				return (t === c._functionalP || t === c._transitiveP || t === c._symmetricP);
			});
			if (pr.length > 0) r.propertyRestrictions = pr;
		}
		/*
		// TODO
		// owl:AllDifferent etc. 
		*/	
	}
	
	// restrictions
	// "property restrictions" - goes to definitions of properties later on in createSchema
	if (c._restriction in o && c._onProperty in o[c._restriction]) {			
		r.restrictionProperties = this.getRestrictions(o);
	}			
	
	// properties or domains/ranges mapping
	if (typeof this.mode === 'undefined' || this.mode === 'types') {
		//r.subtypes = []; 
		r.specific_properties = [];
		r.properties = [];
	} else {
		r.domains = [];
		r.ranges = [];
		if (c._domain in o) {
			var domains = (o[c._domain] instanceof Array) ? o[c._domain] : [o[c._domain]];
			domains.forEach(function(d) {
				var domain = this.getResource(d);
				if (r.domains.indexOf(domain) === -1) r.domains.push(domain);
			}.bind(this));
		}
		if (c._range in o) {
			var ranges = (o[c._range] instanceof Array) ? o[c._range] : [o[c._range]];
			ranges.forEach(function(d) {
				var range = this.getResource(d);
				if (r.ranges.indexOf(range) === -1) r.ranges.push(range);
			}.bind(this));
		}
	}
	
	var mapRestrictions = function(rst) {
		for (var k in rst) {
			if (k in r.restrictionProperties) {
				r.restrictionProperties[k] = merge(r.restrictionProperties[k], rst[k]);
			} else {
				r.restrictionProperties[k] = rst[k];
			}
		}
	}
	var supertypes = function(st) {
		// optional TODO - not needed: "ancestors" - getAncestors for convenience and for compatibility with rdfs.schema.org
		var subOf = (typeof this.mode != 'undefined' && this.mode === 'properties') ? c._subPropertyOf : c._subClassOf;
		if (subOf in st) {
			var sCs = (st[subOf] instanceof Array) ? st[subOf] : [st[subOf]];
			sCs.forEach(function(d) {
				var subClassOf = this.getResource(d);
				
				// is it external TODO
				if (isExternal(subClassOf)){
					addExternal.bind(this)(subClassOf);
					console.log( 'EXTERNAL subClassOf', subClassOf );
					console.log( '--> ', defaultPath(subClassOf)+'#' );
					// ../OUTPUT/www.ontologydesignpatterns.org_ont/dul/DUL.owl#
				} else if (isRestriction(subClassOf)) {
					// map property restrictions to r - makes special property definition later on in createSchema
					mapRestrictions(subClassOf.restrictions);
				} else {
					var parent = (subClassOf === c._thing) ? 'Thing' : subClassOf;
					if (r.supertypes.indexOf(parent) === -1) r.supertypes.push(parent);
					this.data.types.forEach(function(ts) {
						if (getId(ts) === subClassOf) supertypes.bind(this)(ts);
					}.bind(this));
				}
				
			}.bind(this));
		}	
	}
	supertypes.bind(this)(o);
	r.supertypes = r.supertypes.reverse();
	
	// equivalents
	var eqCl = (typeof this.mode != 'undefined' && this.mode === 'properties') ? c._equivalentP : c._equivalentC;
	if (eqCl in o) {
		var eCs = (o[eqCl] instanceof Array) ? o[eqCl] : [o[eqCl]];
		eCs.forEach(function(d) {
			var eq = this.getResource(d);
			
			// is it external TODO
			if (isExternal(eq)){
				addExternal.bind(this)(eq);
				console.log( 'EXTERNAL EQUIVALENT', eq );
			} else if (isRestriction(eq)) {
				// map property restrictions to r - makes special property definition later on in createSchema
				mapRestrictions(eq.restrictions);
			} else if (r.equivalents.indexOf(eq) === -1) {
				r.equivalents.push(eq);
			}
		}.bind(this));
	}
	
	// enum
	if (c._oneOf in o) {
		var enumArr = (o[c._oneOf] instanceof Array) ? o[c._oneOf] : [o[c._oneOf]];
		enumArr.forEach(function(d) {
			var one = this.getResource(d);
			if (one instanceof Array) {
				r.enum = r.enum.concat(one);	
			} else {
				r.enum.push(one);
			}
		});
	}
	
	
	/*
	// TODO !
	// equivalents, disjoints & restrictionProperties
	
	// owl:disjointWith			oneOf ????????
	/* "Each owl:disjointWith statement asserts that the class extensions of the two class descriptions involved have no individuals in common." BUT NOTE:
	The difference between "complementOf" and "disjointWith" is that the complement of a class includes everything not in the class. 
	A class that is *** disjoint with *** a described class is only known to be part of the described class's complement. 
	
	<owl:Class rdf:about="#Man">
	  <owl:disjointWith rdf:resource="#Woman"/>
	</owl:Class>
	*/
	
	// and 3.2.3 Axioms for complete classes without using owl:equivalentClass
	/*
	// owl:inverseOf 			?
	<owl:ObjectProperty rdf:ID="hasChild">
		<owl:inverseOf rdf:resource="#hasParent"/>
	</owl:ObjectProperty>
	
	// owl:sameAs 				?
	
	// xsd:pattern				-> pattern 
	
	/*
	for (var key in this.data.types) {
		var d = this.data.types[key];
		if ('equivalents' in d && d.equivalents.length > 0) {
			console.log( '1 equivalents: ',d.equivalents );
			d.equivalents.forEach(function(e) {
				if (e in this.data.types) {
					console.log( '2 equivalents: ', e, this.data.types[e] );	
				} else {
					// an equivalentClass which is not in this ontology - TODO EXTERNAL
				}
			});
		}
	}
	*/
	
	var maps = {};
	maps[c._intersectionOf] = 'allOf'; // ? FIXME TODO
	maps[c._unionOf] = 'anyOf';
	maps[c._complementOf] = 'not';
	maps[c._disjointWith] = 'disjoints';
	
	for (var k in maps) {
		if (k in o) {
			if (typeof o[k] === 'object' && c._class in o[k]) {
				// TODO if class has about it is a $ref str else a definition
				
				var curTypes = ((o[k][c._class] instanceof Array) ? o[k][c._class] : [o[k][c._class]]).map(this.OWL.bind(this));
				
				r[maps[k]] = curTypes;
			} else {
				// TODO - something went wrong - no classes in container
				r[maps[k]] = o[k];
			}
		}
	}
	
	
	// properties and specific_properties for this type
	if (this.mode === 'types') {
		var dp = (this.data.datatypes && this.data.properties) ? this.data.datatypes.concat(this.data.properties) : (this.data.datatypes ? this.data.datatypes : this.data.properties);
		if (dp) {
			dp.forEach(function(_d) {
				if (c._domain in _d) {
					var domains = (_d[c._domain] instanceof Array) ? _d[c._domain] : [_d[c._domain]];
					domains.forEach(function(d) {
						var domain = (typeof d === 'string') ? d : ((typeof d === 'object' && c._resource in d) ? d[c._resource] : null);
						var prop = getId(_d).replace(base, '');
						
						if (r.url === domain) {
							if (r.specific_properties.indexOf(prop) === -1) r.specific_properties.push(prop);
							if (r.properties.indexOf(prop) === -1) r.properties.push(prop);
						} else if (r.supertypes.indexOf(domain) > -1) {
							if (r.properties.indexOf(prop) === -1) r.properties.push(prop);
						};					
					});
				}
				
			});
			
			if ('equivalents' in r && r.equivalents.length > 0) {
				console.log( '1 equivalents: ', r.equivalents );
				r.equivalents.forEach(function(e) {
					if (e in this.data.types) {
						console.log( '2 equivalents: ', e, this.data.types[e] );	
					} else {
						// an equivalentClass which is not in this ontology - TODO EXTERNAL
					}
				}.bind(this));
			}
			
		}
	}
	
	return r;
}
constructor.prototype.convert = function(o) {
	this.data.id = this.base;
	this.data._layers = o._layers;
	// we currently use a mapping which is introduced by http://schema.rdfs.org as schema.org does not seem to be OWL
	var maps = {};
	maps[c._ontology] = 'meta';
	maps[c._class] = 'types';
	maps[c._datatype] = 'datatypes';
	maps[c._object] = 'properties';
	for (var k in o[c._rdf]) {
		console.log( 'Reading ', k);
		var key = (k in maps) ? maps[k] : k;
		this.data[key] = (o[c._rdf][k] instanceof Array) ? o[c._rdf][k] : [o[c._rdf][k]];
	}
	
	console.log( 'Working on types' );
	this.data.types = this.data.types.map(this.OWL.bind(this));
	// TODO - not needed! Just for convenience and for compatibility with rdfs.schema.org:
	// this.data.types.forEach(function(d){ subtypes(d, 'types'); });
	// <---
	if (this.data.properties) {
		console.log( 'Working on properties' );
		this.mode = 'properties';
		this.data.properties = this.data.properties.map(this.OWL.bind(this));
	}
	if (this.data.datatypes) {
		console.log( 'Working on datatypes' );
		this.mode = 'properties';
		this.data.datatypes = this.data.datatypes.map(this.OWL.bind(this));
	}
	
	// all data is still a badgerfish json representation (for standalone use), objectify it (for further use)
	// [{id: 'foo', ...}] = { foo: {id: 'foo', ...} }
	o = { types: {}, properties: {}, datatypes: {} };
	for (var key in this.data) {
		if (key in o) {
			this.data[key].forEach(function(d) {					
				if ('id' in d) o[key][d.id] = d;
			});
			this.data[key] = o[key];
		}
	}
	return this.data;
}

constructor.prototype.parseOWL = function(owlXML) {
	var rdfOptions = merge(this.options, {object: true});
	var o = rdfjson(owlXML, rdfOptions);
	this.schemas = {};
	this.data = {};	
	this.base = toUrl(('id' in o) ? o.id : o.xml$base);
	this.mode = 'types';
	
	// layers / namespaces
	var l = o._layers; 

	if (!(c._rdf in o) || !(c._class in o[c._rdf])) {
		/*return*/ console.warn('Did not find any OWL specifications. ');
	}
	
	var DIR = path.join(this.options.callerDir, this.options.outputDir, defaultPath(this.base));
	
	mkdirp(DIR, function (err) {
		if (err) return console.warn('Could not create output directory: ', DIR, err);
		console.log( 'Created output directory: ', DIR );
		
		// Convert
		this.convert(o);
		
		// TODO - delete this line, just for DEBUG ! -->
		fs.writeFileSync('./lib/debugOWL.json', JSON.stringify(this.data));
		// <--
		
		// Create Schema
		for (var key in this.data.types) {
			this.schemas[key] = this.createSchema(this.data.types[key]);
		}
		
		// Write Schema files
		for (var key in this.data.types) {
			var spec = this.data.types[key];
			var filename = toFilename(this.options.prefix.concat(spec.id, this.options.suffix));
			var filepath = path.join(DIR, filename);
			console.log( 'Writing schema ', filename );
			fs.writeFileSync(filepath, prettyJson(this.schemas[key]));
		}
		// Write Helper files
		if (this.options.schemaOrgCompat) {
			fs.writeFileSync('./lib/property-multiplicity.json', prettyJson(propertyMultiplicity));
			fs.writeFileSync('./lib/ignore-properties.json', prettyJson(ignore));
		}
		
		// TODO - delete this lines, just for DEBUG ! -->
		fs.writeFileSync('./lib/debugOWLext.json', prettyJson(this._externals));
		// <--
		
		// Return Object or JSON
		if (this.options.object) return this.data;
		var json = JSON.stringify(this.data);
		//See: http://timelessrepo.com/json-isnt-a-javascript-subset
		json = json.replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
		return json;
	}.bind(this));
		
	// TODO - not needed: just for convenience and for compatibility with rdfs.schema.org
	/*
	function subtypes(o, prop) {
		if (o.supertypes.length > 0) {
			o.supertypes.forEach(function(stype) {
				this.data[prop].forEach(function(node, i) {
					if (stype === node.id) {
						this.data[prop][i].subtypes.push(o.id);
					}
				});
			});
		}
		return o;
	}
	*/
}

constructor.prototype.createRel = function(key) {
	if (key === 'url') {
		return 'self';
	}
	return this.options.prefix + encodeURIComponent(key);
}


constructor.prototype.createSchema = function(spec) {
	var schema = {
		id: 			this.options.prefix + spec.id + this.options.suffix,
		title: 			spec.title,
		description: 	spec.description,
		translations: 	spec.translations,
		anyOf: 			[],
		allOf: 			[],
		oneOf: 			[],
		not:			[],
		type: 			[],
		required: 		[],
		properties: 	{},
		links: 			[],
		definitions:	{}
	};	
	
	if (spec.url) {
		schema.format = spec.url;
		schema.media = {type: 'application/json;profile='+spec.url};
	}
	if (spec.enum && spec.enum instanceof Array && spec.enum.length > 0) {
		schema.enum = spec.enum;
	} else {
		schema.type = 'object';
		schema.properties = {};
		schema.definitions.array = {
			type: 'array',
			items: {$ref: '#'}
		};
		if (hardcoded[spec.id]) {
			return trimSchema(merge(schema, getHardcoded(spec.id)));
		}
		
		schema.definitions.possibleRef = {
			oneOf: [
				{$ref: '#'},
				{
					type: 'string',
					format: 'uri',
					links: [{
						rel: 'full',
						href: '{+$}'
					}]
				}
			]
		};
		schema.definitions.possibleRefArray = {
			oneOf: [
				{
					type: 'string',
					format: 'uri',
					links: [{
						rel: 'full',
						href: '{+$}'
					}]
				},
				{
					type: 'array',
					items: {$ref: '#/definitions/possibleRef'}
				}
			]
		};
		
		schema.allOf = spec.supertypes.map(function (supertype) {
			return {$ref: supertype + this.options.suffix};
		}.bind(this));
		
		
		
		var createProperty = function (key) {
			
			if (key === 'array' || key === 'possibleRef' || key === 'possibleRefArray') {
				throw new Error('Not allowed key: ' + key);
			}
			var propSpec = (key in this.data.properties) ? this.data.properties[key] : ((key in this.data.datatypes) ? this.data.datatypes[key] : null);
			
			if (!propSpec) {
				throw new Error('Not found key: ' + key);
			}
			
			if (this.options.schemaOrgCompat && (ignore[key] || /\(legacy spelling;/.test(propSpec.description))) {
				ignore[key] = true;
				return;
			}
						
			if (hardcoded[key]) {
				schema.properties[key] = getHardcoded(key);
			} else {
				var sOptions = [];
				propSpec.ranges.forEach(function (type) {
					if (hardcoded[type]) {
						sOptions.push(getHardcoded(type));
					} else {
						var _ref = (schema.id != (this.options.prefix + type + this.options.suffix)) ? (this.options.prefix + type + this.options.suffix) : '';
						sOptions.push({$ref: _ref + '#/definitions/possibleRef'});
					}
				}.bind(this));
				if (sOptions.length == 1) {
					schema.properties[key] = sOptions[0];
				} else {
					schema.properties[key] = {anyOf: sOptions};
				}
			}
			
			var description = propSpec.description;
			var rp = (key in spec.restrictionProperties) ? spec.restrictionProperties[key] : null;
			
			if (this.options.schemaOrgCompat) {
				if (typeof propertyMultiplicity[key] !== 'boolean') {
					if (/^An? /.test(description)) {
						propertyMultiplicity[key] = true;
					} else if (/^The /.test(description) || /^is[A-Z]/.test(key)) {
						propertyMultiplicity[key] = false;
					} else {
						propertyMultiplicity[key] = description;
					}
				}
			} else {
				propertyMultiplicity[key] = (rp && 'minItems' in rp && rp.minItems > 1) ? true : description;
			}
			
			
			
			var subSchema = schema.properties[key];
			var shouldAddLink = (subSchema.format === 'uri');
			if (!schema.properties[key].$ref && !shouldAddLink) {
				subSchema = merge({
					title: propSpec.title,
					description: propSpec.description
				}, subSchema);
				schema.definitions[key] = subSchema
				schema.properties[key] = {$ref: '#/definitions/' + key}
			}
			
			if (propertyMultiplicity[key] === true) {
				var subSchema = schema.properties[key];
				if (subSchema.$ref && /^[^#]+#\/definitions\/possibleRef?$/.test(subSchema.$ref)) {
					subSchema.$ref += 'Array';
				} else if (shouldAddLink) {
					if (subSchema.$ref) {
						subSchema = {
							allOf: [subSchema]
						};
					}
					subSchema.links = subSchema.links || [];
					subSchema.links.push({
						rel: this.createRel(key),
						href: '{+$}',
						linkSource: 2
					});
					schema.properties[key] = {
						type: 'array',
						items: subSchema
					};
				} else {
					schema.properties[key] = {
						type: 'array',
						items: subSchema
					};
				}
			} else if (propertyMultiplicity[key] === false) {
				if (shouldAddLink) {
					schema.links.push({
						rel: this.createRel(key),
						href: '{+' + encodeURIComponent(key) + '}'
					});
				}
			} else {
				var subSchema = schema.properties[key];
				if (shouldAddLink) {
					if (subSchema.$ref) {
						subSchema = {
							allOf: [subSchema]
						};
					}
					subSchema.links = subSchema.links || [];
					subSchema.links.push({
						rel: 'full',
						href: '{+$}'
					});
				}
				schema.properties[key] = {
					oneOf: [
						subSchema,
						{
							type: 'array',
							items: subSchema
						}
					]
				};
			}

			var that = this;
			
			var toRef = function(type) {
				var _ref = (schema.id != (that.options.prefix + type + that.options.suffix)) ? (that.options.prefix + type + that.options.suffix) : '';
				var ref = _ref + '#/definitions/possibleRef' + ((propertyMultiplicity[key] === true) ? 'Array' : '');
				if ('$ref' in schema.properties[key] && ref === schema.properties[key].$ref) delete schema.properties[key].$ref;
				return {$ref: ref};
			}
			
			var isOneOf = (propertyMultiplicity[key] != true);
			
			var setRestriction = function(type, value) {
				if (isOneOf) { 
					if (type === 'items' || type === 'enum') {
						schema.properties[key].oneOf[0] = value;
					}
					schema.properties[key].oneOf[1][type] = value;
				} else {
					schema.properties[key][type] = value;
				}
			}
			
			var extendName = function(p, type){
				return p.replace(new RegExp('^'+type+'\\$'), l[type]);
			}
			
			// (global) propertyRestrictions
			if ('propertyRestrictions' in schema.properties[key]) {
				// TODO
				// note : these describe "logical characteristics"
				// see http://www.w3.org/TR/owl-ref/#TransitiveProperty-def (4.4 ff.)
				// CAN this be expressed with propertyLinks ?
				// see https://groups.google.com/forum/#!topic/json-schema/d4XHU5jQKhI
				
				//var links = [];
				var pr = schema.properties[key].propertyRestrictions;
				if (pr.indexOf(c._functionalP) > -1) {
					setRestriction('uniqueItems', true);
					//links.push({rel: extendName(c._functionalP, 'owl')});
				}
				if (pr.indexOf(c._transitiveP) > -1) {
					//links.push({rel: extendName(c._transitiveP, 'owl')});
				}
				if (pr.indexOf(c._symmetricP) > -1) {
					//links.push({rel: extendName(c._symmetricP, 'owl')});
				}
				
			}
			
			// (specific) restrictionProperties
			// TODO - see https://github.com/json-schema/json-schema/wiki/contains-(v5-proposal)
			if (rp) {
				if ('minItems' in rp) {
					// note: if minItems > 1 then schema is already an array only ("propertyMultiplicity")
					if (schema.properties[key].minItems > 0 && schema.required.indexOf(key) === -1) schema.required.push(key);
					setRestriction('minItems', rp.minItems);
				}
				if ('maxItems' in rp) setRestriction('maxItems', rp.maxItems);
								
				if ('allValuesFrom' in rp) {
					if ('allOf' in schema.properties[key] && schema.properties[key].allOf instanceof Array) {
						setRestriction('items', {allOf: schema.properties[key].allOf.concat(rp.allValuesFrom.map(toRef.bind(this)))});
					} else {
						setRestriction('items', {allOf: rp.allValuesFrom.map(toRef)});
					}
					setRestriction('additionalItems', false);
				}
				if ('someValuesFrom' in rp) {
					if ('anyOf' in schema.properties[key] && schema.properties[key].anyOf instanceof Array) {
						setRestriction('items', {anyOf: schema.properties[key].anyOf.concat(rp.someValuesFrom.map(toRef.bind(this)))});
					} else {
						setRestriction('items', {anyOf: rp.someValuesFrom.map(toRef.bind(this))});
					}
					setRestriction('additionalItems', true);
					
					if (!('required' in schema)) schema.required = [];
					if (schema.required.indexOf(key) === -1) schema.required.push(key);
				}
				if ('hasValue' in rp) {
					var enumArr = rp.hasValue.map(toRef.bind(this));
					var _enum = [];
					enumArr.forEach(function(d) {
						var one = this.getResource(d);
						if (one instanceof Array) {
							_enum = _enum.concat(one);	
						} else {
							_enum.push(one);
						}
					}.bind(this));
					setRestriction('enum', _enum);				
				}
							
			}
		}
		
		spec.specific_properties.forEach(createProperty.bind(this));
		// TODO
		Object.keys(spec.restrictionProperties).forEach(createProperty.bind(this));
		
		
		
		
		var multiples = function (o) {
			if ('url' in o && o.url != '') {
				// this is a reference - TODO EXTERNAL
				return {$ref: o.id + this.options.suffix};
			} else {
				// this is a 'anonymous' definition
				var subSchema = this.createSchema(o);
				console.log( "'anonymous' definition in allOf", subSchema );
				schema.definitions[o.id] = subSchema;
				return {$ref: '#/definitions/' + o.id};						
			}
		};
		
		if (spec.allOf && spec.allOf instanceof Array && spec.allOf.length>0) {
			schema.allOf = schema.allOf.concat(spec.allOf.map(multiples.bind(this)));
		}
		var vars = ['anyOf', 'oneOf', 'not'];
		vars.forEach(function(v) {
			if (spec[v] && spec[v] instanceof Array && spec[v].length > 0) {
				schema[v] = spec[v].map(multiples.bind(this));
			}
		});
	}
	
	return trimSchema(schema);
}
