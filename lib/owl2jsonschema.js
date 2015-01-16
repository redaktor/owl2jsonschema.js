/* TODO 
// make generate independent (w. credits...)

// ! What to do with anonymous classes <owl:Class> ? autoId

rdf:resource and owl:thing ???

http://www.w3.org/TR/owl2-syntax/#Entities.2C_Literals.2C_and_Anonymous_Individuals
5.5 Annotation Properties

- make this generic for RDFS - 
if no OWL is found
make
owl:Class
become
rdfs:Class
etc.

TODO for SCHEMER [properties validation]:
Table 3. Reserved Vocabulary of OWL 2 with Special Treatment :
['owl:backwardCompatibleWith', 'owl:bottomDataProperty', 'owl:bottomObjectProperty', 'owl:deprecated', 'owl:incompatibleWith', 'owl:Nothing', 'owl:priorVersion', 'owl:rational', 'owl:real', 'owl:versionInfo', 'owl:Thing', 'owl:topDataProperty', 'owl:topObjectProperty', 'rdf:langRange', 'rdf:PlainLiteral', 'rdf:XMLLiteral', 'rdfs:comment', 'rdfs:isDefinedBy', 'rdfs:label', 'rdfs:Literal', 'rdfs:seeAlso', 'xsd:anyURI', 'xsd:base64Binary', 'xsd:boolean', 'xsd:byte', 'xsd:dateTime', 'xsd:dateTimeStamp', 'xsd:decimal', 'xsd:double', 'xsd:float', 'xsd:hexBinary', 'xsd:int', 'xsd:integer', 'xsd:language', 'xsd:length', 'xsd:long', 'xsd:maxExclusive', 'xsd:maxInclusive', 'xsd:maxLength', 'xsd:minExclusive', 'xsd:minInclusive', 'xsd:minLength', 'xsd:Name', 'xsd:NCName', 'xsd:negativeInteger', 'xsd:NMTOKEN', 'xsd:nonNegativeInteger', 'xsd:nonPositiveInteger', 'xsd:normalizedString', 'xsd:pattern', 'xsd:positiveInteger', 'xsd:short', 'xsd:string', 'xsd:token', 'xsd:unsignedByte', 'xsd:unsignedInt', 'xsd:unsignedLong', 'xsd:unsignedShort']
*/

var fs = require('fs');
var url = require('url');
var path = require('path');
var mkpath = require('mkdirp');
// submodules (in same folder)
var prettyJson = require('./pretty-json');
var parser = require('./rdf2json');
var hardcodedSchemas = require('./hardcoded-schemas.json');
var propertyMultiplicity = require('./property-multiplicity.json');
var ignoreProperties = require('./ignore-properties.json');
		
module.exports = function(owlXML, options) {
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
	var mode = 'types';
	var i = 0;
	var allSchemas = {};
	var allData = {};
	var rdfOptions = merge(options, {object: true});
	
	var o = parser(owlXML, rdfOptions);	
	var base = toUrl(('id' in o) ? o.id : o[c._base]);
	
	// layers / namespaces
	var l = o._layers; 
	// constants
	// PREDEFINED NAMESPACES: ['xml', 'rdf', 'owl', 'rdfs']
	var c = { 
		_base:			'xml$base',
		_lang:			'xml$lang',
		_rdf:			'rdf$RDF',
		_id:			'rdf$ID',
		_resource:		'rdf$resource',
		_about:			'rdf$about',
		// OWL
		_thing:			'owl$Thing',
		_ontology:		'owl$Ontology',
		_class:			'owl$Class',
		_datatype:		'owl$DatatypeProperty',
		_object:		'owl$ObjectProperty',
		_eqClass:		'owl$equivalentClass',
		_eqProperty:	'owl$equivalentProperty',
		_oneOf:			'owl$oneOf',
		_unionOf:		'owl$unionOf',
		_intersectionOf:'owl$intersectionOf',
		_complementOf:	'owl$complementOf',
		_disjointWith:	'owl$disjointWith',
		// RDFS
		_subClassOf:	'rdfs$subClassOf',
		_subPropertyOf: 'rdfs$subPropertyOf',
		_domain:		'rdfs$domain',
		_range:			'rdfs$range',
		_label:			'rdfs$label',
		_comment:  		'rdfs$comment'
	}
	
	if (!(c._rdf in o) || !(c._class in o[c._rdf])) {
		return console.warn('Did not find any OWL specifications. ');
	} 
	
	if (options.outputDir === '') options.outputDir = defaultPath(base);
	var _outDir = path.join(options.callerDir, options.outputDir);
	mkpath(_outDir, function (err) {
		if (err) return console.warn('Could not create output directory: ', _outDir, err);
		console.log( 'Created output directory: ', _outDir );
	
		parse(o);
		// TODO - CREATE SCHEMAS
		for (var key in allData.types) {
			allSchemas[key] = createSchema(allData.types[key]);
		}
		for (var key in allData.types) {
			var spec = allData.types[key];
			var filename = spec.id.concat(options.suffix);
			var filepath = path.join(_outDir, filename);
			console.log( 'Writing schema ', filename );
			fs.writeFileSync(filepath, prettyJson(allSchemas[key]));
		}
		fs.writeFileSync('./lib/property-multiplicity.json', prettyJson(propertyMultiplicity));
		fs.writeFileSync('./lib/ignore-properties.json', prettyJson(ignoreProperties));
		//
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
		allData.types = allData.types.map(owl);
		// TODO - not needed! Just for convenience and for compatibility with rdfs.schema.org:
		allData.types.forEach(function(d){ subtypes(d, 'types'); });
		// <---
		if (allData.properties) {
			console.log( 'Working on properties' );
			mode = 'properties';
			allData.properties = allData.properties.map(owl);
		}
		if (allData.datatypes) {
			console.log( 'Working on datatypes' );
			mode = 'properties';
			allData.datatypes = allData.datatypes.map(owl);
		}
		
		// all data is still a badgerfish json representation (for standalone use), objectify it (for further use)
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
	
	function defaultPath(uri) {
		var u = url.parse(uri, false, true);
		return path.join('./OUTPUT/', u.host.concat(u.pathname.replace(path.sep, '_')) );
	}
	
	function defaultId(uri, suffix) {
		// dbpedia.org_ontology/1
		var u = url.parse(uri, false, true);
		return (u.host.concat(u.pathname, suffix.toString())).replace(new RegExp('\\' + path.sep, 'g'), '_');
	}
	
	function toUrl(u) { return (typeof u === 'string') ? ((u.slice(-1) != '/') ? u+'/' : u) : null; }
	
	function getId(o) {
		// In RDF declaration is not mandatory anyway, 
		// so put :about (reference) over :ID (declaration)
		// TODO anonymous classes
		if (typeof o === 'object' && c._about in o) return o[c._about].replace(base, '');
		return (c._id in o) ? o[c._id].replace(base, '') : defaultId(base, i);
	}
	
	function getUrl(o) {
		// In RDF declaration is not mandatory anyway, 
		// so put :about (reference) over :ID (declaration)
		// TODO anonymous classes
		if (typeof o === 'object' && c._about in o) return o[c._about];
		return (c._id in o) ? o[c._id] : '';
	}
	
	function getResource(o) {
		var resource = (typeof o === 'object' && c._resource in o) ? o[c._resource] : ((typeof o === 'string') ? o : null);
		return (resource) ? resource : ((typeof o === 'object' && c._thing in o) ? o[c._thing] : {});
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
	
	function owl(o) { 
		// if a top class is neither defined (:ID) nor referenced, for auto id;
		i++;
		
		var r = {
			id: getId(o),
			url: getUrl(o),
			comment: '',
			title: '',		// was label
			description: '',// was comment_plain
			translations: { title: {}, description: {} },
			ancestors: 	[],
			enum: 		[], // was instances
			supertypes: [],
			equivalents:[]
		};
		
		
		// support JSON schema meta 0.5 proposal 'translations'
		var titleAndDesc = function(type, t) {
			if (typeof t === 'string') {
				r[type] = t;
			} else if (typeof t === 'object' && c._lang in t) {
				if (t[c._lang].substr(0,2) === options.defaultLocale) {
					r[type] = t['$'];
				} else {
					r.translations[type][t[c._lang]] = t['$'];
				}
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
					r.domains.push(getResource(d).replace(base, ''));
				});
			}
			if (c._range in o) {
				var ranges = (o[c._range] instanceof Array) ? o[c._range] : [o[c._range]];
				ranges.forEach(function(d) {
					r.ranges.push(getResource(d).replace(base, ''));
				});
			}
		}
		
		var supertypes = function(st) {
			// TODO - not needed: "ancestors" - getAncestors for convenience and for compatibility with rdfs.schema.org
			var subOf = (typeof mode != 'undefined' && mode === 'properties') ? c._subPropertyOf : c._subClassOf;
			if (subOf in st) {
				var sCs = (st[subOf] instanceof Array) ? st[subOf] : [st[subOf]];
				sCs.forEach(function(d) {
					var subClassOf = getResource(d);
					var parent = (subClassOf === c._thing) ? 'Thing' : subClassOf.replace(base, '');
					r.supertypes.push(parent);
					allData.types.forEach(function(ts) {
						if (getId(ts) === subClassOf) supertypes(ts);
					});
				});
			}	
		}
		supertypes(o);
		r.supertypes = r.supertypes.reverse();
		
		var eqCl = (typeof mode != 'undefined' && mode === 'properties') ? c._eqProperty : c._eqClass;
		if (eqCl in o) {
			var eCs = (o[eqCl] instanceof Array) ? o[eqCl] : [o[eqCl]];
			eCs.forEach(function(d) {
				r.equivalents.push(getResource(d).replace(base, ''));
			});
		}
		
		if (c._oneOf in o) {
			var enumArr = (o[c._oneOf] instanceof Array) ? o[c._oneOf] : [o[c._oneOf]];
			enumArr.forEach(function(d) {
				var one = getResource(d);
				var ones = (one instanceof Array) ? one : [one];
				ones.forEach(function(eV) {
					r.enum.push(getId(eV).replace(base, ''));
				});
			});
		}
		
		var maps = {};
		maps[c._intersectionOf] = 'allOf'; // ? FIXME TODO
		maps[c._unionOf] = 'anyOf';
		maps[c._complementOf] = 'not';
		maps[c._disjointWith] = 'disjointWith';
		for (var k in maps) {
			if (k in o) {
				if (typeof o[k] === 'object' && c._class in o[k]) {
					// TODO if class has about it is a ref str else a definition
					
					var curTypes = ((o[k][c._class] instanceof Array) ? o[k][c._class] : [o[k][c._class]]).map(owl);
					
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
							var prop = getId(_d).replace(toUrl(base), '');
							if (r.url === domain) {
								r.specific_properties.push(prop);
								r.properties.push(prop);
							} else if (r.supertypes.indexOf(domain) > -1) {
								r.properties.push(prop);
							};
						});
					}
				});
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
			spec.specific_properties.forEach(function (key) {
				if (key === 'array' || key === 'possibleRef' || key === 'possibleRefArray') {
					throw new Error('Not allowed key: ' + key);
				}
				var propSpec = (key in allData.properties) ? allData.properties[key] : ((key in allData.datatypes) ? allData.datatypes[key] : null);
				
				if (!propSpec) {
					throw new Error('Not found key: ' + key);
				}
				
				if (ignoreProperties[key] || /\(legacy spelling;/.test(propSpec.description)) {
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
							sOptions.push({$ref: type + options.suffix + '#/definitions/possibleRef'});
						}
					});
					if (sOptions.length == 1) {
						schema.properties[key] = sOptions[0];
					} else {
						schema.properties[key] = {anyOf: sOptions};
					}
				}
				var description = propSpec.description;
				if (typeof propertyMultiplicity[key] !== 'boolean') {
					if (/^An? /.test(description)) {
						propertyMultiplicity[key] = true;
					} else if (/^The /.test(description) || /^is[A-Z]/.test(key)) {
						propertyMultiplicity[key] = false;
					} else {
						propertyMultiplicity[key] = description;
					}
				}
				var subSchema = schema.properties[key];
				var shouldAddLink = (subSchema.format === 'uri');
				if (!schema.properties[key].$ref && !shouldAddLink) {
					var subSchema = schema.properties[key];
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
			});
			
			
			// TODO
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
			//			
		}
		
		return trimSchema(schema);
	}
}








// anyOf, allOf, oneOf, not
	
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
// class
// owl:disjointWith			oneOf ????????
// "Each owl:disjointWith statement asserts that the class extensions of the two class descriptions involved have no individuals in common."
/*
<owl:Class rdf:about="#Man">
  <owl:disjointWith rdf:resource="#Woman"/>
</owl:Class>
*/

// owl:unionOf 				anyOf
/* CE = "class extension"
An owl:unionOf statement describes an anonymous class for which the CE contains those individuals that occur in at least one of the CE of the class descriptions in the list.
<owl:Class rdf:ID="LivingBeing">
  <owl:unionOf rdf:parseType="Collection">
	<owl:Class rdf:about="#Plant"/>
	<owl:Class rdf:about="#Animal"/>
  </owl:unionOf>
</owl:Class>
This class axiom states that the class extension of LivingBeing exactly corresponds to the union of the class extensions of Plant and Animal.
*/

// owl:intersectionOf		allOf
/*
An owl:intersectionOf statement describes a cl. for which the CE contains precisely those individuals that are members of the CE of ALL class descriptions in the list.
An example:
<owl:Class>
  <owl:intersectionOf rdf:parseType="Collection">
	<owl:Class>
	  <owl:oneOf rdf:parseType="Collection">
		<owl:Thing rdf:about="#Tosca" />
		<owl:Thing rdf:about="#Salome" />
	  </owl:oneOf>
	</owl:Class>
	<owl:Class>
	  <owl:oneOf rdf:parseType="Collection">
		<owl:Thing rdf:about="#Turandot" />
		<owl:Thing rdf:about="#Tosca" />
	  </owl:oneOf>
	</owl:Class>
  </owl:intersectionOf>
</owl:Class>
In this example the value of owl:intersectionOf is a list of two class descriptions, namely two enumerations, both describing a class with two individuals. The resulting intersection is a class with one individual, namely Tosca. as this is the only individual that is common to both enumerations.
*/

// owl:complementOf 		not
/*
<owl:Class>
  <owl:complementOf>
	<owl:Class rdf:about="#Meat"/>
  </owl:complementOf>
</owl:Class>
*/


// and 3.1.2.1 Value constraints
// owl:minCardinality 		minProperties
/*
<owl:Restriction>
	<owl:onProperty rdf:resource="#hasParent" />
	<owl:minCardinality rdf:datatype="&xsd;nonNegativeInteger">2</owl:minCardinality>
</owl:Restriction>
*/
// owl:maxCardinality 		maxProperties




// and 3.2.3 Axioms for complete classes without using owl:equivalentClass

// owl:inverseOf 			?
/*
<owl:ObjectProperty rdf:ID="hasChild">
	<owl:inverseOf rdf:resource="#hasParent"/>
</owl:ObjectProperty>
*/
// owl:sameAs 				?

// owl:FunctionalProperty 
// 






/*"types": { 
    "APIReference":{  
        "ancestors":[  
            "Thing",
            "CreativeWork",
            "Article",
            "TechArticle"
        ],
        "comment":"Reference documentation for application programming interfaces (APIs).",
        "comment_plain":"Reference documentation for application programming interfaces (APIs).",
        "id":"APIReference",
        "label":"API Reference",
        "properties":[  
            "additionalType",
            "alternateName",
            "description",
            "image",
            "name",
            "sameAs",
            ...
        ],
        "specific_properties":[  
            "assembly",
            "assemblyVersion",
            "programmingModel",
            "targetPlatform"
        ],
        "subtypes":[],
        "supertypes":[  
            "TechArticle"
        ],
        "url":"http://schema.org/APIReference"
    },
"properties": { // owl:equivalentProperty??? + domains + ranges
    "about": {
      "comment": "The subject matter of the content.", 
      "comment_plain": "The subject matter of the content.", 
      "domains": [
        "CommunicateAction", 
        "CreativeWork"
      ], 
      "id": "about", 
      "label": "About", 
      "ranges": [
        "Thing"
      ]
    }, 
*/



// JSON schema TODO - prolog:

/**
 * convert_xsd_restriction/3
 * convert_xsd_restriction(XSD_Constraint,Value,json(JSON_List))
 *
 * Translate the `XSD_Constraint` with its `Value` to the 
 *   equivalent JSON constraints specified in `json(JSON_List)`. 
 *   Additional type conversions (string to number) might be 
 *   done.
 
% minExclusive
convert_xsd_restriction(minExclusive,Value,json(JSON_List)) :-
  to_number(Value,Number),
  JSON_List = [minimum=Number,exclusiveMinimum= @(true)].

% maxExclusive
convert_xsd_restriction(maxExclusive,Value,json(JSON_List)) :-
  to_number(Value,Number),
  JSON_List = [maximum=Number,exclusiveMaximum= @(true)].

% minInclusive
convert_xsd_restriction(minInclusive,Value,json(JSON_List)) :-
  to_number(Value,Number),
  JSON_List = [minimum=Number,exclusiveMinimum= @false].

% maxInclusive
convert_xsd_restriction(maxInclusive,Value,json(JSON_List)) :-
  to_number(Value,Number),
  JSON_List = [maximum=Number,exclusiveMaximum= @false].

% minLength
convert_xsd_restriction(minLength,Value,json(JSON_List)) :-
  to_number(Value,Number),
  integer(Number),  %% MUST be an integer, http://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.2.2
  JSON_List = [minLength=Number].

% maxLength
convert_xsd_restriction(maxLength,Value,json(JSON_List)) :-
  to_number(Value,Number),
  integer(Number),  %% MUST be an integer, http://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.2.1
  JSON_List = [maxLength=Number].

% length
convert_xsd_restriction(length,Value,json(JSON_List)) :-
  to_number(Value,Number),
  integer(Number),  %% MUST be an integer, http://tools.ietf.org/html/draft-fge-json-schema-validation-00#section-5.2.1
  JSON_List = [minLength=Number,maxLength=Number].

% pattern
convert_xsd_restriction(pattern,Value,json(JSON_List)) :-
  JSON_List = [pattern=Value].
*/
