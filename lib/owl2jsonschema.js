// TODO - documentation

// specs
// OWL1	http://www.w3.org/TR/owl-ref/
// OWL2 http://www.w3.org/TR/owl2-new-features/
// RDFS http://www.w3.org/TR/2004/REC-rdf-schema-20040210/

/* TODO 
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
schema.org 			--> 				special parser rdfs.schema.org (schema.org is cheaper than OWL or RDFS) - TODO schemaOrgCompat
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

module.exports = function(owlXML, options) {
	"use strict";
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
	var schemaOrgCompat = false;
	/* TODO
		schemaOrgCompat MUST go to options
		and is a boolean expressing legacy support for schema.rdfs.org
	*/
	
	var fs = require('fs');
	var url = require('url');
	var path = require('path');
	var mkdirp = require('mkdirp');
	// submodules (in same folder)
	var prettyJson = require('./pretty-json');
	var rdfParser = require('./rdf2json');
	var hardcodedSchemas = require('./hardcoded-schemas.json');
	var ignoreProperties = require('./ignore-properties.json');
	var propertyMultiplicity = (schemaOrgCompat) ? require('./property-multiplicity.json') : {};
	
	var mode = 'types';
	var i = 0;
	var allSchemas = {};
	var allData = {};
	var rdfOptions = merge(options, {object: true});
	
	var o = rdfParser(owlXML, rdfOptions);	
	var base = toUrl(('id' in o) ? o.id : o.xml$base);
	// layers / namespaces
	var l = o._layers; 
	// constants
	var c = { 
		DIR: 			path.join(options.callerDir, options.outputDir, defaultPath(base)),
		EXT:			{},
		// PREDEFINED NAMESPACES: ['xml', 'rdf', 'owl', 'rdfs']
		// XML / RDF
		_base:			'xml$base',
		_lang:			'xml$lang',
		_rdf:			'rdf$RDF',
		_id:			'rdf$ID',
		_resource:		'rdf$resource',
		_about:			'rdf$about',
		_type: 			'rdf$type',
		// OWL
		_thing:			'owl$Thing',
		_ontology:		'owl$Ontology',
		_class:			'owl$Class',
		_datatype:		'owl$DatatypeProperty',
		_object:		'owl$ObjectProperty',
		_functionalP:	'owl$FunctionalProperty',
		_transitiveP:	'owl$TransitiveProperty',
		_symmetricP:	'owl$SymmetricProperty',
		_equivalentC:	'owl$equivalentClass',
		_equivalentP:	'owl$equivalentProperty',
		_oneOf:			'owl$oneOf',
		_unionOf:		'owl$unionOf',
		_intersectionOf:'owl$intersectionOf',
		_complementOf:	'owl$complementOf',
		_disjointWith:	'owl$disjointWith',
		_restriction: 	'owl$Restriction',
		_cardinality: 	'owl$cardinality',
		_minCardinality:'owl$minCardinality',
		_maxCardinality:'owl$maxCardinality',
		_onProperty: 	'owl$onProperty',
		_allValuesFrom: 'owl$allValuesFrom',
		_someValuesFrom:'owl$someValuesFrom',
		_hasValue: 		'owl$hasValue',
		// RDFS
		_subClassOf:	'rdfs$subClassOf',
		_subPropertyOf: 'rdfs$subPropertyOf',
		_domain:		'rdfs$domain',
		_range:			'rdfs$range',
		_label:			'rdfs$label',
		_comment:  		'rdfs$comment'
	}
	
	if (!(c._rdf in o) || !(c._class in o[c._rdf])) {
		/*return*/ console.warn('Did not find any OWL specifications. ');
	} 
	
	mkdirp(c.DIR, function (err) {
		if (err) return console.warn('Could not create output directory: ', c.DIR, err);
		console.log( 'Created output directory: ', c.DIR );
	
		parse(o);
		
		// TODO - delete this line, just for DEBUG ! -->
		fs.writeFileSync('./lib/debugOWL.json', JSON.stringify(allData));
		// <--
		
		for (var key in allData.types) {
			allSchemas[key] = createSchema(allData.types[key]);
		}
		for (var key in allData.types) {
			var spec = allData.types[key];
			var filename = toFilename(options.prefix.concat(spec.id, options.suffix));
			var filepath = path.join(c.DIR, filename);
			console.log( 'Writing schema ', filename );
			fs.writeFileSync(filepath, prettyJson(allSchemas[key]));
		}
		if (schemaOrgCompat) {
			fs.writeFileSync('./lib/property-multiplicity.json', prettyJson(propertyMultiplicity));
			fs.writeFileSync('./lib/ignore-properties.json', prettyJson(ignoreProperties));
		}
		
		// TODO - delete this lines, just for DEBUG ! -->
		fs.writeFileSync('./lib/debugOWLext.json', prettyJson(c.EXT));
		// <--
		
		if (options.object) return allData;
		var json = JSON.stringify(allData);
		//See: http://timelessrepo.com/json-isnt-a-javascript-subset
		json = json.replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
		return json;
	});
	
	function parse(o) {
		allData.id = base;
		allData._layers = o._layers;
		// we currently use a mapping which is introduced by http://schema.rdfs.org as schema.org does not seem to be OWL
		var maps = {};
		maps[c._ontology] = 'meta';
		maps[c._class] = 'types';
		maps[c._datatype] = 'datatypes';
		maps[c._object] = 'properties';
		for (var k in o[c._rdf]) {
			console.log( 'Reading ', k);
			var key = (k in maps) ? maps[k] : k;
			allData[key] = (o[c._rdf][k] instanceof Array) ? o[c._rdf][k] : [o[c._rdf][k]];
		}
		
		console.log( 'Working on types' );
		allData.types = allData.types.map(OWL);
		// TODO - not needed! Just for convenience and for compatibility with rdfs.schema.org:
		allData.types.forEach(function(d){ subtypes(d, 'types'); });
		// <---
		if (allData.properties) {
			console.log( 'Working on properties' );
			mode = 'properties';
			allData.properties = allData.properties.map(OWL);
		}
		if (allData.datatypes) {
			console.log( 'Working on datatypes' );
			mode = 'properties';
			allData.datatypes = allData.datatypes.map(OWL);
		}
		
		// all data is still a badgerfish json representation (for standalone use), objectify it (for further use)
		// [{id: 'foo', ...}] = { foo: {id: 'foo', ...} }
		o = { types: {}, properties: {}, datatypes: {} };
		for (var key in allData) {
			if (key in o) {
				allData[key].forEach(function(d) {					
					if ('id' in d) o[key][d.id] = d;
				});
				allData[key] = o[key];
			}
		}
		return allData;
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
	
	function defaultPath(uri) {
		var u = url.parse(uri, false, true);
		console.log( uri, u );
		return path.join('./OUTPUT/', u.host.concat(u.pathname.replace(new RegExp('\\' + path.sep, 'g'), '_')) );
	}
	
	function defaultId(uri, suffix) {
		// dbpedia.org_ontology/1
		var u = url.parse(uri, false, true);
		return (u.host.concat(u.pathname, suffix.toString())).replace(new RegExp('\\' + path.sep, 'g'), '_');
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
	
	function getId(o) {
		// In RDF declaration is not mandatory anyway, 
		// so put :about (reference) over :ID (declaration)
		// and support OWL 2 :NamedIndividual
		// <owl:NamedIndividual rdf:about="Aubergine"> TODO
		
		if (typeof o === 'object' && c._about in o) return o[c._about].replace(base, '');
		return (c._id in o) ? o[c._id].replace(base, '') : defaultId(base, i);
	}
	
	function getText(o) {
		if (typeof o === 'object' && '$' in o) return o.$
		return o;
	}
	
	function getResource(o) {
		if (typeof o === 'object' && c._thing in o) return o[c._thing];
		// rdf$resource or string
		var resource = '';
		if (typeof o === 'string') {
			resource = (o.substr(0,1) === '#') ? o.substr(1) : o;
			return resource.replace(base, '');
		}
		if (typeof o === 'object' && c._resource in o) {
			resource = (o[c._resource].substr(0,1) === '#') ? o[c._resource].substr(1) : o[c._resource];
			return resource.replace(base, '');
		}
			
		// this is an 'anonymous' resource
		// e.g. an 'anonymous' class or an owl$Restriction
		// in equivalentClass or subclassOf !
		console.log( 'anonymous resource', o );
		console.log( 'OWL anonymous resource', (c._class in o) ? OWL(o[c._class]) : OWL(o) );
		resource = (c._class in o) ? OWL(o[c._class]) : {restrictions: getRestrictions(o)};
		// xTODO
		return (resource) ? resource : '';
	}
	
	function getRestrictions(o) {
		var restrictions = {}
		var _id = o[c._restriction][c._onProperty].replace(base, '');
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
			restrictions[_id].allValuesFrom.push(getResource(o[c._restriction][c._allValuesFrom]));
		}
		if (c._someValuesFrom in o[c._restriction]) {
			if (!('someValuesFrom' in restrictions[_id])) restrictions[_id].someValuesFrom = [];
			restrictions[_id].someValuesFrom.push(getResource(o[c._restriction][c._someValuesFrom]));
		}
		if (c._hasValue in o[c._restriction]) {
			if (!('hasValue' in restrictions[_id])) restrictions[_id].hasValue = [];
			restrictions[_id].hasValue.push(getResource(o[c._restriction][c._hasValue]));
		}
		return restrictions;
	}
	
	function getUrl(o) {
		// In RDF declaration is not mandatory anyway, 
		// so put :about (reference) over :ID (declaration)
		// TODO anonymous classes
		if (typeof o === 'object' && c._about in o) return o[c._about];
		return (c._id in o) ? o[c._id] : '';
	}
	
	function isRestriction(o) {
		return (o && typeof o === 'object' && !('url' in o) && 'restrictions' in o);	
	}
	
	function isExternal(uri) {
		if (!uri || typeof uri != 'string' || uri === '') return false;
		return (uri.indexOf(base) === -1 && uri.indexOf('//') > -1);
	}
	
	function addExternal(uri) {
		var u = url.parse(uri, false, true);
		
		if (u.host === 'schema.org') {
			var parts = uri.split('schema.org/');
			parts[0] = parts[0].concat('schema.org');
		} else {
			var parts = uri.split('#');
		}
		if (!(parts[0] in c.EXT)) c.EXT[parts[0]] = [];
		if (parts.length > 1 && c.EXT[parts[0]].indexOf(parts[1]) < 0) c.EXT[parts[0]].push(parts[1]);
	}
	
	// TODO - not needed: just for convenience and for compatibility with rdfs.schema.org
	function subtypes(o, prop) {
		if (o.supertypes.length > 0) {
			o.supertypes.forEach(function(stype) {
				allData[prop].forEach(function(node, i) {
					if (stype === node.id) {
						allData[prop][i].subtypes.push(o.id);
					}
				});
			});
		}
		return o;
	}
	
	function OWL(o) { 
		i++; // if a top class is neither defined (:ID) nor referenced, for auto id;
		
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
			addExternal(r.url);
			console.log( 'EXTERNAL', r.url );
			console.log( '--> ', defaultPath(r.url)+'#' );
		}		
		
		// support JSON schema meta 0.5 proposal 'translations'
		var titleAndDesc = function(type, t) {
			if (typeof t === 'object' && c._lang in t) {
				if (t[c._lang].substr(0,2) === options.defaultLocale) {
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
			if (mode != 'types') {
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
			r.restrictionProperties = getRestrictions(o);
		}			
		
		// properties or domains/ranges mapping
		if (typeof mode === 'undefined' || mode === 'types') {
			r.subtypes = []; 
			r.specific_properties = [];
			r.properties = [];
		} else {
			r.domains = [];
			r.ranges = [];
			if (c._domain in o) {
				var domains = (o[c._domain] instanceof Array) ? o[c._domain] : [o[c._domain]];
				domains.forEach(function(d) {
					var domain = getResource(d);
					if (r.domains.indexOf(domain) === -1) r.domains.push(domain);
				});
			}
			if (c._range in o) {
				var ranges = (o[c._range] instanceof Array) ? o[c._range] : [o[c._range]];
				ranges.forEach(function(d) {
					var range = getResource(d);
					if (r.ranges.indexOf(range) === -1) r.ranges.push(range);
				});
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
			var subOf = (typeof mode != 'undefined' && mode === 'properties') ? c._subPropertyOf : c._subClassOf;
			if (subOf in st) {
				var sCs = (st[subOf] instanceof Array) ? st[subOf] : [st[subOf]];
				sCs.forEach(function(d) {
					var subClassOf = getResource(d);
					
					// is it external TODO
					if (isExternal(subClassOf)){
						addExternal(subClassOf);
						console.log( 'EXTERNAL subClassOf', subClassOf );
						console.log( '--> ', defaultPath(subClassOf)+'#' );
						// ../OUTPUT/www.ontologydesignpatterns.org_ont/dul/DUL.owl#
					} else if (isRestriction(subClassOf)) {
						// map property restrictions to r - makes special property definition later on in createSchema
						mapRestrictions(subClassOf.restrictions);
					} else {
						var parent = (subClassOf === c._thing) ? 'Thing' : subClassOf;
						if (r.supertypes.indexOf(parent) === -1) r.supertypes.push(parent);
						allData.types.forEach(function(ts) {
							if (getId(ts) === subClassOf) supertypes(ts);
						});
					}
					
				});
			}	
		}
		supertypes(o);
		r.supertypes = r.supertypes.reverse();
		
		// equivalents
		var eqCl = (typeof mode != 'undefined' && mode === 'properties') ? c._equivalentP : c._equivalentC;
		if (eqCl in o) {
			var eCs = (o[eqCl] instanceof Array) ? o[eqCl] : [o[eqCl]];
			eCs.forEach(function(d) {
				var eq = getResource(d);
				
				// is it external TODO
				if (isExternal(eq)){
					addExternal(eq);
					console.log( 'EXTERNAL EQUIVALENT', eq );
				} else if (isRestriction(eq)) {
					// map property restrictions to r - makes special property definition later on in createSchema
					mapRestrictions(eq.restrictions);
				} else if (r.equivalents.indexOf(eq) === -1) {
					r.equivalents.push(eq);
				}
			});
			
		}
		
		// enum
		if (c._oneOf in o) {
			var enumArr = (o[c._oneOf] instanceof Array) ? o[c._oneOf] : [o[c._oneOf]];
			enumArr.forEach(function(d) {
				var one = getResource(d);
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
		for (var key in allData.types) {
			var d = allData.types[key];
			if ('equivalents' in d && d.equivalents.length > 0) {
				console.log( '1 equivalents: ',d.equivalents );
				d.equivalents.forEach(function(e) {
					if (e in allData.types) {
						console.log( '2 equivalents: ', e, allData.types[e] );	
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
					
					var curTypes = ((o[k][c._class] instanceof Array) ? o[k][c._class] : [o[k][c._class]]).map(OWL);
					
					r[maps[k]] = curTypes;
				} else {
					// TODO - something went wrong - no classes in container
					r[maps[k]] = o[k];
				}
			}
		}
		
		
		// properties and specific_properties for this type
		if (mode === 'types') {
			var dp = (allData.datatypes && allData.properties) ? allData.datatypes.concat(allData.properties) : (allData.datatypes ? allData.datatypes : allData.properties);
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
						if (e in allData.types) {
							console.log( '2 equivalents: ', e, allData.types[e] );	
						} else {
							// an equivalentClass which is not in this ontology - TODO EXTERNAL
						}
					});
				}
				
			}
		}
		
		return r;
	}
	
	function getHardcoded(key) {
		return JSON.parse(JSON.stringify(hardcodedSchemas[key]));
	}
	
	function createRel(key) {
		if (key === 'url') {
			return 'self';
		}
		return options.prefix + encodeURIComponent(key);
	}
	
	function extendName(p, type){
		return p.replace(new RegExp('^'+type+'\\$'), l[type]);
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
	
	function createSchema(spec) {
		var schema = {
			id: 			options.prefix + spec.id + options.suffix,
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
		
		var makeProperty = function (key) {
			
			if (key === 'array' || key === 'possibleRef' || key === 'possibleRefArray') {
				throw new Error('Not allowed key: ' + key);
			}
			var propSpec = (key in allData.properties) ? allData.properties[key] : ((key in allData.datatypes) ? allData.datatypes[key] : null);
			
			if (!propSpec) {
				throw new Error('Not found key: ' + key);
			}
			
			if (schemaOrgCompat && (ignoreProperties[key] || /\(legacy spelling;/.test(propSpec.description))) {
				ignoreProperties[key] = true;
				return;
			}
						
			if (hardcodedSchemas[key]) {
				schema.properties[key] = getHardcoded(key);
			} else {
				var sOptions = [];
				propSpec.ranges.forEach(function (type) {
					if (hardcodedSchemas[type]) {
						sOptions.push(getHardcoded(type));
					} else {
						var _ref = (schema.id != (options.prefix + type + options.suffix)) ? (options.prefix + type + options.suffix) : '';
						sOptions.push({$ref: _ref + '#/definitions/possibleRef'});
					}
				});
				if (sOptions.length == 1) {
					schema.properties[key] = sOptions[0];
				} else {
					schema.properties[key] = {anyOf: sOptions};
				}
			}
			
			var description = propSpec.description;
			var rp = (key in spec.restrictionProperties) ? spec.restrictionProperties[key] : null;
			
			if (schemaOrgCompat) {
				if (typeof propertyMultiplicity[key] !== 'boolean') {
					if (/^An? /.test(description)) {
						console.log( 'a (true)' );
						propertyMultiplicity[key] = true;
					} else if (/^The /.test(description) || /^is[A-Z]/.test(key)) {
						console.log( 'b (false)' );
						propertyMultiplicity[key] = false;
					} else {
						console.log( 'c' );
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
						rel: createRel(key),
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
						rel: createRel(key),
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
			
			var toRef = function(type) {
				var _ref = (schema.id != (options.prefix + type + options.suffix)) ? (options.prefix + type + options.suffix) : '';
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
						setRestriction('items', {allOf: schema.properties[key].allOf.concat(rp.allValuesFrom.map(toRef))});
					} else {
						setRestriction('items', {allOf: rp.allValuesFrom.map(toRef)});
					}
					setRestriction('additionalItems', false);
				}
				if ('someValuesFrom' in rp) {
					if ('anyOf' in schema.properties[key] && schema.properties[key].anyOf instanceof Array) {
						setRestriction('items', {anyOf: schema.properties[key].anyOf.concat(rp.someValuesFrom.map(toRef))});
					} else {
						setRestriction('items', {anyOf: rp.someValuesFrom.map(toRef)});
					}
					setRestriction('additionalItems', true);
					
					if (!('required' in schema)) schema.required = [];
					if (schema.required.indexOf(key) === -1) schema.required.push(key);
				}
				if ('hasValue' in rp) {
					var enumArr = rp.hasValue.map(toRef);
					var _enum = [];
					enumArr.forEach(function(d) {
						var one = getResource(d);
						if (one instanceof Array) {
							_enum = _enum.concat(one);	
						} else {
							_enum.push(one);
						}
					});
					setRestriction('enum', _enum);				
				}
							
			}
		}
		
		
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
			if (hardcodedSchemas[spec.id]) {
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
				return {$ref: supertype + options.suffix};
			});
			spec.specific_properties.forEach(makeProperty);
			// TODO
			Object.keys(spec.restrictionProperties).forEach(makeProperty);
			
			var multiples = function (o) {
				if ('url' in o && o.url != '') {
					// this is a reference - TODO EXTERNAL
					return {$ref: o.id + options.suffix};
				} else {
					// this is a 'anonymous' definition
					var subSchema = createSchema(o);
					console.log( "'anonymous' definition in allOf", subSchema );
					schema.definitions[o.id] = subSchema;
					return {$ref: '#/definitions/' + o.id};						
				}
			}
			
			if (spec.allOf && spec.allOf instanceof Array && spec.allOf.length>0) {
				schema.allOf = schema.allOf.concat(spec.allOf.map(multiples));
			}
			var vars = ['anyOf', 'oneOf', 'not'];
			vars.forEach(function(v) {
				if (spec[v] && spec[v] instanceof Array && spec[v].length > 0) {
					schema[v] = spec[v].map(multiples);
				}
			});
		}
		
		return trimSchema(schema);
	}
}


/* example 1 with refs BUT example 2 with own classes aka definitions
{  
    "rdf:ID":"LivingBeing",
    "owl:unionOf":{  
        "rdf:parseType":"Collection",
        "owl:Class":[  
            {  
                "rdf:about":"#Plant"
            },
            {  
                "rdf:about":"#Animal"
            }
        ]
    }
}
//
{  
    "owl:intersectionOf":{  
        "rdf:parseType":"Collection",
        "owl:Class":[  
            {  
                "owl:oneOf":{  
                    "rdf:parseType":"Collection",
                    "owl:Thing":[  
                        {  
                            "rdf:about":"#Tosca"
                        },
                        {  
                            "rdf:about":"#Salome"
                        }
                    ]
                }
            },
            {  
                "owl:oneOf":{  
                    "rdf:parseType":"Collection",
                    "owl:Thing":[  
                        {  
                            "rdf:about":"#Turandot"
                        },
                        {  
                            "rdf:about":"#Tosca"
                        }
                    ]
                }
            }
        ]
    }
}
*/